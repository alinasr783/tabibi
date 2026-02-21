import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FileText } from "lucide-react";
import { CustomFieldsForm } from "./PatientProfileSections";

export function CustomFieldsEditModal({ open, onOpenChange, patient, onSuccess, sectionId, title }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {title || "تعديل الحقول"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CustomFieldsForm
            patient={patient}
            sectionId={sectionId}
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
