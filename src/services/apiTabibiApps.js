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
    return data;
  }

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
