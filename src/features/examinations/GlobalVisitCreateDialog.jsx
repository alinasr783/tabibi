import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, User, Calendar, Plus, ChevronRight, CheckCircle2, Loader2, ArrowRight, X } from "lucide-react";
import usePatients from "../patients/usePatients";
import VisitCreateForm from "../patients/VisitCreateForm";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getAppointments } from "../../services/apiAppointments";

function PatientSelection({ onSelect, onCancel }) {
  const [searchTerm, setSearchTerm] = useState("");
  const shouldFetch = searchTerm.length >= 2;
  const { data, isLoading } = usePatients(searchTerm, {}, 10, { enabled: shouldFetch });
  const patients = data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن مريض بالاسم أو الهاتف..."
          className="pr-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      <div className="h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
        {!shouldFetch ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p>اكتب حرفين أو رقمين على الأقل للبحث</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <User className="h-8 w-8 mb-2 opacity-50" />
            <p>لا يوجد مرضى مطابقين</p>
          </div>
        ) : (
          patients.map((patient) => (
            <div
              key={patient.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer border border-transparent hover:border-accent-foreground/10 transition-colors"
              onClick={() => onSelect(patient)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))
        )}
      </div>
      
      <div className="pt-2">
        <Button variant="outline" className="w-full" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

function AppointmentSelection({ patientId, onSelect, onSkip, onCancel }) {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: () => getAppointments("", 1, 10, { patientId, time: "upcoming" }), 
  });

  const appointments = data?.data || [];

  return (
    <div className="space-y-4">
       <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground">المواعيد القادمة</h3>
        {isLoading ? (
             <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : appointments.length === 0 ? (
            <div className="text-center p-4 border rounded-md border-dashed text-muted-foreground">
                لا توجد مواعيد قادمة
            </div>
        ) : (
            <div className="space-y-2">
                {appointments.map(apt => (
                    <div 
                        key={apt.id} 
                        className="p-3 border rounded-md hover:bg-accent cursor-pointer flex justify-between items-center"
                        onClick={() => onSelect(apt)}
                    >
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{format(new Date(apt.date), "PPP p", { locale: ar })}</span>
                        </div>
                        <Button variant="ghost" size="sm">اختيار</Button>
                    </div>
                ))}
            </div>
        )}
       </div>

       <div className="pt-4 border-t flex gap-2">
            <Button variant="outline" className="w-[25%]" onClick={onCancel}>
              إلغاء
            </Button>
            <Button className="w-[75%]" onClick={onSkip}>
              <Plus className="ml-2 h-4 w-4" />
              موعد جديد (كشف فوري)
            </Button>
       </div>
    </div>
  )
}

function StepIndicator({ currentStep }) {
  const steps = [
    { id: "patient", label: "المريض" },
    { id: "appointment", label: "الموعد" },
    { id: "details", label: "التفاصيل" }
  ];

  const currentIdx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-center mb-6 px-4">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex flex-col items-center gap-1 ${idx <= currentIdx ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-colors ${
              idx < currentIdx ? "bg-primary text-primary-foreground border-primary" :
              idx === currentIdx ? "border-primary text-primary" :
              "border-muted text-muted-foreground"
            }`}>
              {idx < currentIdx ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
            </div>
            <span className="text-xs font-medium">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 mb-4 transition-colors ${idx < currentIdx ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function GlobalVisitCreateDialog({ open, onOpenChange }) {
  const [step, setStep] = useState("patient"); // patient, appointment, details
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
        setTimeout(() => {
            setStep("patient");
            setSelectedPatient(null);
            setSelectedAppointment(null);
        }, 300);
    }
  }, [open]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setStep("appointment");
  };

  const handleAppointmentSelect = (appointment) => {
    setSelectedAppointment(appointment);
    setStep("details");
  };

  const handleSkipAppointment = () => {
    setSelectedAppointment(null);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "details") setStep("appointment");
    else if (step === "appointment") setStep("patient");
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b mb-4">
          <div className="flex items-center gap-2">
            {step !== "patient" && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                    <ArrowRight className="h-4 w-4" />
                </Button>
            )}
            <DialogTitle>
                {step === "patient" && "اختيار المريض"}
                {step === "appointment" && "اختيار الموعد"}
                {step === "details" && "تفاصيل الكشف"}
            </DialogTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        <div className="mt-2">
          {step === "patient" && (
            <PatientSelection onSelect={handlePatientSelect} onCancel={() => onOpenChange(false)} />
          )}

          {step === "appointment" && selectedPatient && (
            <AppointmentSelection 
                patientId={selectedPatient.id} 
                onSelect={handleAppointmentSelect} 
                onSkip={handleSkipAppointment}
                onCancel={() => onOpenChange(false)}
            />
          )}

          {step === "details" && selectedPatient && (
            <VisitCreateForm 
                patientId={selectedPatient.id}
                appointmentId={selectedAppointment?.id}
                onVisitCreated={() => {
                    onOpenChange(false);
                }}
                onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
