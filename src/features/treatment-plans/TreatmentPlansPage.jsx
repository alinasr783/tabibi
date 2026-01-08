import { Plus, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import TreatmentTemplateCreateDialog from "./TreatmentTemplateCreateDialog";
import TreatmentTemplatesList from "./TreatmentTemplatesList";

export default function TreatmentPlansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <div className="space-y-8 p-4 md:p-6 bg-background min-h-screen pb-20 md:pb-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الخطط العلاجية</h1>
            <p className="text-sm text-muted-foreground">تحكم في الخطط العلاجية</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 h-9">
          <Plus className="h-4 w-4" />
          خطة جديدة
        </Button>
      </div>
      
      <TreatmentTemplatesList />
      
      <TreatmentTemplateCreateDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </div>
  );
}