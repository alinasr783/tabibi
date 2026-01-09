import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { InsuranceForm } from "./PatientProfileSections";
import { Shield } from "lucide-react";

export function InsuranceEditModal({ open, onOpenChange, patient, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            تعديل بيانات التأمين
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
            <InsuranceForm 
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
