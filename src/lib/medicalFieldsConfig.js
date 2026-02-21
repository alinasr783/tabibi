export const DEFAULT_MEDICAL_FIELDS_CONFIG = {
  appointment: {
    sections: {
      order: ["patient_info", "medical_state", "history"],
      items: {
        patient_info: { enabled: true, title: "بيانات المريض" },
        medical_state: { enabled: true, title: "الملاحظات والتشخيص" },
        history: { enabled: true, title: "سجل زيارات المريض" },
      },
    },
    patient_info_subsections: {
      medical_history: { enabled: true, title: "الحالة الطبية" },
      insurance: { enabled: true, title: "التأمين" },
    },
    fields: {
      notes: { enabled: true, label: "ملاحظات", placeholder: "اكتب ملاحظات هنا..." },
      diagnosis: { enabled: true, label: "التشخيص", placeholder: "اكتب التشخيص هنا..." },
      treatment: { enabled: true, label: "العلاج", placeholder: "اكتب خطة العلاج هنا..." },
    },
    sectionTemplates: {
      patient_info: [],
      medical_state: [],
      history: [],
    },
    customSections: [],
  },
  visit: {
    sections: {
      order: ["diagnosis", "notes", "treatment", "follow_up"],
      items: {
        diagnosis: { enabled: true, title: "التشخيص" },
        notes: { enabled: true, title: "ملاحظات" },
        treatment: { enabled: true, title: "العلاج" },
        follow_up: { enabled: true, title: "متابعة" },
      },
    },
    fields: {
      diagnosis: { enabled: true, label: "التشخيص", placeholder: "التشخيص المبدئي" },
      notes: { enabled: true, label: "ملاحظات", placeholder: "ملاحظات إضافية" },
      treatment: { enabled: true, label: "العلاج", placeholder: "اكتب خطة العلاج هنا..." },
      follow_up: { enabled: true, label: "متابعة", placeholder: "اكتب ملاحظات المتابعة هنا..." },
    },
    sectionTemplates: {
      diagnosis: [],
      notes: [],
      treatment: [],
      follow_up: [],
    },
    customSections: [],
  },
  patient: {
    sections: {
      order: ["personal", "medical", "insurance"],
      items: {
        personal: { enabled: true, title: "البيانات الشخصية" },
        medical: { enabled: true, title: "الملف الطبي" },
        insurance: { enabled: true, title: "التأمين الصحي" },
      },
      personalFields: {
        order: ["job", "marital_status", "address", "phone", "email", "blood_type"],
        labels: {
          job: "الوظيفة",
          marital_status: "الحالة الاجتماعية",
          address: "العنوان",
          phone: "رقم الهاتف",
          email: "البريد الإلكتروني",
          blood_type: "فصيلة الدم",
        },
      },
    },
    customSections: [],
    sectionTemplates: {
      personal: [],
      medical: [],
      insurance: [],
    },
    fields: {
      personal: {
        job: { enabled: true, label: "الوظيفة", placeholder: "مثال: مهندس، مدرس" },
        marital_status: { enabled: true, label: "الحالة الاجتماعية", placeholder: "" },
        phone: { enabled: true, label: "رقم الهاتف", placeholder: "" },
        email: { enabled: true, label: "البريد الإلكتروني", placeholder: "" },
        blood_type: { enabled: true, label: "فصيلة الدم", placeholder: "" },
        address: { enabled: true, label: "العنوان", placeholder: "العنوان بالتفصيل" },
      },
      medical: {
        chronic_diseases: { enabled: true, label: "الأمراض المزمنة", placeholder: "اكتب المرض واضغط Enter" },
        allergies: { enabled: true, label: "الحساسية", placeholder: "اكتب مسبب الحساسية واضغط Enter" },
        past_surgeries: { enabled: true, label: "العمليات السابقة", placeholder: "اكتب العملية واضغط Enter" },
        family_history: { enabled: true, label: "التاريخ العائلي", placeholder: "اكتب المرض الوراثي واضغط Enter" },
      },
      insurance: {
        provider_name: { enabled: true, label: "شركة التأمين", placeholder: "اسم الشركة" },
        policy_number: { enabled: true, label: "رقم البوليصة", placeholder: "رقم الكارت/البوليصة" },
        coverage_percent: { enabled: true, label: "نسبة التغطية (%)", placeholder: "مثال: 80" },
      },
    },
  },
};

const CUSTOM_SECTION_PREFIX = "custom:";

function customSectionOrderKey(id) {
  return `${CUSTOM_SECTION_PREFIX}${String(id)}`;
}

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

function normalizeTemplates(arr, sectionId) {
  const list = Array.isArray(arr) ? arr : [];
  return list
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      id: String(t.id || crypto.randomUUID()),
      name: String(t.name || ""),
      type: String(t.type || "text"),
      placeholder: typeof t.placeholder === "string" ? t.placeholder : "",
      options: Array.isArray(t.options) ? t.options.map((x) => String(x).trim()).filter(Boolean) : [],
      enabled: t.enabled !== false,
      section_id: typeof t.section_id === "string" ? t.section_id : (sectionId || ""),
    }))
    .filter((t) => t.name.trim().length > 0);
}

function normalizeSectionItems(items) {
  const base = isPlainObject(items) ? items : {};
  const out = {};
  for (const key of Object.keys(base)) {
    const it = base[key];
    if (!isPlainObject(it)) continue;
    out[key] = {
      enabled: it.enabled !== false,
      title: typeof it.title === "string" ? it.title : "",
    };
  }
  return out;
}

function normalizeOrder(order, knownKeys) {
  const arr = Array.isArray(order) ? order.map(String).filter(Boolean) : [];
  const dedup = [];
  for (const k of arr) if (!dedup.includes(k)) dedup.push(k);
  for (const k of knownKeys) if (!dedup.includes(k)) dedup.push(k);
  return dedup;
}

function normalizeCustomSections(arr) {
  const list = Array.isArray(arr) ? arr : [];
  return list
    .filter((s) => s && typeof s === "object")
    .map((s, idx) => {
      const id = String(s.id || crypto.randomUUID());
      const title = typeof s.title === "string" ? s.title : "";
      return {
        id,
        title,
        enabled: s.enabled !== false,
        order: Number.isFinite(Number(s.order)) ? Number(s.order) : idx,
        templates: normalizeTemplates(s.templates, id),
      };
    })
    .filter((s) => s.title.trim().length > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function removeSectionKeysFromOrder(order, removedKeys) {
  const removed = new Set((Array.isArray(removedKeys) ? removedKeys : []).map(String));
  return (Array.isArray(order) ? order.map(String) : []).filter((k) => !removed.has(String(k)));
}

function normalizeTemplatesBySection(map, sectionKeys) {
  const base = isPlainObject(map) ? map : {};
  const out = {};
  for (const key of sectionKeys) {
    out[key] = normalizeTemplates(base[key], key);
  }
  return out;
}

function ensureCustomSectionsInOrder(order, customSections) {
  const out = Array.isArray(order) ? order.map(String).filter(Boolean) : [];
  const existing = new Set(out);
  for (const s of Array.isArray(customSections) ? customSections : []) {
    const key = customSectionOrderKey(s?.id);
    if (!existing.has(key)) {
      out.push(key);
      existing.add(key);
    }
  }
  return out;
}

function sortCustomSectionsByOrder(order, customSections) {
  const ord = Array.isArray(order) ? order.map(String) : [];
  const idxByKey = new Map(ord.map((k, idx) => [k, idx]));
  const list = Array.isArray(customSections) ? customSections.slice() : [];
  return list
    .sort((a, b) => {
      const ai = idxByKey.get(customSectionOrderKey(a.id));
      const bi = idxByKey.get(customSectionOrderKey(b.id));
      if (typeof ai === "number" && typeof bi === "number") return ai - bi;
      if (typeof ai === "number") return -1;
      if (typeof bi === "number") return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    })
    .map((s, i) => ({ ...s, order: i }));
}

function normalizePatientFieldGroup(group, defaults) {
  const base = isPlainObject(group) ? group : {};
  const out = {};
  for (const key of Object.keys(defaults || {})) {
    const it = base[key];
    const d = defaults[key] || {};
    out[key] = {
      enabled: (isPlainObject(it) ? it.enabled : undefined) !== false,
      label: typeof (isPlainObject(it) ? it.label : undefined) === "string" ? it.label : String(d.label || ""),
      placeholder:
        typeof (isPlainObject(it) ? it.placeholder : undefined) === "string"
          ? it.placeholder
          : typeof d.placeholder === "string"
            ? d.placeholder
            : "",
    };
  }
  return out;
}

export function normalizeMedicalFieldsConfig(raw) {
  const merged = deepMerge(DEFAULT_MEDICAL_FIELDS_CONFIG, isPlainObject(raw) ? raw : {});

  merged.appointment = merged.appointment || {};
  merged.appointment.sections = merged.appointment.sections || {};
  merged.appointment.sections.items = normalizeSectionItems(merged.appointment.sections.items);
  merged.appointment.sections.order = ensureCustomSectionsInOrder(
    normalizeOrder(
      removeSectionKeysFromOrder(merged.appointment.sections.order, ["extra_fields"]),
      Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.appointment.sections.items)
    ),
    merged.appointment.customSections
  );
  merged.appointment.patient_info_subsections = normalizeSectionItems(merged.appointment.patient_info_subsections);
  merged.appointment.fields = merged.appointment.fields || {};
  merged.appointment.sectionTemplates = normalizeTemplatesBySection(
    merged.appointment.sectionTemplates,
    Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.appointment.sections.items)
  );
  merged.appointment.customSections = sortCustomSectionsByOrder(
    merged.appointment.sections.order,
    normalizeCustomSections(merged.appointment.customSections)
  );

  merged.visit = merged.visit || {};
  merged.visit.sections = merged.visit.sections || {};
  merged.visit.sections.items = normalizeSectionItems(merged.visit.sections.items);
  merged.visit.sections.order = ensureCustomSectionsInOrder(
    normalizeOrder(
      removeSectionKeysFromOrder(merged.visit.sections.order, ["extra_fields"]),
      Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.visit.sections.items)
    ),
    merged.visit.customSections
  );
  merged.visit.fields = merged.visit.fields || {};
  merged.visit.sectionTemplates = normalizeTemplatesBySection(
    merged.visit.sectionTemplates,
    Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.visit.sections.items)
  );
  merged.visit.customSections = sortCustomSectionsByOrder(
    merged.visit.sections.order,
    normalizeCustomSections(merged.visit.customSections)
  );

  merged.patient = merged.patient || {};
  merged.patient.sections = merged.patient.sections || {};
  merged.patient.sections.items = normalizeSectionItems(merged.patient.sections.items);
  merged.patient.sections.order = ensureCustomSectionsInOrder(
    normalizeOrder(
      removeSectionKeysFromOrder(merged.patient.sections.order, ["custom_fields"]),
      Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.patient.sections.items)
    ),
    merged.patient.customSections
  );
  merged.patient.sections.personalFields = merged.patient.sections.personalFields || {};
  merged.patient.sections.personalFields.order = normalizeOrder(
    merged.patient.sections.personalFields.order,
    DEFAULT_MEDICAL_FIELDS_CONFIG.patient.sections.personalFields.order
  );
  merged.patient.sections.personalFields.labels = {
    ...(DEFAULT_MEDICAL_FIELDS_CONFIG.patient.sections.personalFields.labels || {}),
    ...(isPlainObject(merged.patient.sections.personalFields.labels) ? merged.patient.sections.personalFields.labels : {}),
  };
  merged.patient.customSections = sortCustomSectionsByOrder(
    merged.patient.sections.order,
    normalizeCustomSections(merged.patient.customSections)
  );
  merged.patient.sectionTemplates = normalizeTemplatesBySection(
    merged.patient.sectionTemplates,
    Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.patient.sections.items)
  );
  merged.patient.fields = merged.patient.fields || {};
  merged.patient.fields.personal = normalizePatientFieldGroup(
    merged.patient.fields.personal,
    DEFAULT_MEDICAL_FIELDS_CONFIG.patient.fields.personal
  );
  merged.patient.fields.medical = normalizePatientFieldGroup(
    merged.patient.fields.medical,
    DEFAULT_MEDICAL_FIELDS_CONFIG.patient.fields.medical
  );
  merged.patient.fields.insurance = normalizePatientFieldGroup(
    merged.patient.fields.insurance,
    DEFAULT_MEDICAL_FIELDS_CONFIG.patient.fields.insurance
  );

  return merged;
}

export function flattenCustomFieldTemplates({ config, context }) {
  const ctx = config?.[context] || {};
  const builtin = isPlainObject(ctx.sectionTemplates) ? Object.values(ctx.sectionTemplates).flat() : [];
  const custom = Array.isArray(ctx.customSections)
    ? ctx.customSections.flatMap((s) => (Array.isArray(s.templates) ? s.templates : []))
    : [];
  return [...builtin, ...custom];
}

export function mergeTemplatesIntoCustomFields(existing, templates) {
  const current = Array.isArray(existing) ? existing : [];
  const tmpl = Array.isArray(templates) ? templates : [];
  const byId = new Map(current.map((f) => [String(f?.id), f]).filter(([id]) => id));

  const merged = current.map((f) => ({ ...f }));
  for (const t of tmpl) {
    if (!t?.enabled) continue;
    const id = String(t.id);
    const existingField = id && byId.has(id) ? byId.get(id) : null;
    if (existingField) {
      const idx = merged.findIndex((x) => String(x?.id) === id);
      if (idx >= 0) {
        merged[idx] = {
          ...merged[idx],
          id,
          name: t.name,
          type: t.type,
          placeholder: t.placeholder || merged[idx].placeholder || "",
          options: Array.isArray(t.options) ? t.options : (Array.isArray(merged[idx].options) ? merged[idx].options : []),
          section_id: t.section_id || merged[idx].section_id || "",
        };
      }
      continue;
    }
    merged.push({
      id,
      name: t.name,
      type: t.type,
      placeholder: t.placeholder || "",
      options: Array.isArray(t.options) ? t.options : [],
      section_id: t.section_id || "",
      value: t.type === "checkbox" ? false : t.type === "multiselect" ? [] : "",
    });
  }

  return merged;
}
