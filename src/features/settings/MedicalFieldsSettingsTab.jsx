import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUpdateUserPreferences, useUserPreferences } from "../../hooks/useUserPreferences";
import { normalizeMedicalFieldsConfig } from "../../lib/medicalFieldsConfig";

const FIELD_TYPES = [
  { value: "text", label: "نص" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "textarea", label: "نص طويل" },
  { value: "checkbox", label: "صح/غلط" },
  { value: "select", label: "اختيار" },
  { value: "multiselect", label: "اختيارات متعددة" },
  { value: "progress", label: "نسبة (1-100)" },
];

function createTemplate({ name, type, sectionId }) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    type: type || "text",
    placeholder: "",
    options: [],
    enabled: true,
    section_id: sectionId || "",
  };
}

function FieldRow({ title, field, onChange, disableToggle }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-[var(--radius)] border p-3 bg-card/50">
      <div className="md:col-span-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
      </div>
      <div className="md:col-span-3 space-y-1">
        <Label className="text-[10px] text-muted-foreground">الاسم</Label>
        <Input
          value={field.label || ""}
          onChange={(e) => onChange({ label: e.target.value })}
          className="text-sm"
        />
      </div>
      <div className="md:col-span-4 space-y-1">
        <Label className="text-[10px] text-muted-foreground">العبارة داخل الحقل</Label>
        <Input
          value={field.placeholder || ""}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          className="text-sm"
        />
      </div>
      <div className="md:col-span-2 flex items-center gap-2">
        <Checkbox
          checked={field.enabled !== false}
          onCheckedChange={(v) => onChange({ enabled: v })}
          disabled={disableToggle}
        />
        <span className="text-sm text-muted-foreground">إظهار</span>
      </div>
    </div>
  );
}

function moveItem(arr, fromIdx, toIdx) {
  const list = Array.isArray(arr) ? arr.slice() : [];
  if (fromIdx < 0 || fromIdx >= list.length) return list;
  if (toIdx < 0 || toIdx >= list.length) return list;
  const [item] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, item);
  return list;
}

function SectionsManager({ title, context, sections, customSections, onUpdate, selectedKey, onSelectKey }) {
  const order = Array.isArray(sections?.order) ? sections.order : [];
  const items = sections?.items || {};
  const list = Array.isArray(customSections) ? customSections : [];
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const updateBuiltin = (key, patch) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].sections = next[context].sections || {};
      next[context].sections.items = next[context].sections.items || {};
      next[context].sections.items[key] = { ...(next[context].sections.items[key] || {}), ...patch };
      return next;
    });
  };

  const updateOrder = (nextOrder) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].sections = next[context].sections || {};
      next[context].sections.order = nextOrder;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  const moveKey = (idx, dir) => {
    updateOrder(moveItem(order, idx, idx + dir));
  };

  const updateCustom = (id, patch) => {
    const nextList = list.map((s) => (String(s.id) === String(id) ? { ...s, ...patch } : s));
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].customSections = nextList;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  const removeCustom = (id) => {
    const nextList = list.filter((s) => String(s.id) !== String(id));
    const key = `custom:${id}`;
    const nextOrder = order.filter((k) => String(k) !== String(key));
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].customSections = nextList;
      next[context].sections.order = nextOrder;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  const addCustom = () => {
    const t = newSectionTitle.trim();
    if (!t) return;
    const id = crypto.randomUUID();
    const nextList = [...list, { id, title: t, enabled: true, order: list.length, templates: [] }];
    const key = `custom:${id}`;
    const nextOrder = [...order, key];
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].customSections = nextList;
      next[context].sections.order = nextOrder;
      return normalizeMedicalFieldsConfig(next);
    });
    setNewSectionTitle("");
    onSelectKey?.(key);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
        <div className="sm:col-span-4">
          <Label className="text-[10px] text-muted-foreground mb-1 block">اسم القسم</Label>
          <Input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="مثال: الحالة الطبية"
            className="text-sm"
          />
        </div>
        <Button type="button" variant="outline" onClick={addCustom} disabled={!newSectionTitle.trim()} className="gap-2">
          <Plus className="size-4" />
          إضافة
        </Button>
      </div>

      <div className="space-y-2">
        {order.map((key, idx) => {
          const k = String(key);
          if (k.startsWith("custom:")) {
            const id = k.slice("custom:".length);
            const cs = list.find((s) => String(s?.id) === id);
            if (!cs) return null;
            return (
              <div
                key={k}
                className={`rounded-[var(--radius)] border p-3 bg-card/50 cursor-pointer ${
                  String(selectedKey) === k ? "border-primary/60 bg-primary/5" : ""
                }`}
                onClick={() => onSelectKey?.(k)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={cs.enabled !== false} onCheckedChange={(v) => updateCustom(cs.id, { enabled: v })} />
                    </div>
                    <Input
                      value={cs.title || ""}
                      onChange={(e) => updateCustom(cs.id, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveKey(idx, -1)}
                      disabled={idx === 0}
                      title="فوق"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveKey(idx, 1)}
                      disabled={idx === order.length - 1}
                      title="تحت"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeCustom(cs.id)}
                      title="حذف"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          const it = items[k] || {};
          return (
            <div
              key={k}
              className={`rounded-[var(--radius)] border p-3 bg-card/50 cursor-pointer ${
                String(selectedKey) === k ? "border-primary/60 bg-primary/5" : ""
              }`}
              onClick={() => onSelectKey?.(k)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={it.enabled !== false} onCheckedChange={(v) => updateBuiltin(k, { enabled: v })} />
                  </div>
                  <Input
                    value={it.title || ""}
                    onChange={(e) => updateBuiltin(k, { title: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveKey(idx, -1)}
                    disabled={idx === 0}
                    title="فوق"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveKey(idx, 1)}
                    disabled={idx === order.length - 1}
                    title="تحت"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectedSectionEditor({
  context,
  selectedKey,
  config,
  onUpdate,
  updateBaseField,
  updateAppointmentPatientInfoSubsection,
}) {
  if (!selectedKey) {
    return <div className="text-sm text-muted-foreground">اختار قسم علشان تظهر تفاصيله</div>;
  }

  const ctx = config?.[context] || {};
  const order = Array.isArray(ctx?.sections?.order) ? ctx.sections.order : [];
  const items = ctx?.sections?.items || {};
  const customSections = Array.isArray(ctx?.customSections) ? ctx.customSections : [];

  if (!order.some((k) => String(k) === String(selectedKey))) {
    return <div className="text-sm text-muted-foreground">القسم غير موجود</div>;
  }

  const keyStr = String(selectedKey);
  const isCustom = keyStr.startsWith("custom:");
  const sectionKey = isCustom ? null : keyStr;
  const sectionId = isCustom ? keyStr.slice("custom:".length) : null;
  const customSection = isCustom ? customSections.find((s) => String(s?.id) === String(sectionId)) : null;
  const sectionTitle = isCustom ? customSection?.title : items?.[sectionKey]?.title || sectionKey;

  const templates = isCustom
    ? Array.isArray(customSection?.templates)
      ? customSection.templates
      : []
    : Array.isArray(ctx?.sectionTemplates?.[sectionKey])
      ? ctx.sectionTemplates[sectionKey]
      : [];

  const onTemplatesChange = (nextTemplates) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      if (isCustom) {
        const list = Array.isArray(next[context].customSections) ? next[context].customSections : [];
        next[context].customSections = list.map((s) =>
          String(s?.id) === String(sectionId) ? { ...s, templates: nextTemplates } : s
        );
        return normalizeMedicalFieldsConfig(next);
      }
      next[context].sectionTemplates = next[context].sectionTemplates || {};
      next[context].sectionTemplates[sectionKey] = nextTemplates;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-base font-bold">{sectionTitle || "قسم"}</div>

      {context === "appointment" && !isCustom && sectionKey === "patient_info" && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">داخل بطاقة بيانات المريض</div>
          <div className="rounded-[var(--radius)] border p-3 bg-card/50 space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground">عنوان الحالة الطبية</Label>
              <Input
                value={config.appointment.patient_info_subsections?.medical_history?.title || ""}
                onChange={(e) => updateAppointmentPatientInfoSubsection("medical_history", { title: e.target.value })}
                className="text-sm h-11"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={config.appointment.patient_info_subsections?.medical_history?.enabled !== false}
                  onCheckedChange={(v) => updateAppointmentPatientInfoSubsection("medical_history", { enabled: v })}
                />
                <span className="text-sm text-muted-foreground">إظهار</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground">عنوان التأمين</Label>
              <Input
                value={config.appointment.patient_info_subsections?.insurance?.title || ""}
                onChange={(e) => updateAppointmentPatientInfoSubsection("insurance", { title: e.target.value })}
                className="text-sm h-11"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={config.appointment.patient_info_subsections?.insurance?.enabled !== false}
                  onCheckedChange={(v) => updateAppointmentPatientInfoSubsection("insurance", { enabled: v })}
                />
                <span className="text-sm text-muted-foreground">إظهار</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {context === "appointment" && !isCustom && sectionKey === "medical_state" && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">الحقول الأساسية</div>
          <div className="space-y-2">
            <FieldRow
              title="الملاحظات"
              field={config.appointment.fields.notes}
              onChange={(patch) => updateBaseField("appointment", "notes", patch)}
            />
            <FieldRow
              title="التشخيص"
              field={config.appointment.fields.diagnosis}
              onChange={(patch) => updateBaseField("appointment", "diagnosis", patch)}
            />
            <FieldRow
              title="العلاج"
              field={config.appointment.fields.treatment}
              onChange={(patch) => updateBaseField("appointment", "treatment", patch)}
            />
          </div>
        </div>
      )}

      {context === "visit" && !isCustom && ["diagnosis", "notes", "treatment", "follow_up"].includes(sectionKey) && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">الحقول الأساسية</div>
          <FieldRow
            title={
              sectionKey === "diagnosis"
                ? "التشخيص"
                : sectionKey === "notes"
                  ? "ملاحظات"
                  : sectionKey === "treatment"
                    ? "العلاج"
                    : "متابعة"
            }
            field={config.visit.fields[sectionKey]}
            onChange={(patch) => updateBaseField("visit", sectionKey, patch)}
            disableToggle={sectionKey === "diagnosis"}
          />
        </div>
      )}

      {context === "patient" && !isCustom && sectionKey === "personal" && (
        <PatientPersonalFieldsEditor
          personalFields={config.patient.sections.personalFields}
          fieldsConfig={config.patient.fields.personal}
          onUpdate={onUpdate}
        />
      )}

      {context === "patient" && !isCustom && sectionKey === "medical" && (
        <PatientFieldsGroupEditor
          title="حقول الملف الطبي"
          groupKey="medical"
          order={["chronic_diseases", "allergies", "past_surgeries", "family_history"]}
          fieldsConfig={config.patient.fields.medical}
          onUpdate={onUpdate}
        />
      )}

      {context === "patient" && !isCustom && sectionKey === "insurance" && (
        <PatientFieldsGroupEditor
          title="حقول التأمين"
          groupKey="insurance"
          order={["provider_name", "policy_number", "coverage_percent"]}
          fieldsConfig={config.patient.fields.insurance}
          onUpdate={onUpdate}
        />
      )}

      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">الحقول داخل القسم</div>
        <TemplatesEditor templates={templates} onChange={onTemplatesChange} sectionId={isCustom ? sectionId : sectionKey} />
      </div>
    </div>
  );
}

function TemplatesEditor({ templates, onChange, sectionId }) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [optionDrafts, setOptionDrafts] = useState({});

  const list = Array.isArray(templates) ? templates : [];

  const handleAdd = () => {
    if (!newName.trim()) return;
    onChange([...list, createTemplate({ name: newName, type: newType, sectionId })]);
    setNewName("");
    setNewType("text");
  };

  const updateItem = (id, patch) => {
    onChange(list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeItem = (id) => {
    onChange(list.filter((t) => t.id !== id));
  };

  const getOptions = (id) => {
    const t = list.find((x) => x.id === id);
    return Array.isArray(t?.options) ? t.options : [];
  };

  const addOption = (id) => {
    const raw = optionDrafts?.[id] ?? "";
    const value = String(raw).trim();
    if (!value) return;
    const current = getOptions(id);
    if (current.includes(value)) {
      setOptionDrafts((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    updateItem(id, { options: [...current, value] });
    setOptionDrafts((prev) => ({ ...prev, [id]: "" }));
  };

  const removeOption = (id, opt) => {
    const current = getOptions(id);
    updateItem(id, { options: current.filter((x) => x !== opt) });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
        <div className="sm:col-span-3">
          <Label className="text-[10px] text-muted-foreground mb-1 block">اسم الحقل</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="مثال: ضغط الدم"
            className="text-sm"
          />
        </div>
        <div className="sm:col-span-1">
          <Label className="text-[10px] text-muted-foreground mb-1 block">النوع</Label>
          <Select value={newType} onValueChange={setNewType} dir="rtl">
            <SelectTrigger className="h-10 w-full justify-between text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="sm:col-span-1 gap-2"
          onClick={handleAdd}
          disabled={!newName.trim()}
        >
          <Plus className="size-4" />
          إضافة
        </Button>
      </div>

      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="rounded-[var(--radius)] border p-3 bg-card/50 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={t.enabled !== false}
                    onCheckedChange={(v) => updateItem(t.id, { enabled: v })}
                  />
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeItem(t.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-5 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">اسم الحقل</Label>
                  <Input
                    value={t.name}
                    onChange={(e) => updateItem(t.id, { name: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">النوع</Label>
                  <Select value={t.type} onValueChange={(v) => updateItem(t.id, { type: v })} dir="rtl">
                    <SelectTrigger className="h-10 w-full justify-between text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>
                          {ft.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">العبارة داخل الحقل</Label>
                  <Input
                    value={t.placeholder || ""}
                    onChange={(e) => updateItem(t.id, { placeholder: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>

              {(t.type === "select" || t.type === "multiselect") && (
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground">الاختيارات</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(t.options) ? t.options : []).map((opt) => (
                      <div key={opt} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-background">
                        <span>{opt}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeOption(t.id, opt)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <Input
                    value={optionDrafts?.[t.id] ?? ""}
                    onChange={(e) => setOptionDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption(t.id);
                      }
                    }}
                    className="text-sm"
                    placeholder="اكتب اختيار واضغط Enter"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BuiltinSectionsEditor({ title, context, sections, onUpdate }) {
  const order = Array.isArray(sections?.order) ? sections.order : [];
  const items = sections?.items || {};

  const updateItem = (key, patch) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].sections = next[context].sections || {};
      next[context].sections.items = next[context].sections.items || {};
      next[context].sections.items[key] = { ...(next[context].sections.items[key] || {}), ...patch };
      return next;
    });
  };

  const moveKey = (idx, dir) => {
    const nextOrder = moveItem(order, idx, idx + dir);
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context].sections.order = nextOrder;
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="space-y-2">
        {order.map((key, idx) => {
          const it = items[key] || {};
          return (
            <div key={key} className="rounded-[var(--radius)] border p-3 bg-card/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={it.enabled !== false} onCheckedChange={(v) => updateItem(key, { enabled: v })} />
                  <Input
                    value={it.title || ""}
                    onChange={(e) => updateItem(key, { title: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveKey(idx, -1)}
                    disabled={idx === 0}
                    title="فوق"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveKey(idx, 1)}
                    disabled={idx === order.length - 1}
                    title="تحت"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomSectionsEditor({ title, context, customSections, onUpdate }) {
  const list = Array.isArray(customSections) ? customSections : [];
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const updateSections = (nextSections) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context].customSections = nextSections;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  const addSection = () => {
    const t = newSectionTitle.trim();
    if (!t) return;
    const next = [
      ...list,
      { id: crypto.randomUUID(), title: t, enabled: true, order: list.length, templates: [] },
    ];
    updateSections(next);
    setNewSectionTitle("");
  };

  const moveSection = (idx, dir) => {
    const moved = moveItem(list, idx, idx + dir).map((s, i) => ({ ...s, order: i }));
    updateSections(moved);
  };

  const updateSection = (id, patch) => {
    const next = list.map((s) => (s.id === id ? { ...s, ...patch } : s)).map((s, i) => ({ ...s, order: i }));
    updateSections(next);
  };

  const removeSection = (id) => {
    const next = list.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
    updateSections(next);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
        <div className="sm:col-span-4">
          <Label className="text-[10px] text-muted-foreground mb-1 block">اسم القسم</Label>
          <Input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSection();
              }
            }}
            placeholder="مثال: الحالة الطبية"
            className="text-sm"
          />
        </div>
        <Button type="button" variant="outline" onClick={addSection} disabled={!newSectionTitle.trim()} className="gap-2">
          <Plus className="size-4" />
          إضافة
        </Button>
      </div>

      {list.length > 0 && (
        <div className="space-y-3">
          {list.map((s, idx) => (
            <div key={s.id} className="rounded-[var(--radius)] border p-3 bg-card/50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox checked={s.enabled !== false} onCheckedChange={(v) => updateSection(s.id, { enabled: v })} />
                  <Input
                    value={s.title || ""}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveSection(idx, -1)}
                    disabled={idx === 0}
                    title="فوق"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveSection(idx, 1)}
                    disabled={idx === list.length - 1}
                    title="تحت"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeSection(s.id)}
                    title="حذف"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <TemplatesEditor
                templates={s.templates}
                onChange={(nextTemplates) => updateSection(s.id, { templates: nextTemplates })}
                sectionId={s.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatientPersonalFieldsEditor({ personalFields, fieldsConfig, onUpdate }) {
  const order = Array.isArray(personalFields?.order) ? personalFields.order : [];
  const labels = personalFields?.labels || {};
  const cfg = fieldsConfig || {};

  const moveKey = (idx, dir) => {
    const nextOrder = moveItem(order, idx, idx + dir);
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next.patient.sections.personalFields.order = nextOrder;
      return next;
    });
  };

  const updateField = (key, patch) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next.patient.fields = next.patient.fields || {};
      next.patient.fields.personal = next.patient.fields.personal || {};
      next.patient.fields.personal[key] = { ...(next.patient.fields.personal[key] || {}), ...patch };
      if (typeof patch.label === "string") next.patient.sections.personalFields.labels[key] = patch.label;
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">حقول البيانات الشخصية (الاسم/الترتيب)</div>
      <div className="space-y-2">
        {order.map((key, idx) => (
          <div key={key} className="rounded-[var(--radius)] border p-3 bg-card/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="text-xs text-muted-foreground w-24 shrink-0">{key}</div>
                <Checkbox
                  checked={(cfg?.[key]?.enabled ?? true) !== false}
                  onCheckedChange={(v) => updateField(key, { enabled: v })}
                />
                <Input
                  value={cfg?.[key]?.label || labels[key] || ""}
                  onChange={(e) => updateField(key, { label: e.target.value })}
                  className="h-9 text-sm"
                />
                <Input
                  value={cfg?.[key]?.placeholder || ""}
                  onChange={(e) => updateField(key, { placeholder: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="العبارة داخل الحقل"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveKey(idx, -1)}
                  disabled={idx === 0}
                  title="فوق"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveKey(idx, 1)}
                  disabled={idx === order.length - 1}
                  title="تحت"
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientFieldsGroupEditor({ title, groupKey, order, fieldsConfig, onUpdate }) {
  const keys = Array.isArray(order) ? order : Object.keys(fieldsConfig || {});
  const cfg = fieldsConfig || {};

  const updateField = (key, patch) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next.patient.fields = next.patient.fields || {};
      next.patient.fields[groupKey] = next.patient.fields[groupKey] || {};
      next.patient.fields[groupKey][key] = { ...(next.patient.fields[groupKey][key] || {}), ...patch };
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="space-y-2">
        {keys.map((key) => (
          <div key={key} className="rounded-[var(--radius)] border p-3 bg-card/50">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3 flex items-center gap-2">
                <Checkbox
                  checked={(cfg?.[key]?.enabled ?? true) !== false}
                  onCheckedChange={(v) => updateField(key, { enabled: v })}
                />
                <div className="text-xs text-muted-foreground">{key}</div>
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label className="text-[10px] text-muted-foreground">الاسم</Label>
                <Input
                  value={cfg?.[key]?.label || ""}
                  onChange={(e) => updateField(key, { label: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="md:col-span-5 space-y-1">
                <Label className="text-[10px] text-muted-foreground">العبارة داخل الحقل</Label>
                <Input
                  value={cfg?.[key]?.placeholder || ""}
                  onChange={(e) => updateField(key, { placeholder: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTemplatesEditor({ title, context, sections, customSections, sectionTemplates, onUpdate }) {
  const order = Array.isArray(sections?.order) ? sections.order : [];
  const items = sections?.items || {};
  const list = Array.isArray(customSections) ? customSections : [];
  const map = sectionTemplates || {};

  const updateBuiltinTemplates = (sectionKey, nextTemplates) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].sectionTemplates = next[context].sectionTemplates || {};
      next[context].sectionTemplates[sectionKey] = nextTemplates;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  const updateCustomTemplates = (sectionId, nextTemplates) => {
    const nextList = list.map((s) => (String(s?.id) === String(sectionId) ? { ...s, templates: nextTemplates } : s));
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].customSections = nextList;
      return normalizeMedicalFieldsConfig(next);
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="space-y-4">
        {order.map((k) => {
          const key = String(k);
          if (key.startsWith("custom:")) {
            const id = key.slice("custom:".length);
            const cs = list.find((s) => String(s?.id) === id);
            if (!cs || cs.enabled === false) return null;
            return (
              <div key={key} className="space-y-2">
                <div className="text-sm font-semibold">{cs.title}</div>
                <TemplatesEditor
                  templates={Array.isArray(cs.templates) ? cs.templates : []}
                  onChange={(next) => updateCustomTemplates(id, next)}
                  sectionId={id}
                />
              </div>
            );
          }

          if ((items[key] || {}).enabled === false) return null;
          return (
            <div key={key} className="space-y-2">
              <div className="text-sm font-semibold">{items[key]?.title || key}</div>
              <TemplatesEditor
                templates={Array.isArray(map?.[key]) ? map[key] : []}
                onChange={(next) => updateBuiltinTemplates(key, next)}
                sectionId={key}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MedicalFieldsSettingsTab() {
  const { data: preferences, isLoading } = useUserPreferences();
  const { mutate: updatePreferences, isPending } = useUpdateUserPreferences();

  const initial = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );

  const [config, setConfig] = useState(initial);
  const [activeContext, setActiveContext] = useState("appointment");
  const [selectedSections, setSelectedSections] = useState({ appointment: null, visit: null, patient: null });

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  useEffect(() => {
    setSelectedSections((prev) => {
      const order = Array.isArray(config?.[activeContext]?.sections?.order) ? config[activeContext].sections.order : [];
      const current = prev?.[activeContext];
      const hasCurrent = current && order.some((k) => String(k) === String(current));
      if (hasCurrent) return prev;
      return { ...prev, [activeContext]: order[0] || null };
    });
  }, [activeContext, config]);

  const updateBaseField = (context, key, patch) => {
    setConfig((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].fields = next[context].fields || {};
      next[context].fields[key] = { ...(next[context].fields[key] || {}), ...patch };
      return next;
    });
  };

  const updateAppointmentPatientInfoSubsection = (key, patch) => {
    setConfig((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next.appointment = next.appointment || {};
      next.appointment.patient_info_subsections = next.appointment.patient_info_subsections || {};
      next.appointment.patient_info_subsections[key] = { ...(next.appointment.patient_info_subsections[key] || {}), ...patch };
      return next;
    });
  };

  const handleSave = () => {
    updatePreferences(
      { medical_fields_config: normalizeMedicalFieldsConfig(config) },
      {
        onSuccess: () => toast.success("تم حفظ تخصيص الحقول"),
        onError: (err) => {
          const msg = err?.message || "حدث خطأ في حفظ تخصيص الحقول";
          toast.error(msg);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold mb-1">تخصيص الأقسام والحقول</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">اختار الجزء ثم اختار قسم لإدارة الحقول داخله</p>
        </div>
        <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto gap-2">
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              بيحفظ...
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              حفظ
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button
          type="button"
          variant={activeContext === "appointment" ? "default" : "outline"}
          className="h-11 justify-between"
          onClick={() => setActiveContext("appointment")}
        >
          <span>تفاصيل الحجز</span>
        </Button>
        <Button
          type="button"
          variant={activeContext === "visit" ? "default" : "outline"}
          className="h-11 justify-between"
          onClick={() => setActiveContext("visit")}
        >
          <span>تفاصيل الكشف</span>
        </Button>
        <Button
          type="button"
          variant={activeContext === "patient" ? "default" : "outline"}
          className="h-11 justify-between"
          onClick={() => setActiveContext("patient")}
        >
          <span>ملف المريض</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="p-4 bg-card/70 lg:col-span-5 space-y-4">
          <SectionsManager
            title="الأقسام"
            context={activeContext}
            sections={config[activeContext].sections}
            customSections={config[activeContext].customSections}
            onUpdate={setConfig}
            selectedKey={selectedSections?.[activeContext]}
            onSelectKey={(k) => setSelectedSections((prev) => ({ ...prev, [activeContext]: k }))}
          />
        </Card>

        <Card className="p-4 bg-card/70 lg:col-span-7">
          <SelectedSectionEditor
            context={activeContext}
            selectedKey={selectedSections?.[activeContext]}
            config={config}
            onUpdate={setConfig}
            updateBaseField={updateBaseField}
            updateAppointmentPatientInfoSubsection={updateAppointmentPatientInfoSubsection}
          />
        </Card>
      </div>
    </div>
  );
}
