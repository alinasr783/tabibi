import supabase from "./supabase";
import { getPatientById } from "./apiPatients";

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

    // Idempotent upsert using unique constraint (user_id, provider, integration_type)
    const { data, error } = await supabase
        .from('integrations')
        .upsert({
            user_id: userId,
            provider,
            integration_type: integrationType,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt.toISOString(),
            scope: tokens.scope,
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,provider,integration_type'
        })
        .select()
        .single();
    if (error) {
        console.error('Error upserting integration:', error);
        throw error;
    }
    return data;
}

/**
 * Get active integration for a specific type
 * @param {string} type - 'calendar', 'tasks', or 'contacts'
 */
export async function getIntegration(type) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Check if current session has a fresh provider token (only on initial login usually)
    // But if we have it, we should prioritize it or update our DB with it.
    // However, since we can't easily validate scopes here without decoding, 
    // we stick to DB but allow a force-refresh if needed.

    const { data, error } = await supabase
        .from('integrations')
        .select('id, access_token, refresh_token, expires_at, scope')
        .eq('user_id', session.user.id)
        .eq('integration_type', type)
        .is('is_active', true)
        .limit(1)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') console.error(`Error fetching ${type} integration:`, error);
    
    // Check if token needs refresh (if expired or expiring in < 5 mins)
    if (data && data.expires_at && new Date(data.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
        console.log("Token expiring or expired, attempting refresh...", { expires_at: data.expires_at });
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

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Missing Google OAuth credentials in environment variables. Cannot refresh token.");
        // We return the expired integration, which will likely cause 401.
        // The UI should ideally prompt the user to reconnect.
        return integration;
    }

    try {
        console.log("Refreshing Google OAuth token...");
        // Exchange refresh token for new access token via Google's Token Endpoint
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: integration.refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to refresh token:", response.status, errorText);
            // If refresh fails (e.g. revoked), we might want to mark integration as inactive
            // but for now, we just return the old one.
            return integration;
        }

        const newTokens = await response.json();
        
        // Calculate new expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (newTokens.expires_in || 3600));

        // Update in Database
        const { data: updatedIntegration, error } = await supabase
            .from('integrations')
            .update({
                access_token: newTokens.access_token,
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', integration.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating refreshed token in DB:", error);
            // Even if DB update fails, return the new token for immediate use
            return { ...integration, access_token: newTokens.access_token, expires_at: expiresAt.toISOString() };
        }

        console.log("Token refreshed successfully.");
        return updatedIntegration;

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
export async function addToGoogleCalendar(appointment, existingIntegration = null, customId = null) {
    const integration = existingIntegration || await getIntegration('calendar');
    if (!integration) {
        console.warn('Google Calendar integration not active. Event will not be created.');
        return null;
    }

    // Ensure we have a valid date
    if (!appointment.date) {
        console.error("addToGoogleCalendar: 'date' field is missing in appointment object", appointment);
        return null; // Cannot create event without date
    }

    const startTime = new Date(appointment.date);
    if (isNaN(startTime.getTime())) {
        console.error("addToGoogleCalendar: Invalid date format", appointment.date);
        return null;
    }

    const endTime = new Date(startTime.getTime() + 30 * 60000);
    
    let patientName = appointment.patient_name || null;
    let patientPhone = appointment.patient_phone || null;
    
    // If patient name is missing but we have an ID, fetch it
    if ((!patientName || !patientPhone) && appointment.patient_id) {
        try {
            const patient = await getPatientById(appointment.patient_id);
            if (patient) {
                patientName = patientName || patient.name;
                patientPhone = patientPhone || patient.phone;
            }
        } catch (err) { 
            console.error("Error fetching patient details for calendar event:", err);
            // Fallback will be handled below
        }
    }

    // Final fallback for patient name
    const displayPatientName = patientName || 'مريض';

    console.log("addToGoogleCalendar/dateCheck", { 
        providedDate: appointment.date, 
        parsedDate: startTime,
        fullAppointment: appointment,
        patientName: displayPatientName,
        customId
    });

    const event = {
        summary: `حجز`,
        description: `اسم المريض: ${displayPatientName}\nرقم الموبايل: ${patientPhone || 'غير متوفر'}\nملاحظات: ${appointment.notes || 'لا يوجد'}\nالسعر: ${appointment.price ?? 0}\nالمصدر: ${appointment.from || appointment.source || 'clinic'}`,
        start: {
            dateTime: startTime.toISOString(),
            timeZone: 'Africa/Cairo',
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
        // Add custom ID if provided (must be base32hex: 0-9, a-v)
        ...(customId ? { id: customId } : {}),
    };

    try {
        console.log('Adding event to Google Calendar', { start: event.start, end: event.end, summary: event.summary, id: customId });
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${integration.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });

        if (!response.ok) {
            // Check for 409 Conflict (Already exists)
            if (response.status === 409) {
                 console.log('Google Calendar event already exists (idempotent skip)', { id: customId });
                 return { id: customId, status: 'already_exists' };
            }

            const text = await response.text();
            console.error('Google Calendar API error', { status: response.status, body: text });

            if (response.status === 401) {
                console.error("Google Calendar Auth Error: Token expired or invalid. Please reconnect Google Calendar in Settings.");
                // We could emit an event here or use a global store to notify UI
            }

            throw new Error(`Google Calendar API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Google Calendar event created', { id: data.id });
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
            patient_id
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
        console.log('Syncing appointment to calendar', { id: appointment.id, date: appointment.date });
        const result = await addToGoogleCalendar({
            ...appointment,
            patient_name: "مريض"
        }, integration);
        
        if (result) successCount++;
        else failCount++;
    }

    console.log('Sync summary', { successCount, failCount });
    return { success: true, count: successCount, failed: failCount };
}
