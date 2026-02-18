import supabase from "./supabase";

export const defaultClinicProfileSettings = {
  stats: {
    enabled: true,
    items: [
      { key: "open_now", enabled: true },
      { key: "bookings_last_week", enabled: false },
      { key: "bookings_last_month", enabled: true },
      { key: "bookings_last_year", enabled: false },
      { key: "rating", enabled: true, value: 4.9, max: 5 },
    ],
  },
  actions: {
    enabled: true,
    showLocation: false,
    locationUrl: "",
    order: ["call", "whatsapp", "share", "location"],
  },
  builtinSections: {
    order: ["actions", "clinic_details", "working_hours", "bio", "education", "certificates", "custom_sections"],
    visibility: {
      actions: true,
      clinic_details: true,
      working_hours: true,
      bio: true,
      education: true,
      certificates: true,
      custom_sections: true,
    },
  },
  customSections: [],
};

function isPlainObject(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function deepMerge(base, incoming) {
  if (!isPlainObject(base) || !isPlainObject(incoming)) return incoming ?? base;
  const out = { ...base };
  for (const key of Object.keys(incoming)) {
    const nextVal = incoming[key];
    if (isPlainObject(out[key]) && isPlainObject(nextVal)) out[key] = deepMerge(out[key], nextVal);
    else out[key] = nextVal;
  }
  return out;
}

function mergeItemsByKey(baseItems, incomingItems, keyField = "key") {
  const base = Array.isArray(baseItems) ? baseItems : [];
  const incoming = Array.isArray(incomingItems) ? incomingItems : null;
  if (!incoming) return base;

  const incomingMap = new Map(incoming.map((i) => [i?.[keyField], i]).filter(([k]) => k));
  const used = new Set();

  const merged = base.map((b) => {
    const k = b?.[keyField];
    if (!k) return b;
    const inc = incomingMap.get(k);
    if (!inc) return b;
    used.add(k);
    return { ...b, ...inc };
  });

  const extras = incoming.filter((i) => {
    const k = i?.[keyField];
    return k && !used.has(k) && !base.some((b) => b?.[keyField] === k);
  });

  return [...merged, ...extras];
}

function ensureOrderContains(order, required) {
  const arr = Array.isArray(order) ? order.slice() : [];
  const req = Array.isArray(required) ? required : [];
  for (const k of req) {
    if (!arr.includes(k)) arr.push(k);
  }
  return arr;
}

export async function getClinicProfileSettings(clinicId) {
  if (!clinicId) return { clinicId: null, settings: defaultClinicProfileSettings, exists: false };

  const { data, error } = await supabase
    .from("clinic_profile_settings")
    .select("clinic_id, settings, updated_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return { clinicId, settings: defaultClinicProfileSettings, exists: false };

  const raw = data.settings || {};
  const merged = deepMerge(defaultClinicProfileSettings, raw);
  merged.stats = merged.stats || {};
  merged.actions = merged.actions || {};
  merged.builtinSections = merged.builtinSections || {};

  merged.stats.items = mergeItemsByKey(defaultClinicProfileSettings.stats.items, raw?.stats?.items);
  merged.actions.order = ensureOrderContains(raw?.actions?.order ?? merged.actions.order, defaultClinicProfileSettings.actions.order);
  merged.builtinSections.order = ensureOrderContains(
    raw?.builtinSections?.order ?? merged.builtinSections.order,
    defaultClinicProfileSettings.builtinSections.order
  );

  return { clinicId, settings: merged, exists: true, updatedAt: data.updated_at };
}

export async function upsertClinicProfileSettings({ clinicId, settings }) {
  if (!clinicId) throw new Error("clinicId is required");
  if (!settings) throw new Error("settings is required");

  const payload = {
    clinic_id: clinicId,
    settings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("clinic_profile_settings")
    .upsert(payload, { onConflict: "clinic_id" })
    .select("clinic_id, settings, updated_at")
    .single();

  if (error) throw error;
  return data;
}

function getOrCreateVisitorId() {
  try {
    const key = "tabibi_profile_visitor_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return null;
  }
}

export async function logClinicProfileEvent({ clinicId, eventType, metadata }) {
  if (!clinicId) return;
  if (!eventType) return;

  const visitorId = getOrCreateVisitorId();
  const row = {
    clinic_id: clinicId,
    visitor_id: visitorId,
    event_type: eventType,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };

  const { error } = await supabase.from("clinic_profile_analytics").insert([row]);
  if (error) {
    return;
  }
}

export async function getClinicProfileAnalyticsCounts({ clinicId, days, eventTypes }) {
  if (!clinicId) throw new Error("clinicId is required");

  const since = new Date();
  since.setDate(since.getDate() - (days ?? 30));

  const types = Array.isArray(eventTypes) && eventTypes.length > 0
    ? eventTypes
    : ["profile_view", "booking_click", "action_call", "action_whatsapp", "action_share", "action_location"];

  const pairs = await Promise.all(
    types.map(async (type) => {
      const { count, error } = await supabase
        .from("clinic_profile_analytics")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("event_type", type)
        .gte("created_at", since.toISOString());

      if (error) throw error;
      return [type, count || 0];
    })
  );

  return Object.fromEntries(pairs);
}

export async function getClinicProfileAnalyticsTopCities({ clinicId, days, limit }) {
  if (!clinicId) throw new Error("clinicId is required");

  const since = new Date();
  since.setDate(since.getDate() - (days ?? 30));

  const { data, error } = await supabase
    .from("clinic_profile_analytics")
    .select("metadata, created_at")
    .eq("clinic_id", clinicId)
    .eq("event_type", "profile_view")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .range(0, 4999);

  if (error) throw error;

  const counts = new Map();
  for (const row of data || []) {
    const md = row?.metadata || {};
    const raw = md.city || md.region || md.governorate || md.state || md.location;
    const name = (typeof raw === "string" ? raw : raw ? String(raw) : "غير معروف").trim() || "غير معروف";
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit ?? 10);
}
