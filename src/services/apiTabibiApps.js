import supabase from "./supabase";

export async function getApps() {
  // Use tabibi_apps table
  const { data, error } = await supabase
    .from("tabibi_apps")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error) throw error;
  
  // Shape data to match UI expectations
  return (data || []).map((app) => ({
    id: app.id,
    title: app.title,
    short_description: app.short_description,
    full_description: app.full_description,
    category: app.category,
    image_url: app.image_url, // tabibi_apps uses image_url
    color: app.color || "bg-primary/10",
    price: app.price ?? 0,
    billing_period: app.billing_period || "monthly",
    features: app.features || [],
    screenshots: app.screenshots || [],
    icon_name: app.icon_name || null, // Check if this exists in tabibi_apps, if not it will be undefined/null which is fine
    preview_link: app.preview_link || null,
  }));
}

export async function incrementAppViews(appId) {
  // Try to use the RPC function first (atomic increment)
  const { error } = await supabase.rpc('increment_app_views', { app_uuid: parseInt(appId) });

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
  // Use tabibi_apps table
  const { data: app, error } = await supabase
    .from("tabibi_apps")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return {
    id: app.id,
    title: app.title,
    short_description: app.short_description,
    full_description: app.full_description,
    category: app.category,
    image_url: app.image_url,
    color: app.color || "bg-primary/10",
    price: app.price ?? 0,
    billing_period: app.billing_period || "monthly",
    features: app.features || [],
    screenshots: app.screenshots || [],
    icon_name: app.icon_name || null,
    preview_link: app.preview_link || null,
    latest_version: null, // Legacy doesn't support versions
  };
}

export async function getInstalledApps(clinicId) {
  // Use app_subscriptions table joined with tabibi_apps
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
    id: item.app?.id,
    title: item.app?.title,
    short_description: item.app?.short_description,
    full_description: item.app?.full_description,
    category: item.app?.category,
    image_url: item.app?.image_url,
    color: item.app?.color || "bg-primary/10",
    price: item.app?.price ?? 0,
    billing_period: item.app?.billing_period || "monthly",
    features: item.app?.features || [],
    screenshots: item.app?.screenshots || [],
    icon_name: item.app?.icon_name || null,
    preview_link: item.app?.preview_link || null,
    component_key: item.app?.component_key,
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

  // Transform working hours from English/Clinic format to Arabic/App format
  const dayMapping = {
    saturday: "السبت",
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة"
  };

  const workingHours = {};
  if (clinicData.available_time) {
    Object.entries(clinicData.available_time).forEach(([engDay, schedule]) => {
      const arDay = dayMapping[engDay.toLowerCase()];
      if (arDay) {
        workingHours[arDay] = {
          from: schedule.start,
          to: schedule.end,
          active: !schedule.off
        };
      }
    });
  }

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
    working_hours: workingHours
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

  // Get App details for price/monthly model
  const { data: app } = await supabase
    .from("tabibi_apps")
    .select("price, billing_period")
    .eq("id", appId)
    .single();

  const periodEnd = new Date();
  // Default renewal logic based on billing period
  if (app?.billing_period === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  let resultData;

  if (existing) {
    // Reactivate
    const { data, error } = await supabase
      .from("app_subscriptions")
      .update({ 
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString()
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
        current_period_end: periodEnd.toISOString(),
        status: 'active',
        billing_period: app?.billing_period || 'monthly',
        amount: app?.price || 0,
        auto_renew: true
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

export async function subscribeWithWallet(clinicId, appId) {
  const { data, error } = await supabase.rpc('subscribe_app_with_wallet', {
    p_clinic_id: clinicId,
    p_app_id: appId
  });

  if (error) throw error;
  
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

  return data;
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
