export const DEFAULT_MEDICAL_FIELDS_CONFIG = {
  appointment: {
    sections: {
      order: ["patient_info", "medical_state", "extra_fields", "history"],
      items: {
        patient_info: { enabled: true, title: "بيانات المريض" },
        medical_state: { enabled: true, title: "الملاحظات والتشخيص" },
        extra_fields: { enabled: true, title: "حقول إضافية" },
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
    extraFieldsTemplates: [],
    customSections: [],
  },
  visit: {
    sections: {
      items: {
        extra_fields: { enabled: true, title: "حقول إضافية" },
      },
    },
    fields: {
      diagnosis: { enabled: true, label: "التشخيص", placeholder: "التشخيص المبدئي" },
      notes: { enabled: true, label: "ملاحظات", placeholder: "ملاحظات إضافية" },
      treatment: { enabled: true, label: "العلاج", placeholder: "اكتب خطة العلاج هنا..." },
      follow_up: { enabled: true, label: "متابعة", placeholder: "اكتب ملاحظات المتابعة هنا..." },
    },
    extraFieldsTemplates: [],
    customSections: [],
  },
  patient: {
    sections: {
      order: ["personal", "medical", "insurance", "custom_fields"],
      items: {
        personal: { enabled: true, title: "البيانات الشخصية" },
        medical: { enabled: true, title: "الملف الطبي" },
        insurance: { enabled: true, title: "التأمين الصحي" },
        custom_fields: { enabled: true, title: "حقول إضافية" },
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
    extraFieldsTemplates: [],
    customSections: [],
  },
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

function normalizeTemplates(arr, sectionId) {
  const list = Array.isArray(arr) ? arr : [];
  return list
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      id: String(t.id || crypto.randomUUID()),
      name: String(t.name || ""),
      type: String(t.type || "text"),
      placeholder: typeof t.placeholder === "string" ? t.placeholder : "",
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

export function normalizeMedicalFieldsConfig(raw) {
  const merged = deepMerge(DEFAULT_MEDICAL_FIELDS_CONFIG, isPlainObject(raw) ? raw : {});

  merged.appointment = merged.appointment || {};
  merged.appointment.sections = merged.appointment.sections || {};
  merged.appointment.sections.items = normalizeSectionItems(merged.appointment.sections.items);
  merged.appointment.sections.order = normalizeOrder(
    merged.appointment.sections.order,
    Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.appointment.sections.items)
  );
  merged.appointment.patient_info_subsections = normalizeSectionItems(merged.appointment.patient_info_subsections);
  merged.appointment.fields = merged.appointment.fields || {};
  merged.appointment.extraFieldsTemplates = normalizeTemplates(merged.appointment.extraFieldsTemplates, "default");
  merged.appointment.customSections = normalizeCustomSections(merged.appointment.customSections);

  merged.visit = merged.visit || {};
  merged.visit.sections = merged.visit.sections || {};
  merged.visit.sections.items = normalizeSectionItems(merged.visit.sections.items);
  merged.visit.fields = merged.visit.fields || {};
  merged.visit.extraFieldsTemplates = normalizeTemplates(merged.visit.extraFieldsTemplates, "default");
  merged.visit.customSections = normalizeCustomSections(merged.visit.customSections);

  merged.patient = merged.patient || {};
  merged.patient.sections = merged.patient.sections || {};
  merged.patient.sections.items = normalizeSectionItems(merged.patient.sections.items);
  merged.patient.sections.order = normalizeOrder(
    merged.patient.sections.order,
    Object.keys(DEFAULT_MEDICAL_FIELDS_CONFIG.patient.sections.items)
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
  merged.patient.extraFieldsTemplates = normalizeTemplates(merged.patient.extraFieldsTemplates, "default");
  merged.patient.customSections = normalizeCustomSections(merged.patient.customSections);

  return merged;
}

export function flattenCustomFieldTemplates({ config, context }) {
  const ctx = config?.[context] || {};
  const base = Array.isArray(ctx.extraFieldsTemplates) ? ctx.extraFieldsTemplates : [];
  const custom = Array.isArray(ctx.customSections)
    ? ctx.customSections.flatMap((s) => (Array.isArray(s.templates) ? s.templates : []))
    : [];
  return [...base, ...custom];
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
      section_id: t.section_id || "",
      value: "",
    });
  }

  return merged;
}
