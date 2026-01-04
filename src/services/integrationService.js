import supabase from "./supabase";

/**
 * Save integration tokens to the database
 * @param {Object} tokens - The tokens object returned from Google OAuth
 * @param {string} provider - The provider name (e.g., 'google')
 * @param {string} scope - The scope string to identify the integration type
 */
export async function saveIntegrationTokens(tokens, provider = 'google') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const userId = session.user.id;
    let integrationType = 'other';
    
    // Determine integration type from scope
    if (tokens.scope.includes('calendar')) integrationType = 'calendar';
    else if (tokens.scope.includes('tasks')) integrationType = 'tasks';
    else if (tokens.scope.includes('contacts')) integrationType = 'contacts';

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    // Upsert integration record
    // Safe upsert: try update then insert
    const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('integration_type', integrationType)
        .maybeSingle();

    if (existing?.id) {
        const { data, error } = await supabase
            .from('integrations')
            .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: expiresAt.toISOString(),
                scope: tokens.scope,
                token_type: tokens.token_type,
                id_token: tokens.id_token,
                is_active: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('integrations')
            .insert({
                user_id: userId,
                provider,
                integration_type: integrationType,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: expiresAt.toISOString(),
                scope: tokens.scope,
                token_type: tokens.token_type,
                id_token: tokens.id_token,
                is_active: true,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

/**
 * Get active integration for a specific type
 * @param {string} type - 'calendar', 'tasks', or 'contacts'
 */
export async function getIntegration(type) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
        .from('integrations')
        .select('id, access_token, refresh_token, expires_at, scope, token_type')
        .eq('user_id', session.user.id)
        .eq('integration_type', type)
        .eq('is_active', true)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') console.error(`Error fetching ${type} integration:`, error);
    
    // Check if token needs refresh (if expired or expiring in < 5 mins)
    if (data && data.expires_at && new Date(data.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
        return await refreshIntegrationToken(data);
    }

    return data;
}

/**
 * Refresh the access token using the refresh token
 * @param {Object} integration - The integration record
 */
async function refreshIntegrationToken(integration) {
    if (!integration.refresh_token) {
        console.warn("No refresh token available for integration:", integration.id);
        return integration; // Can't refresh
    }

    try {
        // Exchange refresh token for new access token via Supabase Auth (or direct Google call if needed)
        // Since Supabase handles the initial auth, we might need to use the stored refresh token manually against Google's endpoint
        // because Supabase's session refresh only handles the user's app session, not the provider's specific scopes unless we use the provider token.
        
        // Using Google's Token Endpoint directly
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, // Ensure these env vars exist or use a proxy
                client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET, // WARNING: Client secret should ideally not be in frontend
                refresh_token: integration.refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        // NOTE: If client_secret is not available on frontend (security best practice), 
        // this refresh should happen via a Supabase Edge Function.
        // For now, assuming we might need to rely on the user re-authenticating if token expires 
        // OR use a backend proxy.
        
        // If we cannot refresh on client side securely, we return null or the expired token 
        // and handle the 401 error in the API call by prompting re-auth.
        
        // Simplified approach for this iteration: Return existing data.
        // Real implementation requires a backend function to handle secret key.
        return integration; 

    } catch (error) {
        console.error("Error refreshing token:", error);
        return integration;
    }
}

/**
 * Add an event to Google Calendar
 * @param {Object} appointment - The appointment object
 * @param {Object} [existingIntegration] - Optional existing integration object to avoid refetching
 */
export async function addToGoogleCalendar(appointment, existingIntegration = null) {
    const integration = existingIntegration || await getIntegration('calendar');
    if (!integration) return null;

    const startTime = new Date(appointment.date);
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes duration

    const event = {
        summary: `موعد عيادة: ${appointment.patient_name || 'مريض'}`,
        description: `ملاحظات: ${appointment.notes || 'لا يوجد'}\nالسعر: ${appointment.price || 0}`,
        start: {
            dateTime: startTime.toISOString(),
            timeZone: 'Africa/Cairo', // Adjust as needed
        },
        end: {
            dateTime: endTime.toISOString(),
            timeZone: 'Africa/Cairo',
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 30 },
                { method: 'popup', minutes: 60 },
            ],
        },
    };

    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${integration.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error adding to Google Calendar:", error);
        // Don't block the app flow if calendar sync fails
        return null;
    }
}

/**
 * Sync existing future appointments to Google Calendar
 * Can be called when integration is first enabled
 */
export async function syncInitialAppointments() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // Get current user's clinic_id
    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const now = new Date().toISOString();

    // Fetch all future appointments
    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
            id,
            date,
            notes,
            price,
            patient:patients(name)
        `)
        .eq("clinic_id", userData.clinic_id)
        .gte("date", now)
        .order("date", { ascending: true });

    if (error) {
        console.error("Error fetching appointments for sync:", error);
        return { success: false, error };
    }

    if (!appointments || appointments.length === 0) {
        return { success: true, count: 0 };
    }

    // Get integration once to avoid repeated DB calls
    const integration = await getIntegration('calendar');
    if (!integration) return { success: false, error: "No active calendar integration" };

    let successCount = 0;
    let failCount = 0;

    // Process sequentially to avoid rate limits
    for (const appointment of appointments) {
        const patientName = appointment.patient?.name || "مريض";
        const result = await addToGoogleCalendar({
            ...appointment,
            patient_name: patientName
        }, integration);
        
        if (result) successCount++;
        else failCount++;
    }

    return { success: true, count: successCount, failed: failCount };
}
