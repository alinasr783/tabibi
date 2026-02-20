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
  const {
    tabibi_app_reviews,
    tabibi_app_installations,
    tabibi_app_audit_logs,
    tabibi_app_event_subscriptions,
    reviews,
    installations,
    audit_logs,
    event_subscriptions,
  } = payload || {};

  const cleanPayload = payload || {};
  const body = {
    developer_id: dev.id,
    title: cleanPayload.title,
    slug: cleanPayload.slug,
    short_description: cleanPayload.short_description || null,
    full_description: cleanPayload.full_description || null,
    icon_url: cleanPayload.icon_url || null,
    cover_image_url: cleanPayload.cover_image_url || null,
    category: cleanPayload.category || null,
    tags: cleanPayload.tags || [cleanPayload.category].filter(Boolean),
    is_paid: !!cleanPayload.is_paid,
    price_monthly: Number(cleanPayload.price_monthly) || 0,
    price_yearly: Number(cleanPayload.price_yearly) || 0,
    has_free_trial: !!cleanPayload.has_free_trial,
    trial_days: Number(cleanPayload.trial_days) || 0,
    is_featured: !!cleanPayload.is_featured,
  };
  const { data, error } = await supabase
    .from("tabibi_marketplace_apps")
    .insert([body])
    .select()
    .single();
  if (error) throw error;

  const eventSubs = tabibi_app_event_subscriptions || event_subscriptions;
  if (Array.isArray(eventSubs) && eventSubs.length > 0) {
    const rows = eventSubs
      .filter(Boolean)
      .map((row) => ({
        app_id: data.id,
        event_type: row.event_type,
        handler_function_name: row.handler_function_name || null,
        is_active: row.is_active !== false,
      }))
      .filter((row) => row.event_type);

    if (rows.length > 0) {
      const { error: evError } = await supabase
        .from("tabibi_app_event_subscriptions")
        .insert(rows);
      if (evError) throw evError;
    }
  }

  const revs = tabibi_app_reviews || reviews;
  if (Array.isArray(revs) && revs.length > 0) {
    const rows = revs
      .filter(Boolean)
      .map((row) => ({
        app_id: data.id,
        clinic_id: row.clinic_id,
        user_id: row.user_id,
        rating: row.rating,
        comment: row.comment || null,
        is_verified_purchase: row.is_verified_purchase !== false,
      }))
      .filter((row) => row.clinic_id && row.user_id && row.rating);

    if (rows.length > 0) {
      const { error: rError } = await supabase.from("tabibi_app_reviews").insert(rows);
      if (rError) throw rError;
    }
  }

  const installs = tabibi_app_installations || installations;
  if (Array.isArray(installs) && installs.length > 0) {
    const rows = installs
      .filter(Boolean)
      .map((row) => ({
        clinic_id: row.clinic_id,
        app_id: data.id,
        installed_version_id: row.installed_version_id || null,
        auto_update: row.auto_update !== false,
        status: row.status || "active",
        trial_ends_at: row.trial_ends_at || null,
        current_period_end: row.current_period_end || null,
        is_frozen: !!row.is_frozen,
        settings: row.settings || {},
      }))
      .filter((row) => row.clinic_id);

    if (rows.length > 0) {
      const { error: iError } = await supabase
        .from("tabibi_app_installations")
        .insert(rows);
      if (iError) throw iError;
    }
  }

  const logs = tabibi_app_audit_logs || audit_logs;
  if (Array.isArray(logs) && logs.length > 0) {
    const rows = logs
      .filter(Boolean)
      .map((row) => ({
        app_id: data.id,
        clinic_id: row.clinic_id,
        action: row.action,
        resource: row.resource || null,
        metadata: row.metadata || null,
        severity: row.severity || "info",
        timestamp: row.timestamp || null,
      }))
      .filter((row) => row.clinic_id && row.action);

    if (rows.length > 0) {
      const { error: lError } = await supabase
        .from("tabibi_app_audit_logs")
        .insert(rows);
      if (lError) throw lError;
    }
  }

  return data;
}

export async function getMarketplaceAppWithRelations(appId) {
  const { data, error } = await supabase
    .from("tabibi_marketplace_apps")
    .select(
      `
      *,
      versions:tabibi_app_versions(*),
      reviews:tabibi_app_reviews(*),
      event_subscriptions:tabibi_app_event_subscriptions(*)
    `
    )
    .eq("id", appId)
    .single();

  if (error) throw error;

  const { count: installsCount, error: installsError } = await supabase
    .from("tabibi_app_installations")
    .select("id", { count: "exact", head: true })
    .eq("app_id", appId);

  if (installsError) throw installsError;

  return { ...data, installs_count: installsCount ?? 0 };
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
