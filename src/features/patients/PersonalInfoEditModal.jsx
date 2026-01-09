import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { PersonalDataForm } from "./PatientProfileSections";
import { User } from "lucide-react";

export function PersonalInfoEditModal({ open, onOpenChange, patient, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            تعديل البيانات الشخصية
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
            <PersonalDataForm 
                patient={patient} 
                onCancel={() => onOpenChange(false)}
                onSuccess={(data) => {
                    onSuccess(data);
                    onOpenChange(false);
                }}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
