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
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUpdateUserPreferences, useUserPreferences } from "../../hooks/useUserPreferences";
import { normalizeMedicalFieldsConfig } from "../../lib/medicalFieldsConfig";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../components/ui/sheet";

const FIELD_TYPES = [
  { value: "text", label: "نص" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "textarea", label: "نص طويل" },
  { value: "checkbox", label: "صح/غلط" },
];

function createTemplate({ name, type, sectionId }) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    type: type || "text",
    placeholder: "",
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

function TemplatesEditor({ templates, onChange, sectionId }) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");

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

function PatientPersonalFieldsEditor({ personalFields, onUpdate }) {
  const order = Array.isArray(personalFields?.order) ? personalFields.order : [];
  const labels = personalFields?.labels || {};

  const moveKey = (idx, dir) => {
    const nextOrder = moveItem(order, idx, idx + dir);
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next.patient.sections.personalFields.order = nextOrder;
      return next;
    });
  };

  const updateLabel = (key, val) => {
    onUpdate((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next.patient.sections.personalFields.labels[key] = val;
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
                <Input
                  value={labels[key] || ""}
                  onChange={(e) => updateLabel(key, e.target.value)}
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
        ))}
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
  const [mobilePanel, setMobilePanel] = useState(null);
  const [mobileAdvanced, setMobileAdvanced] = useState(false);

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  useEffect(() => {
    setMobileAdvanced(false);
  }, [mobilePanel]);

  const updateBaseField = (context, key, patch) => {
    setConfig((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].fields = next[context].fields || {};
      next[context].fields[key] = { ...(next[context].fields[key] || {}), ...patch };
      return next;
    });
  };

  const updateTemplates = (context, templates) => {
    setConfig((prev) => {
      const next = normalizeMedicalFieldsConfig(prev);
      next[context] = next[context] || {};
      next[context].extraFieldsTemplates = templates;
      return normalizeMedicalFieldsConfig(next);
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

  const mobilePanelTitle =
    mobilePanel === "appointment" ? "تفاصيل الحجز" : mobilePanel === "visit" ? "تفاصيل الكشف" : mobilePanel === "patient" ? "ملف المريض" : "";

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-0" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold mb-1">تخصيص حقول الكشف والحجز</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            تحكم في أسماء الحقول والحقول الإضافية التي تظهر في التفاصيل
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto gap-2 hidden sm:flex">
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

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t bg-background/95 backdrop-blur px-3 py-2 ${
          mobilePanel ? "hidden" : ""
        }`}
      >
        <Button onClick={handleSave} disabled={isPending} className="w-full gap-2 h-11">
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

      <div className="sm:hidden space-y-3">
        <Card className="p-3 bg-card/70">
          <div className="text-sm font-semibold mb-2">اختار الجزء اللي تعدّله</div>
          <div className="grid grid-cols-1 gap-2">
            <Button type="button" variant="outline" className="justify-between h-11" onClick={() => setMobilePanel("appointment")}>
              <span>تفاصيل الحجز</span>
              <ArrowLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" className="justify-between h-11" onClick={() => setMobilePanel("visit")}>
              <span>تفاصيل الكشف</span>
              <ArrowLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" className="justify-between h-11" onClick={() => setMobilePanel("patient")}>
              <span>ملف المريض</span>
              <ArrowLeft className="size-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            على الموبايل: اتبع “الأساسيات” أولاً، وفعّل “إعدادات متقدمة” لو محتاج قوالب وForms.
          </div>
        </Card>
      </div>

      <Sheet open={!!mobilePanel} onOpenChange={(open) => !open && setMobilePanel(null)}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-2xl border-t p-0">
          <SheetHeader className="p-4 flex items-center justify-between">
            <SheetTitle>{mobilePanelTitle}</SheetTitle>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleSave} disabled={isPending} className="gap-2 h-9">
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setMobilePanel(null)}>
                إغلاق
              </Button>
            </div>
          </SheetHeader>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(88vh-72px)]">
            {mobilePanel === "appointment" && (
              <div className="space-y-4">
                <BuiltinSectionsEditor
                  title="الأقسام"
                  context="appointment"
                  sections={config.appointment.sections}
                  onUpdate={setConfig}
                />
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

                <div className="rounded-[var(--radius)] border p-3 bg-card/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">إعدادات متقدمة</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMobileAdvanced((v) => !v)}>
                      {mobileAdvanced ? "إخفاء" : "إظهار"}
                    </Button>
                  </div>
                  {mobileAdvanced && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">حقول إضافية (قوالب)</div>
                        <TemplatesEditor
                          templates={config.appointment.extraFieldsTemplates}
                          onChange={(next) => updateTemplates("appointment", next)}
                          sectionId="default"
                        />
                      </div>
                      <CustomSectionsEditor
                        title="أقسام مخصصة (Forms)"
                        context="appointment"
                        customSections={config.appointment.customSections}
                        onUpdate={setConfig}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {mobilePanel === "visit" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldRow
                    title="التشخيص"
                    field={config.visit.fields.diagnosis}
                    onChange={(patch) => updateBaseField("visit", "diagnosis", patch)}
                    disableToggle
                  />
                  <FieldRow
                    title="ملاحظات"
                    field={config.visit.fields.notes}
                    onChange={(patch) => updateBaseField("visit", "notes", patch)}
                  />
                  <FieldRow
                    title="العلاج"
                    field={config.visit.fields.treatment}
                    onChange={(patch) => updateBaseField("visit", "treatment", patch)}
                  />
                  <FieldRow
                    title="متابعة"
                    field={config.visit.fields.follow_up}
                    onChange={(patch) => updateBaseField("visit", "follow_up", patch)}
                  />
                </div>

                <div className="rounded-[var(--radius)] border p-3 bg-card/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">إعدادات متقدمة</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMobileAdvanced((v) => !v)}>
                      {mobileAdvanced ? "إخفاء" : "إظهار"}
                    </Button>
                  </div>
                  {mobileAdvanced && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">حقول إضافية (قوالب)</div>
                        <TemplatesEditor
                          templates={config.visit.extraFieldsTemplates}
                          onChange={(next) => updateTemplates("visit", next)}
                          sectionId="default"
                        />
                      </div>
                      <CustomSectionsEditor
                        title="أقسام مخصصة (Forms)"
                        context="visit"
                        customSections={config.visit.customSections}
                        onUpdate={setConfig}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {mobilePanel === "patient" && (
              <div className="space-y-4">
                <BuiltinSectionsEditor
                  title="الأقسام"
                  context="patient"
                  sections={config.patient.sections}
                  onUpdate={setConfig}
                />
                <PatientPersonalFieldsEditor personalFields={config.patient.sections.personalFields} onUpdate={setConfig} />

                <div className="rounded-[var(--radius)] border p-3 bg-card/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">إعدادات متقدمة</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMobileAdvanced((v) => !v)}>
                      {mobileAdvanced ? "إخفاء" : "إظهار"}
                    </Button>
                  </div>
                  {mobileAdvanced && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">حقول إضافية (قوالب)</div>
                        <TemplatesEditor
                          templates={config.patient.extraFieldsTemplates}
                          onChange={(next) => updateTemplates("patient", next)}
                          sectionId="default"
                        />
                      </div>
                      <CustomSectionsEditor
                        title="أقسام مخصصة (Forms)"
                        context="patient"
                        customSections={config.patient.customSections}
                        onUpdate={setConfig}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden sm:block space-y-6">
      <Card className="p-3 sm:p-6 space-y-4">
        <div className="text-base font-bold">تفاصيل الحجز</div>
        <BuiltinSectionsEditor
          title="الأقسام (العنوان/الإظهار/الترتيب)"
          context="appointment"
          sections={config.appointment.sections}
          onUpdate={setConfig}
        />
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">أقسام داخل بطاقة بيانات المريض</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-[var(--radius)] border p-3 bg-card/50">
            <div className="md:col-span-3">
              <div className="text-sm font-medium text-foreground">الحالة الطبية</div>
            </div>
            <div className="md:col-span-7 space-y-1">
              <Label className="text-[10px] text-muted-foreground">العنوان</Label>
              <Input
                value={config.appointment.patient_info_subsections?.medical_history?.title || ""}
                onChange={(e) => updateAppointmentPatientInfoSubsection("medical_history", { title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Checkbox
                checked={config.appointment.patient_info_subsections?.medical_history?.enabled !== false}
                onCheckedChange={(v) => updateAppointmentPatientInfoSubsection("medical_history", { enabled: v })}
              />
              <span className="text-sm text-muted-foreground">إظهار</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-[var(--radius)] border p-3 bg-card/50">
            <div className="md:col-span-3">
              <div className="text-sm font-medium text-foreground">التأمين</div>
            </div>
            <div className="md:col-span-7 space-y-1">
              <Label className="text-[10px] text-muted-foreground">العنوان</Label>
              <Input
                value={config.appointment.patient_info_subsections?.insurance?.title || ""}
                onChange={(e) => updateAppointmentPatientInfoSubsection("insurance", { title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Checkbox
                checked={config.appointment.patient_info_subsections?.insurance?.enabled !== false}
                onCheckedChange={(v) => updateAppointmentPatientInfoSubsection("insurance", { enabled: v })}
              />
              <span className="text-sm text-muted-foreground">إظهار</span>
            </div>
          </div>
        </div>
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
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">حقول إضافية (قوالب)</div>
          <TemplatesEditor
            templates={config.appointment.extraFieldsTemplates}
            onChange={(next) => updateTemplates("appointment", next)}
            sectionId="default"
          />
        </div>
        <CustomSectionsEditor
          title="أقسام مخصصة (Forms) داخل تفاصيل الحجز"
          context="appointment"
          customSections={config.appointment.customSections}
          onUpdate={setConfig}
        />
      </Card>

      <Card className="p-3 sm:p-6 space-y-4">
        <div className="text-base font-bold">تفاصيل الكشف</div>
        <div className="space-y-2">
          <FieldRow
            title="التشخيص"
            field={config.visit.fields.diagnosis}
            onChange={(patch) => updateBaseField("visit", "diagnosis", patch)}
            disableToggle
          />
          <FieldRow
            title="ملاحظات"
            field={config.visit.fields.notes}
            onChange={(patch) => updateBaseField("visit", "notes", patch)}
          />
          <FieldRow
            title="العلاج"
            field={config.visit.fields.treatment}
            onChange={(patch) => updateBaseField("visit", "treatment", patch)}
          />
          <FieldRow
            title="متابعة"
            field={config.visit.fields.follow_up}
            onChange={(patch) => updateBaseField("visit", "follow_up", patch)}
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">حقول إضافية (قوالب)</div>
          <TemplatesEditor
            templates={config.visit.extraFieldsTemplates}
            onChange={(next) => updateTemplates("visit", next)}
            sectionId="default"
          />
        </div>
        <CustomSectionsEditor
          title="أقسام مخصصة (Forms) داخل تفاصيل الكشف"
          context="visit"
          customSections={config.visit.customSections}
          onUpdate={setConfig}
        />
      </Card>

      <Card className="p-3 sm:p-6 space-y-4">
        <div className="text-base font-bold">ملف المريض</div>
        <BuiltinSectionsEditor
          title="الأقسام (العنوان/الإظهار/الترتيب)"
          context="patient"
          sections={config.patient.sections}
          onUpdate={setConfig}
        />
        <PatientPersonalFieldsEditor personalFields={config.patient.sections.personalFields} onUpdate={setConfig} />
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">حقول إضافية (قوالب)</div>
          <TemplatesEditor
            templates={config.patient.extraFieldsTemplates}
            onChange={(next) => updateTemplates("patient", next)}
            sectionId="default"
          />
        </div>
        <CustomSectionsEditor
          title="أقسام مخصصة (Forms) داخل ملف المريض"
          context="patient"
          customSections={config.patient.customSections}
          onUpdate={setConfig}
        />
      </Card>
      </div>
    </div>
  );
}
