import { 
  Briefcase, MapPin, Heart, Shield, Activity, FileText, AlertTriangle, 
  Droplet, Scissors, Users, Mail, Phone, User, ShieldCheck, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { useEffect, useMemo, useState } from "react";
import { PersonalInfoEditModal } from "./PersonalInfoEditModal";
import { MedicalHistoryEditModal } from "./MedicalHistoryEditModal";
import { InsuranceEditModal } from "./InsuranceEditModal";
import { CustomFieldsEditModal } from "./CustomFieldsEditModal";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { flattenCustomFieldTemplates, mergeTemplatesIntoCustomFields, normalizeMedicalFieldsConfig } from "../../lib/medicalFieldsConfig";

export default function PatientProfileTab({ patient }) {
  const [editingSection, setEditingSection] = useState(null); // 'personal', 'medical', 'insurance'
  const [displayPatient, setDisplayPatient] = useState(patient);
  const { data: preferences } = useUserPreferences();

  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const patientSections = medicalFieldsConfig.patient.sections;
  const patientCustomSections = medicalFieldsConfig.patient.customSections;
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
    : ["personal", "medical", "insurance", "custom_fields"];
  const sectionItems = patientSections?.items || {};

  const personalFieldOrder = Array.isArray(patientSections?.personalFields?.order)
    ? patientSections.personalFields.order
    : [];
  const personalFieldLabels = patientSections?.personalFields?.labels || {};

  const personalFieldDefs = {
    job: { icon: Briefcase, value: () => displayPatient.job },
    marital_status: { icon: Users, value: () => getMaritalStatusLabel(displayPatient.marital_status) },
    address: { icon: MapPin, value: () => displayPatient.address },
    phone: { icon: Phone, value: () => displayPatient.phone, dir: "ltr", className: "text-right" },
    email: { icon: Mail, value: () => displayPatient.email },
    blood_type: { icon: Droplet, value: () => displayPatient.blood_type, className: "text-red-600 font-bold" },
  };

  const enabledSectionKeys = useMemo(
    () => sectionOrder.filter((k) => (sectionItems[k] || {}).enabled !== false),
    [sectionOrder, sectionItems]
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

  return (
    <div className="space-y-6" dir="rtl">
      {sectionOrder.map((key) => {
        const it = sectionItems[key] || {};
        if (it.enabled === false) return null;

        if (key === "personal") {
          const title = it.title || "البيانات الشخصية";
          const fields = personalFieldOrder
            .map((fieldKey) => ({ fieldKey, def: personalFieldDefs[fieldKey] }))
            .filter((x) => x.def);
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
                  {fields.map(({ fieldKey, def }) => (
                    <InfoItem
                      key={fieldKey}
                      icon={def.icon}
                      label={personalFieldLabels[fieldKey] || fieldKey}
                      value={def.value()}
                      dir={def.dir}
                      className={def.className}
                    />
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setEditingSection("personal")}
                  >
                    تعديل
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (key === "medical") {
          const title = it.title || "الملف الطبي";
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                    <h4 className="text-xs font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" /> الأمراض المزمنة
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {medicalHistory.chronic_diseases && medicalHistory.chronic_diseases.length > 0 ? (
                        medicalHistory.chronic_diseases.map((disease, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white text-orange-700 border-orange-200">
                            {disease}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">لا يوجد</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
                    <h4 className="text-xs font-medium text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> الحساسية
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {medicalHistory.allergies && medicalHistory.allergies.length > 0 ? (
                        medicalHistory.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white text-red-700 border-red-200">
                            {allergy}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">لا يوجد</span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Scissors className="w-4 h-4" /> العمليات السابقة
                    </h4>
                    {medicalHistory.past_surgeries && medicalHistory.past_surgeries.length > 0 ? (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {medicalHistory.past_surgeries.map((surgery, idx) => (
                          <li key={idx}>{surgery}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-gray-400">لا يوجد</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" /> التاريخ العائلي
                    </h4>
                    {medicalHistory.family_history && medicalHistory.family_history.length > 0 ? (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {medicalHistory.family_history.map((history, idx) => (
                          <li key={idx}>{history}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-gray-400">لا يوجد</span>
                    )}
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setEditingSection("medical")}
                  >
                    تعديل
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (key === "insurance") {
          const title = it.title || "التأمين الصحي";
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
                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs text-blue-600/80 block">شركة التأمين</span>
                    <span className="text-sm font-medium text-blue-900">{insuranceInfo.provider_name || "-"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-blue-600/80 block">رقم البوليصة</span>
                    <span className="text-sm font-medium text-blue-900">{insuranceInfo.policy_number || "-"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-blue-600/80 block">نسبة التغطية</span>
                    <span className="text-sm font-medium text-blue-900">
                      {insuranceInfo.coverage_percent ? `%${insuranceInfo.coverage_percent}` : "-"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setEditingSection("insurance")}
                  >
                    تعديل
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (key === "custom_fields") {
          const title = it.title || "حقول إضافية";
          const groups = [{ id: "default", title, enabled: true }, ...patientCustomSections].filter((s) => s.enabled !== false);
          return (
            <Card key={key} className="relative group bg-card/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
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
                {customFields.length === 0 ? (
                  <div className="text-sm text-muted-foreground">لا يوجد</div>
                ) : (
                  groups.map((g) => {
                    const fields = customFields.filter((f) => String(f?.section_id || "default") === String(g.id));
                    if (fields.length === 0) return null;
                    return (
                      <div key={g.id} className="space-y-2">
                        <div className="text-sm font-semibold">{g.title}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {fields.map((field) => (
                            <div
                              key={field.id}
                              className="p-2.5 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all"
                            >
                              <div className="text-xs text-muted-foreground mb-1">{field.name}</div>
                              <div className="text-sm font-medium text-foreground">
                                {field.type === "checkbox" ? (field.value ? "نعم" : "لا") : (field.value ?? "-") || "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setEditingSection("custom")}
                  >
                    تعديل
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        return null;
      })}

      {/* Edit Modals */}
      <PersonalInfoEditModal 
        open={editingSection === 'personal'} 
        onOpenChange={(open) => !open && setEditingSection(null)} 
        patient={displayPatient}
        onSuccess={handleUpdateSuccess}
      />
      <MedicalHistoryEditModal 
        open={editingSection === 'medical'} 
        onOpenChange={(open) => !open && setEditingSection(null)} 
        patient={displayPatient}
        onSuccess={handleUpdateSuccess}
      />
      <InsuranceEditModal 
        open={editingSection === 'insurance'} 
        onOpenChange={(open) => !open && setEditingSection(null)} 
        patient={displayPatient}
        onSuccess={handleUpdateSuccess}
      />
      <CustomFieldsEditModal
        open={editingSection === 'custom'}
        onOpenChange={(open) => !open && setEditingSection(null)}
        patient={patientWithTemplateFields}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, className, dir }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all">
      <div className="p-2 bg-primary/10 rounded-full shrink-0">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
      </div>
      <div className="flex items-center gap-2">
         <span className="text-sm text-muted-foreground">{label}:</span>
         <span className={`font-medium text-foreground ${className || ""}`} dir={dir}>{value || "-"}</span>
      </div>
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
