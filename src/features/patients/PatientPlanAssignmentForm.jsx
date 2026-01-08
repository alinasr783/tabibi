import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Button } from "../../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useCreatePatientPlan } from "./usePatientPlans";

export default function PatientPlanAssignmentForm({ 
  open, 
  onClose, 
  template, 
  patientId,
  onPlanAssigned 
}) {
  const [totalSessions, setTotalSessions] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [sessionError, setSessionError] = useState("");
  const { mutate: createPlan, isPending: isCreating } = useCreatePatientPlan();

  // Calculate total price when sessions or template changes
  useEffect(() => {
    // Handle empty or invalid session count
    if (template && totalSessions !== "" && !isNaN(parseInt(totalSessions))) {
      const sessions = parseInt(totalSessions);
      if (sessions > 0) {
        const calculatedPrice = sessions * (template.session_price || 0);
        setTotalPrice(calculatedPrice);
        return;
      }
    }
    setTotalPrice(0);
  }, [totalSessions, template]);

  // Reset form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      setTotalSessions(1);
      setSessionError("");
      if (template) {
        setTotalPrice(template.session_price || 0);
      } else {
        setTotalPrice(0);
      }
    }
  }, [open, template]);

  const handleSessionCountChange = (e) => {
    const value = e.target.value;
    
    // Allow empty value during typing
    if (value === "") {
      setTotalSessions("");
      setSessionError("");
      return;
    }
    
    const numValue = parseInt(value);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      setSessionError("يرجى إدخال رقم صحيح");
      return;
    }
    
    // Update the value
    setTotalSessions(numValue);
    
    // Validate minimum sessions
    if (numValue < 1) {
      setSessionError("عدد الجلسات يجب أن يكون أكبر من صفر");
    } else {
      setSessionError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate minimum sessions
    const sessions = parseInt(totalSessions);
    if (isNaN(sessions) || sessions < 1) {
      setSessionError("عدد الجلسات يجب أن يكون أكبر من صفر");
      return;
    }
    
    if (!template?.id || !patientId) {
      toast.error("بيانات غير كاملة");
      return;
    }
    
    const payload = {
      total_sessions: sessions,
      total_price: parseFloat(totalPrice),
      template_id: template.id,
      patient_id: patientId,
      status: "active" // Set default status to active
    };
    
    console.log("Submitting patient plan:", payload);
    
    createPlan(payload, {
      onSuccess: () => {
        toast.success("تم تعيين خطة العلاج بنجاح");
        if (onPlanAssigned) {
          onPlanAssigned();
        }
        onClose();
      },
      onError: (error) => {
        console.error("Error creating patient plan:", error);
        toast.error("حدث خطأ أثناء تعيين خطة العلاج");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>تعيين خطة علاجية</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template-name" className="text-right">
                اسم الخطة
              </Label>
              <div className="col-span-3">
                <Input
                  id="template-name"
                  value={template?.name || ""}
                  disabled
                  className="bg-muted/50" // Highlight as non-editable
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="session-price" className="text-right">
                سعر الجلسة
              </Label>
              <div className="col-span-3">
                <Input
                  id="session-price"
                  value={`${template?.session_price || 0} جنيه`}
                  disabled
                  className="bg-muted/50" // Highlight as non-editable
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total_sessions" className="text-right">
                عدد الجلسات
              </Label>
              <div className="col-span-3">
                <Input
                  id="total_sessions"
                  type="number"
                  min="1"
                  value={totalSessions}
                  onChange={handleSessionCountChange}
                  className={sessionError ? "border-red-500" : ""}
                />
                {sessionError && (
                  <p className="text-red-500 text-sm mt-1">
                    {sessionError}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total-price" className="text-right">
                السعر الإجمالي
              </Label>
              <div className="col-span-3">
                <Input
                  id="total-price"
                  value={`${typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} جنيه`}
                  disabled
                  className="bg-muted/50" // Highlight as non-editable
                />
              </div>
            </div>
            
            {template?.description && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="template-description" className="text-right pt-2">
                  الوصف
                </Label>
                <div className="col-span-3">
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-[var(--radius)]">
                    {template.description}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button className="w-[25%]" type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button 
              className="w-[75%]"
              type="submit" 
              disabled={isCreating || !!sessionError}
            >
              {isCreating ? "جارٍ الإنشاء..." : "إنشاء خطة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}