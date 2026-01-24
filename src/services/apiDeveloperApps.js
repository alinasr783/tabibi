import supabase from "./supabase";

export async function getMyDeveloperProfile() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("tabibi_developers")
    .select("*")
    .eq("user_id", uid)
    .single();
  if (error) throw error;
  return data;
}

export async function listMyApps() {
  const dev = await getMyDeveloperProfile();
  const { data, error } = await supabase
    .from("tabibi_marketplace_apps")
    .select("*")
    .eq("developer_id", dev.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMarketplaceApp(payload) {
  const dev = await getMyDeveloperProfile();
  const body = {
    developer_id: dev.id,
    title: payload.title,
    slug: payload.slug,
    short_description: payload.short_description || null,
    full_description: payload.full_description || null,
    icon_url: payload.icon_url || null,
    cover_image_url: payload.cover_image_url || null,
    category: payload.category || null,
    tags: payload.tags || [payload.category].filter(Boolean),
    is_paid: !!payload.is_paid,
    price_monthly: payload.price_monthly || 0,
    has_free_trial: !!payload.has_free_trial,
    trial_days: payload.trial_days || 0,
    features: payload.features || [],
    screenshots: payload.screenshots || [],
    preview_link: payload.preview_link || null
  };
  const { data, error } = await supabase
    .from("tabibi_marketplace_apps")
    .insert([body])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitAppVersion(appId, versionNumber, jsEntryPoint, cssBundle) {
  const { data, error } = await supabase
    .from("tabibi_app_versions")
    .insert([{
      app_id: appId,
      version_number: versionNumber,
      status: "submitted",
      js_entry_point: jsEntryPoint,
      css_bundle: cssBundle || null,
      changelog: "Initial submission",
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
