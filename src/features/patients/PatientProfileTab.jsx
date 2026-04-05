import { 
  Briefcase, MapPin, Heart, Shield, Activity, FileText, AlertTriangle, 
  Droplet, Scissors, Users, Mail, Phone, User, ShieldCheck, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PersonalInfoEditModal } from "./PersonalInfoEditModal";
import { MedicalHistoryEditModal } from "./MedicalHistoryEditModal";
import { InsuranceEditModal } from "./InsuranceEditModal";
import { CustomFieldsEditModal } from "./CustomFieldsEditModal";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { flattenCustomFieldTemplates, mergeTemplatesIntoCustomFields, normalizeMedicalFieldsConfig } from "../../lib/medicalFieldsConfig";
import { InlineEdit } from "./InlineEdit";
import { updatePatient } from "../../services/apiPatients";
import { useOfflineData } from "../offline-mode/useOfflineData";
import { toast as hotToast } from "react-hot-toast";
import { toast as sonnerToast } from "sonner";
import { NotificationToast } from "../Notifications/NotificationToast";
import { TagInput } from "../../components/ui/tag-input";

export default function PatientProfileTab({ patient }) {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState(null); // 'personal', 'medical', 'insurance'
  const [fieldsModal, setFieldsModal] = useState({ open: false, sectionId: null, title: "" });
  const [displayPatient, setDisplayPatient] = useState(patient);
  const { data: preferences } = useUserPreferences();
  const { updatePatientOffline } = useOfflineData();

  const handleInlineUpdate = async (field, value) => {
    try {
      const updates = { [field]: value };
      if (String(displayPatient?.id || "").startsWith("local_")) {
        await updatePatientOffline(displayPatient.id, updates);
      } else {
        await updatePatient(displayPatient.id, updates);
      }
      setDisplayPatient(prev => ({ ...prev, ...updates }));
      queryClient.invalidateQueries({ queryKey: ["patient", displayPatient.id] });
      queryClient.invalidateQueries({ queryKey: ["patient", String(displayPatient.id)] });
      
      // Modern Tabibi Notification Style
      sonnerToast.custom((id) => (
        <NotificationToast
          id={id}
          notification={{
            title: "تم التحديث بنجاح",
            message: `تم تحديث ${field} تلقائياً`,
            type: "success",
            created_at: new Date().toISOString(),
          }}
          onClick={() => {}}
        />
      ), {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      hotToast.error("فشل التحديث التلقائي");
      throw error;
    }
  };

  const handleMedicalUpdate = async (field, value) => {
    try {
      const updatedMedicalHistory = {
        ...(displayPatient.medical_history || {}),
        [field]: value
      };
      const updates = { medical_history: updatedMedicalHistory };
      
      if (String(displayPatient?.id || "").startsWith("local_")) {
        await updatePatientOffline(displayPatient.id, updates);
      } else {
        await updatePatient(displayPatient.id, updates);
      }
      setDisplayPatient(prev => ({ ...prev, ...updates }));
      queryClient.invalidateQueries({ queryKey: ["patient", displayPatient.id] });
      queryClient.invalidateQueries({ queryKey: ["patient", String(displayPatient.id)] });
      
      // Modern Tabibi Notification Style
      sonnerToast.custom((id) => (
        <NotificationToast
          id={id}
          notification={{
            title: "تحديث السجل الطبي",
            message: `تم تحديث بيانات السجل الطبي بنجاح`,
            type: "success",
            created_at: new Date().toISOString(),
          }}
          onClick={() => {}}
        />
      ), {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      hotToast.error("فشل تحديث السجل الطبي");
      throw error;
    }
  };

  const handleInsuranceUpdate = async (field, value) => {
    try {
      const updatedInsurance = {
        ...(displayPatient.insurance_info || {}),
        [field]: value
      };
      const updates = { insurance_info: updatedInsurance };
      
      if (String(displayPatient?.id || "").startsWith("local_")) {
        await updatePatientOffline(displayPatient.id, updates);
      } else {
        await updatePatient(displayPatient.id, updates);
      }
      setDisplayPatient(prev => ({ ...prev, ...updates }));
      queryClient.invalidateQueries({ queryKey: ["patient", displayPatient.id] });
      queryClient.invalidateQueries({ queryKey: ["patient", String(displayPatient.id)] });
      
      // Modern Tabibi Notification Style
      sonnerToast.custom((id) => (
        <NotificationToast
          id={id}
          notification={{
            title: "تحديث بيانات التأمين",
            message: `تم حفظ تغييرات بيانات التأمين`,
            type: "success",
            created_at: new Date().toISOString(),
          }}
          onClick={() => {}}
        />
      ), {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      hotToast.error("فشل تحديث بيانات التأمين");
      throw error;
    }
  };

  const updateCustomField = async (fieldId, newValue) => {
    try {
      const currentFields = Array.isArray(displayPatient.custom_fields) ? displayPatient.custom_fields : [];
      const updatedFields = currentFields.map(f => 
        f.id === fieldId ? { ...f, value: newValue } : f
      );
      
      // If the field wasn't in the array (e.g. it was a template that hasn't been saved yet)
      if (!updatedFields.find(f => f.id === fieldId)) {
        updatedFields.push({ id: fieldId, value: newValue });
      }

      await handleInlineUpdate("custom_fields", updatedFields);
    } catch (error) {
      console.error("Error updating custom field:", error);
      throw error;
    }
  };

  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const patientSections = medicalFieldsConfig.patient.sections;
  const patientCustomSections = medicalFieldsConfig.patient.customSections;
  const patientFieldsConfig = medicalFieldsConfig.patient.fields;
  const patientSectionTemplates = medicalFieldsConfig.patient.sectionTemplates;
  const patientAllTemplates = useMemo(
    () => flattenCustomFieldTemplates({ config: medicalFieldsConfig, context: "patient" }),
    [medicalFieldsConfig]
  );

  useEffect(() => {
    setDisplayPatient(patient);
  }, [patient]);

  if (!displayPatient) return null;

  const handleUpdateSuccess = (updates) => {
    setDisplayPatient(prev => ({ ...prev, ...updates }));
    setEditingSection(null);
  };

  const medicalHistory = displayPatient.medical_history || {};
  const insuranceInfo = displayPatient.insurance_info || {};
  const rawCustomFields = Array.isArray(displayPatient.custom_fields) ? displayPatient.custom_fields : [];
  const customFields = useMemo(
    () => mergeTemplatesIntoCustomFields(rawCustomFields, patientAllTemplates),
    [rawCustomFields, patientAllTemplates]
  );
  const patientWithTemplateFields = useMemo(
    () => ({ ...displayPatient, custom_fields: customFields }),
    [displayPatient, customFields]
  );

  const sectionOrder = Array.isArray(patientSections?.order)
    ? patientSections.order
    : ["personal", "medical", "insurance"];
  const sectionItems = patientSections?.items || {};

  const personalFieldOrder = Array.isArray(patientSections?.personalFields?.order)
    ? patientSections.personalFields.order
    : [];
  const personalFieldLabels = patientSections?.personalFields?.labels || {};

  const personalFieldDefs = {
    job: { 
      icon: Briefcase, 
      value: () => displayPatient.job,
      type: "text",
      onSave: (v) => handleInlineUpdate("job", v)
    },
    marital_status: { 
      icon: Users, 
      value: () => displayPatient.marital_status,
      type: "select",
      options: [
        { label: "أعزب/ة", value: "single" },
        { label: "متزوج/ة", value: "married" },
        { label: "مطلق/ة", value: "divorced" },
        { label: "أرمل/ة", value: "widowed" }
      ],
      onSave: (v) => handleInlineUpdate("marital_status", v)
    },
    address: { 
      icon: MapPin, 
      value: () => displayPatient.address,
      type: "textarea",
      onSave: (v) => handleInlineUpdate("address", v)
    },
    phone: { 
      icon: Phone, 
      value: () => displayPatient.phone, 
      dir: "ltr", 
      className: "text-right",
      type: "text",
      onSave: (v) => handleInlineUpdate("phone", v)
    },
    email: { 
      icon: Mail, 
      value: () => displayPatient.email,
      type: "text",
      onSave: (v) => handleInlineUpdate("email", v)
    },
    blood_type: { 
      icon: Droplet, 
      value: () => displayPatient.blood_type, 
      className: "text-red-600 font-bold",
      type: "select",
      options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => ({ label: t, value: t })),
      onSave: (v) => handleInlineUpdate("blood_type", v)
    },
  };

  const enabledSectionKeys = useMemo(
    () =>
      sectionOrder.filter((k) => {
        const key = String(k);
        if (key.startsWith("custom:")) {
          const id = key.slice("custom:".length);
          const cs = patientCustomSections.find((s) => String(s?.id) === id);
          return !!cs && cs.enabled !== false;
        }
        return (sectionItems[key] || {}).enabled !== false;
      }),
    [sectionOrder, sectionItems, patientCustomSections]
  );
  const enabledSectionKeysKey = enabledSectionKeys.join("|");
  const [mobileOpen, setMobileOpen] = useState({});

  useEffect(() => {
    setMobileOpen((prev) => {
      if (enabledSectionKeys.length === 0) return prev;
      const hasAnyOpen = enabledSectionKeys.some((k) => !!prev[k]);
      if (hasAnyOpen) return prev;
      return { ...prev, [enabledSectionKeys[0]]: true };
    });
  }, [enabledSectionKeysKey]);

  const builtinSectionTemplateIds = useMemo(() => {
    const out = {};
    const keys = ["personal", "medical", "insurance"];
    for (const k of keys) {
      const list = Array.isArray(patientSectionTemplates?.[k]) ? patientSectionTemplates[k] : [];
      out[k] = new Set(list.filter((t) => t?.enabled !== false).map((t) => String(t.id)));
    }
    return out;
  }, [patientSectionTemplates]);

  return (
    <div className="space-y-6" dir="rtl">
      {sectionOrder.map((key) => {
        if (String(key).startsWith("custom:")) {
          const sectionId = String(key).slice("custom:".length);
          const cs = patientCustomSections.find((s) => String(s?.id) === sectionId);
          if (!cs || cs.enabled === false) return null;
          const fields = customFields.filter((f) => String(f?.section_id || "") === sectionId);
          const hasTemplates = Array.isArray(cs.templates) && cs.templates.length > 0;
          return (
            <Card key={key} className="relative group bg-card/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {cs.title}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                    onClick={() => setMobileOpen((p) => ({ ...p, [key]: !p[key] }))}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen[key] ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${mobileOpen[key] ? "block" : "hidden"} sm:block`}>
                {fields.length === 0 ? (
                  <div className="text-sm text-muted-foreground">لا يوجد</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fields.map((field) => (
                      <InlineEdit
                        key={field.id}
                        label={field.name}
                        value={field.value}
                        type={field.type}
                        options={(field.options || []).map(o => ({ label: o, value: o }))}
                        onSave={(v) => updateCustomField(field.id, v)}
                      />
                    ))}
                  </div>
                )}
                {(fields.length > 0 || hasTemplates) && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setFieldsModal({ open: true, sectionId, title: cs.title })}
                    >
                      تعديل الحقول
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }

        const it = sectionItems[key] || {};
        if (it.enabled === false) return null;

        if (key === "personal") {
          const title = it.title || "البيانات الشخصية";
          const fields = personalFieldOrder
            .map((fieldKey) => ({ fieldKey, def: personalFieldDefs[fieldKey] }))
            .filter((x) => x.def);
          const cfg = patientFieldsConfig?.personal || {};
          const enabledFields = fields.filter((x) => (cfg?.[x.fieldKey]?.enabled ?? true) !== false);
          const extra = customFields.filter(
            (f) => String(f?.section_id || "") === "personal" && builtinSectionTemplateIds.personal.has(String(f?.id))
          );
          const hasTemplates = Array.isArray(patientSectionTemplates?.personal) && patientSectionTemplates.personal.length > 0;
          return (
            <Card key={key} className="relative group bg-card/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {title}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                    onClick={() => setMobileOpen((p) => ({ ...p, [key]: !p[key] }))}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen[key] ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`${mobileOpen[key] ? "block" : "hidden"} sm:block`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {enabledFields.map(({ fieldKey, def }) => (
                    <InlineEdit
                      key={fieldKey}
                      icon={def.icon}
                      label={cfg?.[fieldKey]?.label || personalFieldLabels[fieldKey] || fieldKey}
                      value={def.value()}
                      type={def.type}
                      options={def.options}
                      onSave={def.onSave}
                      dir={def.dir}
                      className={def.className}
                    />
                  ))}
                </div>
                {(extra.length > 0 || hasTemplates) && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extra.map((field) => (
                      <InlineEdit
                        key={field.id}
                        label={field.name}
                        value={field.value}
                        type={field.type}
                        options={(field.options || []).map(o => ({ label: o, value: o }))}
                        onSave={(v) => updateCustomField(field.id, v)}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  {(extra.length > 0 || hasTemplates) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setFieldsModal({ open: true, sectionId: "personal", title })}
                    >
                      تعديل الحقول
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        if (key === "medical") {
          const title = it.title || "الملف الطبي";
          const cfg = patientFieldsConfig?.medical || {};
          const showChronic = (cfg?.chronic_diseases?.enabled ?? true) !== false;
          const showAllergies = (cfg?.allergies?.enabled ?? true) !== false;
          const showSurgeries = (cfg?.past_surgeries?.enabled ?? true) !== false;
          const showFamily = (cfg?.family_history?.enabled ?? true) !== false;
          const extra = customFields.filter(
            (f) => String(f?.section_id || "") === "medical" && builtinSectionTemplateIds.medical.has(String(f?.id))
          );
          const hasTemplates = Array.isArray(patientSectionTemplates?.medical) && patientSectionTemplates.medical.length > 0;
          return (
            <Card key={key} className="relative group bg-card/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    {title}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                    onClick={() => setMobileOpen((p) => ({ ...p, [key]: !p[key] }))}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen[key] ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${mobileOpen[key] ? "block" : "hidden"} sm:block`}>
                {(showChronic || showAllergies || showSurgeries || showFamily) ? (
                  <>
                    {(showChronic || showAllergies) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {showChronic && (
                          <TagInput
                            variant="inline"
                            label={cfg?.chronic_diseases?.label || "الأمراض المزمنة"}
                            value={medicalHistory.chronic_diseases}
                            onSave={(v) => handleMedicalUpdate("chronic_diseases", v)}
                            placeholder="أضف مرضاً مزمناً..."
                          />
                        )}

                        {showAllergies && (
                          <TagInput
                            variant="inline"
                            label={cfg?.allergies?.label || "الحساسية"}
                            value={medicalHistory.allergies}
                            onSave={(v) => handleMedicalUpdate("allergies", v)}
                            placeholder="أضف حساسية..."
                          />
                        )}
                      </div>
                    )}

                    {(showSurgeries || showFamily) && (
                      <>
                        {(showChronic || showAllergies) && <Separator />}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {showSurgeries && (
                            <TagInput
                              variant="inline"
                              label={cfg?.past_surgeries?.label || "العمليات السابقة"}
                              value={medicalHistory.past_surgeries}
                              onSave={(v) => handleMedicalUpdate("past_surgeries", v)}
                              placeholder="أضف عملية..."
                            />
                          )}

                          {showFamily && (
                            <TagInput
                              variant="inline"
                              label={cfg?.family_history?.label || "التاريخ العائلي"}
                              value={medicalHistory.family_history}
                              onSave={(v) => handleMedicalUpdate("family_history", v)}
                              placeholder="أضف تاريخاً عائلياً..."
                            />
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">لا يوجد</div>
                )}
                {(extra.length > 0 || hasTemplates) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extra.map((field) => (
                      <InlineEdit
                        key={field.id}
                        label={field.name}
                        value={field.value}
                        type={field.type}
                        options={(field.options || []).map(o => ({ label: o, value: o }))}
                        onSave={(v) => updateCustomField(field.id, v)}
                      />
                    ))}
                  </div>
                )}
                <div className="pt-2 flex justify-end gap-2">
                  {(extra.length > 0 || hasTemplates) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setFieldsModal({ open: true, sectionId: "medical", title })}
                    >
                      تعديل الحقول
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        if (key === "insurance") {
          const title = it.title || "التأمين الصحي";
          const cfg = patientFieldsConfig?.insurance || {};
          const showProvider = (cfg?.provider_name?.enabled ?? true) !== false;
          const showPolicy = (cfg?.policy_number?.enabled ?? true) !== false;
          const showCoverage = (cfg?.coverage_percent?.enabled ?? true) !== false;
          const extra = customFields.filter(
            (f) => String(f?.section_id || "") === "insurance" && builtinSectionTemplateIds.insurance.has(String(f?.id))
          );
          const hasTemplates = Array.isArray(patientSectionTemplates?.insurance) && patientSectionTemplates.insurance.length > 0;
          return (
            <Card key={key} className="relative group bg-card/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    {title}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                    onClick={() => setMobileOpen((p) => ({ ...p, [key]: !p[key] }))}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen[key] ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`${mobileOpen[key] ? "block" : "hidden"} sm:block`}>
                <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {showProvider && (
                    <InlineEdit
                      label={cfg?.provider_name?.label || "شركة التأمين"}
                      value={insuranceInfo.provider_name}
                      onSave={(v) => handleInsuranceUpdate("provider_name", v)}
                      className="bg-transparent border-none hover:bg-blue-100/50"
                    />
                  )}
                  {showPolicy && (
                    <InlineEdit
                      label={cfg?.policy_number?.label || "رقم البوليصة"}
                      value={insuranceInfo.policy_number}
                      onSave={(v) => handleInsuranceUpdate("policy_number", v)}
                      className="bg-transparent border-none hover:bg-blue-100/50"
                    />
                  )}
                  {showCoverage && (
                    <InlineEdit
                      label={cfg?.coverage_percent?.label || "نسبة التغطية"}
                      value={insuranceInfo.coverage_percent}
                      type="number"
                      onSave={(v) => handleInsuranceUpdate("coverage_percent", v)}
                      className="bg-transparent border-none hover:bg-blue-100/50"
                    />
                  )}
                </div>
                {(extra.length > 0 || hasTemplates) && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extra.map((field) => (
                      <InlineEdit
                        key={field.id}
                        label={field.name}
                        value={field.value}
                        type={field.type}
                        options={(field.options || []).map(o => ({ label: o, value: o }))}
                        onSave={(v) => updateCustomField(field.id, v)}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  {(extra.length > 0 || hasTemplates) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setFieldsModal({ open: true, sectionId: "insurance", title })}
                    >
                      تعديل الحقول
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        return null;
      })}

      {/* Edit Modals (Keep as fallback if needed, but remove direct buttons) */}
      <CustomFieldsEditModal
        open={fieldsModal.open}
        onOpenChange={(open) => !open && setFieldsModal({ open: false, sectionId: null, title: "" })}
        patient={patientWithTemplateFields}
        onSuccess={handleUpdateSuccess}
        sectionId={fieldsModal.sectionId}
        title={fieldsModal.title ? `تعديل حقول ${fieldsModal.title}` : "تعديل الحقول"}
      />
    </div>
  );
}

function getMaritalStatusLabel(status) {
  const map = {
    single: "أعزب/عزباء",
    married: "متزوج/ة",
    divorced: "مطلق/ة",
    widowed: "أرمل/ة"
  };
  return map[status] || status || "-";
}
