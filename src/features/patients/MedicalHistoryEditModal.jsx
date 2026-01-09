import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { MedicalProfileForm } from "./PatientProfileSections";
import { Heart } from "lucide-react";

export function MedicalHistoryEditModal({ open, onOpenChange, patient, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            تعديل الملف الطبي
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
            <MedicalProfileForm 
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
