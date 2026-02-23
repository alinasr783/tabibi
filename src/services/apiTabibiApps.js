import supabase from "./supabase";

function isSchemaMismatchError(error) {
  const msg = String(error?.message || "").toLowerCase();
  return (
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("could not find"))
  );
}

function mapMarketplaceAppToUi(appRow) {
  const isPaid = !!appRow?.is_paid;
  const hasTrial = !!appRow?.has_free_trial && Number(appRow?.trial_days || 0) > 0;
  const pricingType = hasTrial ? "trial_then_paid" : isPaid ? "paid" : "free";
  const priceMonthly = Number(appRow?.price_monthly || 0);
  const trialDays = Number(appRow?.trial_days || 7);

  return {
    id: appRow.id,
    title: appRow.title,
    short_description: appRow.short_description,
    full_description: appRow.full_description,
    category: appRow.category,
    image_url: appRow.icon_url || appRow.cover_image_url || null,
    color: "bg-primary/10",
    price: priceMonthly,
    billing_period: "monthly",
    pricing_type: pricingType,
    payment_type: "recurring",
    billing_interval_unit: "month",
    billing_interval_count: 1,
    trial_interval_unit: hasTrial ? "day" : null,
    trial_interval_count: hasTrial ? trialDays : null,
    currency: "EGP",
    features: [],
    screenshots: [],
    icon_name: null,
    preview_link: null,
    component_key: appRow.slug,
    integration_type: "none",
    integration_target: null,
    latest_version: null,
  };
}

function mapTabibiAppToUi(appRow) {
  return {
    id: appRow.id,
    title: appRow.title,
    short_description: appRow.short_description,
    full_description: appRow.full_description,
    category: appRow.category,
    image_url: appRow.image_url,
    color: appRow.color || "bg-primary/10",
    price: appRow.price ?? 0,
    billing_period: appRow.billing_period || "monthly",
    pricing_type: appRow.pricing_type ?? null,
    payment_type: appRow.payment_type ?? null,
    billing_interval_unit: appRow.billing_interval_unit ?? null,
    billing_interval_count: appRow.billing_interval_count ?? null,
    trial_interval_unit: appRow.trial_interval_unit ?? null,
    trial_interval_count: appRow.trial_interval_count ?? null,
    currency: appRow.currency ?? null,
    features: appRow.features || [],
    screenshots: appRow.screenshots || [],
    icon_name: appRow.icon_name || null,
    preview_link: appRow.preview_link || null,
    component_key: appRow.component_key ?? null,
    integration_type: appRow.integration_type || "none",
    integration_target: appRow.integration_target || null,
    latest_version: null,
  };
}

async function getAppsLegacy() {
  const { data, error } = await supabase
    .from("tabibi_apps")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error) throw error;

  return (data || []).map(mapTabibiAppToUi);
}

async function getAppsV2() {
  const { data, error } = await supabase
    .from("tabibi_marketplace_apps")
    .select(
      "id, title, slug, short_description, full_description, icon_url, cover_image_url, category, is_paid, price_monthly, price_yearly, has_free_trial, trial_days, kill_switch_active"
    )
    .eq("kill_switch_active", false)
    .order("id");

  if (error) throw error;
  return (data || []).map(mapMarketplaceAppToUi);
}

export async function getApps() {
  try {
    return await getAppsLegacy();
  } catch (e) {
    if (!isSchemaMismatchError(e)) throw e;
    return await getAppsV2();
  }
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
  const appId = Number(id);

  try {
    const { data: app, error } = await supabase
      .from("tabibi_apps")
      .select("*")
      .eq("id", appId)
      .single();

    if (error) throw error;
    return mapTabibiAppToUi(app);
  } catch (e) {
    if (!isSchemaMismatchError(e)) throw e;
  }

  const { data: app, error } = await supabase
    .from("tabibi_marketplace_apps")
    .select(
      "id, title, slug, short_description, full_description, icon_url, cover_image_url, category, is_paid, price_monthly, price_yearly, has_free_trial, trial_days, kill_switch_active"
    )
    .eq("id", appId)
    .single();

  if (error) throw error;

  const mapped = mapMarketplaceAppToUi(app);

  const { data: latest, error: latestError } = await supabase
    .from("tabibi_app_versions")
    .select("version_number")
    .eq("app_id", appId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError && !isSchemaMismatchError(latestError)) throw latestError;

  return { ...mapped, latest_version: latest?.version_number ?? null };
}

export async function getInstalledApps(clinicId) {
  try {
    const { data, error } = await supabase
      .from("app_subscriptions")
      .select(
        `
        *,
        app:tabibi_apps(*)
      `
      )
      .eq("clinic_id", clinicId)
      .eq("status", "active");

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.app?.id,
      title: item.app?.title,
      short_description: item.app?.short_description,
      full_description: item.app?.full_description,
      category: item.app?.category,
      image_url: item.app?.image_url,
      color: item.app?.color || "bg-primary/10",
      price: item.app?.price ?? 0,
      billing_period: item.app?.billing_period || "monthly",
      pricing_type: item.app?.pricing_type ?? null,
      payment_type: item.app?.payment_type ?? null,
      billing_interval_unit: item.app?.billing_interval_unit ?? null,
      billing_interval_count: item.app?.billing_interval_count ?? null,
      trial_interval_unit: item.app?.trial_interval_unit ?? null,
      trial_interval_count: item.app?.trial_interval_count ?? null,
      currency: item.app?.currency ?? null,
      features: item.app?.features || [],
      screenshots: item.app?.screenshots || [],
      icon_name: item.app?.icon_name || null,
      preview_link: item.app?.preview_link || null,
      component_key: item.app?.component_key,
      integration_type: item.app?.integration_type || "none",
      integration_target: item.app?.integration_target || null,
      isIntegrated: item.is_integrated,
      subscriptionId: item.id,
      installedAt: item.created_at,
      expiresAt: item.current_period_end,
      status: item.status,
    }));
  } catch (e) {
    if (!isSchemaMismatchError(e)) throw e;
  }

  const { data, error } = await supabase
    .from("tabibi_app_installations")
    .select(
      `
        id,
        clinic_id,
        app_id,
        installed_version_id,
        status,
        trial_ends_at,
        current_period_end,
        settings,
        created_at,
        updated_at,
        app:tabibi_marketplace_apps(
          id, title, slug, short_description, full_description, icon_url, cover_image_url, category, is_paid, price_monthly, price_yearly, has_free_trial, trial_days, kill_switch_active
        ),
        version:tabibi_app_versions(id, version_number)
    `
    )
    .eq("clinic_id", clinicId)
    .in("status", ["active", "trialing", "past_due"]);

  if (error) throw error;

  return (data || [])
    .filter((row) => row?.app && row.app.kill_switch_active !== true)
    .map((row) => {
      const app = mapMarketplaceAppToUi(row.app);
      return {
        ...app,
        component_key: row.app.slug,
        isIntegrated: false,
        subscriptionId: row.id,
        installedAt: row.created_at,
        expiresAt: row.current_period_end,
        status: row.status,
        latest_version: row?.version?.version_number ?? null,
      };
    });
}

async function installAppV2(clinicId, appId) {
  const numericAppId = Number(appId);

  const { data: appRow, error: appError } = await supabase
    .from("tabibi_marketplace_apps")
    .select("id, is_paid, price_monthly, has_free_trial, trial_days, kill_switch_active")
    .eq("id", numericAppId)
    .single();

  if (appError) throw appError;
  if (appRow.kill_switch_active === true) throw new Error("app_disabled");

  const { data: version, error: versionError } = await supabase
    .from("tabibi_app_versions")
    .select("id")
    .eq("app_id", numericAppId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError) throw versionError;

  const { data: existing, error: existingError } = await supabase
    .from("tabibi_app_installations")
    .select("id, trial_ends_at")
    .eq("clinic_id", clinicId)
    .eq("app_id", numericAppId)
    .maybeSingle();

  if (existingError) throw existingError;

  const hasTrial = !!appRow.has_free_trial && Number(appRow.trial_days || 0) > 0;
  const now = new Date();
  const isFirstTrial = hasTrial && (!existing || !existing.trial_ends_at);

  const trialEndsAt = isFirstTrial
    ? new Date(now.getTime() + Number(appRow.trial_days || 7) * 24 * 60 * 60 * 1000)
    : null;

  const isPaid = !!appRow.is_paid && Number(appRow.price_monthly || 0) > 0;
  const currentPeriodEnd = isPaid && !isFirstTrial
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : isPaid && isFirstTrial
      ? trialEndsAt
      : null;

  const payload = {
    clinic_id: clinicId,
    app_id: numericAppId,
    installed_version_id: version?.id || null,
    auto_update: true,
    status: isFirstTrial ? "trialing" : "active",
    trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : existing?.trial_ends_at || null,
    current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
    is_frozen: false,
    settings: {},
    updated_at: now.toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("tabibi_app_installations")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("tabibi_app_installations")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function uninstallAppV2(clinicId, appId) {
  const numericAppId = Number(appId);
  const { error } = await supabase
    .from("tabibi_app_installations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("clinic_id", clinicId)
    .eq("app_id", numericAppId);
  if (error) throw error;
}

function resolvePricingType(appRow) {
  if (appRow?.pricing_type) return appRow.pricing_type;
  return (Number(appRow?.price) || 0) > 0 ? "paid" : "free";
}

function resolvePaymentType(appRow) {
  if (appRow?.payment_type) return appRow.payment_type;
  return appRow?.billing_period === "one_time" ? "one_time" : "recurring";
}

function addInterval(date, unit, count) {
  const d = new Date(date);
  const n = Math.max(1, Number(count) || 1);
  if (unit === "day") d.setDate(d.getDate() + n);
  else if (unit === "week") d.setDate(d.getDate() + n * 7);
  else if (unit === "year") d.setFullYear(d.getFullYear() + n);
  else d.setMonth(d.getMonth() + n);
  return d;
}

function legacyBillingPeriodFromInterval(paymentType, unit, count) {
  if (paymentType === "one_time") return "one_time";
  const n = Math.max(1, Number(count) || 1);
  if (n === 1 && unit === "month") return "monthly";
  if (n === 1 && unit === "year") return "yearly";
  return "custom";
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
  try {
    const { data: existing } = await supabase
      .from("app_subscriptions")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("app_id", appId)
      .maybeSingle();

    const { data: app } = await supabase
      .from("tabibi_apps")
      .select("price, billing_period, pricing_type, payment_type, billing_interval_unit, billing_interval_count, trial_interval_unit, trial_interval_count, currency")
      .eq("id", appId)
      .single();

    const pricingType = resolvePricingType(app);
    const paymentType = resolvePaymentType(app);
    const unit = app?.billing_interval_unit || (app?.billing_period === "yearly" ? "year" : "month");
    const count = app?.billing_interval_count ?? 1;
    const trialUnit = app?.trial_interval_unit || "day";
    const trialCount = app?.trial_interval_count ?? 7;
    const now = new Date();

    const isFirstTrial =
      pricingType === "trial_then_paid" && (!existing || existing.trial_end == null);

    const chargeNow = pricingType === "paid" ? (app?.price || 0) : isFirstTrial ? 0 : (pricingType === "trial_then_paid" ? (app?.price || 0) : 0);

    const periodEnd =
      paymentType === "one_time"
        ? null
        : isFirstTrial
          ? addInterval(now, trialUnit, trialCount)
          : addInterval(now, unit, count);

    const legacyBillingPeriod = legacyBillingPeriodFromInterval(paymentType, unit, count);
    const trialEnd = isFirstTrial && paymentType !== "one_time" ? periodEnd : null;

    let resultData;

    if (existing) {
      const baseUpdate = { 
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd ? periodEnd.toISOString() : null,
        billing_period: legacyBillingPeriod,
        amount: chargeNow,
        updated_at: now.toISOString(),
        pricing_type: pricingType,
        payment_type: paymentType,
        interval_unit: unit,
        interval_count: Number(count) || 1,
        trial_interval_unit: pricingType === "trial_then_paid" ? trialUnit : null,
        trial_interval_count: pricingType === "trial_then_paid" ? Number(trialCount) || 7 : null,
        trial_end: trialEnd ? trialEnd.toISOString() : null,
        currency: app?.currency || "EGP",
      };

      let data;
      let error;
      ({ data, error } = await supabase
        .from("app_subscriptions")
        .update(baseUpdate)
        .eq("id", existing.id)
        .select()
        .single());

      if (error && String(error.message || "").toLowerCase().includes("column")) {
        const { pricing_type: _pricing_type, payment_type: _payment_type, interval_unit: _interval_unit, interval_count: _interval_count, trial_interval_unit: _trial_interval_unit, trial_interval_count: _trial_interval_count, trial_end: _trial_end, currency: _currency, ...fallback } = baseUpdate;
        ({ data, error } = await supabase
          .from("app_subscriptions")
          .update(fallback)
          .eq("id", existing.id)
          .select()
          .single());
      }
      if (error) throw error;
      resultData = data;
    } else {
      const baseInsert = { 
        clinic_id: clinicId, 
        app_id: appId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd ? periodEnd.toISOString() : null,
        status: 'active',
        billing_period: legacyBillingPeriod,
        amount: chargeNow,
        auto_renew: paymentType !== "one_time",
        pricing_type: pricingType,
        payment_type: paymentType,
        interval_unit: unit,
        interval_count: Number(count) || 1,
        trial_interval_unit: pricingType === "trial_then_paid" ? trialUnit : null,
        trial_interval_count: pricingType === "trial_then_paid" ? Number(trialCount) || 7 : null,
        trial_end: trialEnd ? trialEnd.toISOString() : null,
        currency: app?.currency || "EGP",
      };

      let data;
      let error;
      ({ data, error } = await supabase
        .from("app_subscriptions")
        .insert([baseInsert])
        .select()
        .single());

      if (error && String(error.message || "").toLowerCase().includes("column")) {
        const { pricing_type: _pricing_type, payment_type: _payment_type, interval_unit: _interval_unit, interval_count: _interval_count, trial_interval_unit: _trial_interval_unit, trial_interval_count: _trial_interval_count, trial_end: _trial_end, currency: _currency, ...fallback } = baseInsert;
        ({ data, error } = await supabase
          .from("app_subscriptions")
          .insert([fallback])
          .select()
          .single());
      }

      if (error) throw error;
      resultData = data;
    }

    try {
      console.log("Auto-submitting app data for app:", appId);
      const appData = await collectClinicData(clinicId);
      await submitAppData(appId, clinicId, appData);
      console.log("App data submitted successfully");
    } catch (e) {
      console.error("Failed to auto-submit app data:", e);
    }

    return resultData;
  } catch (e) {
    if (!isSchemaMismatchError(e)) {
      const msg = String(e?.message || "").toLowerCase();
      const isRls = msg.includes("row-level security") || msg.includes("permission denied");
      if (isRls) throw e;
    }
    if (!isSchemaMismatchError(e)) throw e;
  }

  return await installAppV2(clinicId, appId);
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
  try {
    // Cancel subscription (don't delete)
    const { error } = await supabase
      .from("app_subscriptions")
      .update({ status: 'cancelled', is_integrated: false })
      .eq("clinic_id", clinicId)
      .eq("app_id", appId);

    if (error) throw error;
    return;
  } catch (e) {
    if (!isSchemaMismatchError(e)) {
      const msg = String(e?.message || "").toLowerCase();
      const isRls = msg.includes("row-level security") || msg.includes("permission denied");
      if (isRls) throw e;
    }
    if (!isSchemaMismatchError(e)) throw e;
  }

  await uninstallAppV2(clinicId, appId);
}

export async function toggleAppIntegration(subscriptionId, isIntegrated) {
  const { data, error } = await supabase
    .from("app_subscriptions")
    .update({ is_integrated: isIntegrated })
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
