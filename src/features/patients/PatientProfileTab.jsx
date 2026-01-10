import { 
  Briefcase, MapPin, Heart, Shield, Activity, FileText, AlertTriangle, 
  Droplet, Scissors, Users, Mail, Phone, User, Edit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useState, useEffect } from "react";
import { PersonalInfoEditModal } from "./PersonalInfoEditModal";
import { MedicalHistoryEditModal } from "./MedicalHistoryEditModal";
import { InsuranceEditModal } from "./InsuranceEditModal";

export default function PatientProfileTab({ patient }) {
  const [editingSection, setEditingSection] = useState(null); // 'personal', 'medical', 'insurance'
  const [displayPatient, setDisplayPatient] = useState(patient);

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

  return (
    <div className="space-y-6" dir="rtl">
      {/* Personal Information */}
      <Card className="relative group">
        <div className="absolute top-4 left-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('personal')}>
                <Edit className="w-4 h-4 text-muted-foreground" />
            </Button>
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            البيانات الشخصية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoItem icon={Briefcase} label="الوظيفة" value={displayPatient.job} />
            <InfoItem icon={Users} label="الحالة الاجتماعية" value={getMaritalStatusLabel(displayPatient.marital_status)} />
            <InfoItem icon={MapPin} label="العنوان" value={displayPatient.address} />
            <InfoItem icon={Phone} label="رقم الهاتف" value={displayPatient.phone} dir="ltr" className="text-right" />
            <InfoItem icon={Mail} label="البريد الإلكتروني" value={displayPatient.email} />
            <InfoItem icon={Droplet} label="فصيلة الدم" value={displayPatient.blood_type} className="text-red-600 font-bold" />
          </div>
        </CardContent>
      </Card>

      {/* Medical Profile */}
      <Card className="relative group">
        <div className="absolute top-4 left-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('medical')}>
                <Edit className="w-4 h-4 text-muted-foreground" />
            </Button>
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            الملف الطبي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chronic Diseases */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> الأمراض المزمنة
            </h4>
            <div className="flex flex-wrap gap-2">
              {medicalHistory.chronic_diseases && medicalHistory.chronic_diseases.length > 0 ? (
                medicalHistory.chronic_diseases.map((disease, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-100">
                    {disease}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-400">لا يوجد</span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 my-4" />

          {/* Allergies */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> الحساسية
            </h4>
            <div className="flex flex-wrap gap-2">
              {medicalHistory.allergies && medicalHistory.allergies.length > 0 ? (
                medicalHistory.allergies.map((allergy, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100">
                    {allergy}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-400">لا يوجد</span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 my-4" />

          {/* Past Surgeries */}
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

          <div className="border-t border-gray-100 my-4" />

          {/* Family History */}
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
        </CardContent>
      </Card>

      {/* Insurance Information */}
      <Card className="relative group">
        <div className="absolute top-4 left-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('insurance')}>
                <Edit className="w-4 h-4 text-muted-foreground" />
            </Button>
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            التأمين الصحي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoItem label="شركة التأمين" value={insuranceInfo.provider_name} />
            <InfoItem label="رقم البوليصة" value={insuranceInfo.policy_number} />
            <InfoItem label="نسبة التغطية" value={insuranceInfo.coverage_percent ? `%${insuranceInfo.coverage_percent}` : null} />
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, className, dir }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-sm font-medium text-foreground ${className || ""}`} dir={dir}>
        {value || "-"}
      </p>
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
