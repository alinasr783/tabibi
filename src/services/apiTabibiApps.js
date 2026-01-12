import supabase from "./supabase";

export async function getApps() {
  const { data, error } = await supabase
    .from("tabibi_apps")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error) throw error;
  return data;
}

export async function incrementAppViews(appId) {
  // Try to use the RPC function first (atomic increment)
  const { error } = await supabase.rpc('increment_app_views', { app_uuid: appId });

  if (error) {
    // Fallback: Client-side increment if RPC fails (e.g. function missing)
    console.warn("RPC increment_app_views failed, trying client-side update:", error);
    
    const { data: app, error: fetchError } = await supabase
      .from("tabibi_apps")
      .select("views_count")
      .eq("id", appId)
      .single();
      
    if (fetchError) return; // Silent fail on view count
    
    await supabase
      .from("tabibi_apps")
      .update({ views_count: (app.views_count || 0) + 1 })
      .eq("id", appId);
  }
}

export async function getAppById(id) {
  const { data, error } = await supabase
    .from("tabibi_apps")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getInstalledApps(clinicId) {
  const { data, error } = await supabase
    .from("app_subscriptions")
    .select(`
      *,
      app:tabibi_apps(*)
    `)
    .eq("clinic_id", clinicId)
    .eq("status", "active");

  if (error) throw error;
  
  return data.map(item => ({
    ...item.app,
    subscriptionId: item.id,
    installedAt: item.created_at,
    expiresAt: item.current_period_end,
    status: item.status
  }));
}

async function collectClinicData(clinicId) {
  // Get User (Doctor) Data
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("name, phone, specialty, bio, education, certificates, avatar_url, banner_url")
    .eq("user_id", user.id)
    .single();

  if (userError) throw userError;

  // Get Clinic Data
  const { data: clinicData, error: clinicError } = await supabase
    .from("clinics")
    .select("name, address, booking_price, available_time")
    .eq("clinic_uuid", clinicId)
    .single();
    
  if (clinicError) throw clinicError;

  // Format data to match schema
  return {
    doctor_name: userData.name,
    phone_number: userData.phone,
    specialty: userData.specialty,
    bio: userData.bio,
    education: userData.education || [],
    documents: userData.certificates || [],
    profile_image: userData.avatar_url,
    banner_image: userData.banner_url,
    
    clinic_name: clinicData.name,
    address: clinicData.address,
    consultation_fee: clinicData.booking_price,
    working_hours: clinicData.available_time
  };
}

async function submitAppData(appId, clinicId, data) {
  // Check if submission exists
  const { data: existing } = await supabase
    .from("app_data_submissions")
    .select("id")
    .eq("app_id", appId)
    .eq("clinic_id", clinicId) // clinic_id in submissions is usually uuid if referenced properly
    .maybeSingle();

  if (existing) {
    // Update
    const { error } = await supabase
      .from("app_data_submissions")
      .update({ 
        data: JSON.stringify(data),
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
      
    if (error) console.error("Error updating app data submission:", error);
  } else {
    // Insert
    const { error } = await supabase
      .from("app_data_submissions")
      .insert([{
        app_id: appId,
        clinic_id: clinicId,
        data: JSON.stringify(data),
        submission_type: 'new_order',
        status: 'completed'
      }]);
      
    if (error) console.error("Error inserting app data submission:", error);
  }
}

export async function installApp(clinicId, appId) {
  // Check if subscription exists (active or cancelled)
  const { data: existing } = await supabase
    .from("app_subscriptions")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("app_id", appId)
    .maybeSingle();

  // Get App details for price
  const { data: app } = await supabase
    .from("tabibi_apps")
    .select("price, billing_period")
    .eq("id", appId)
    .single();

  const periodEnd = new Date();
  if (app.billing_period === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else if (app.billing_period === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  let resultData;

  if (existing) {
    // Reactivate
    const { data, error } = await supabase
      .from("app_subscriptions")
      .update({ 
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount: app.price,
        billing_period: app.billing_period
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    resultData = data;
  } else {
    // New Subscription
    const { data, error } = await supabase
      .from("app_subscriptions")
      .insert([{ 
        clinic_id: clinicId, 
        app_id: appId,
        amount: app.price,
        billing_period: app.billing_period,
        current_period_end: periodEnd.toISOString(),
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    resultData = data;
  }

  // Auto-submit app data on installation/activation
  try {
    console.log("Auto-submitting app data for app:", appId);
    const appData = await collectClinicData(clinicId);
    await submitAppData(appId, clinicId, appData);
    console.log("App data submitted successfully");
  } catch (e) {
    console.error("Failed to auto-submit app data:", e);
    // Continue without failing the installation
  }

  return resultData;
}

export async function uninstallApp(clinicId, appId) {
  // Cancel subscription (don't delete)
  const { error } = await supabase
    .from("app_subscriptions")
    .update({ status: 'cancelled' })
    .eq("clinic_id", clinicId)
    .eq("app_id", appId);

  if (error) throw error;
}
