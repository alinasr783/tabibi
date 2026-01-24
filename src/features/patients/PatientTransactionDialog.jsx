import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Loader2, Banknote, Wallet } from "lucide-react";

export default function PatientTransactionDialog({ open, onOpenChange, patientId, type = "charge", onSuccess }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      // We will call the API function passed via props or imported
      // Since we are decoupling, let's assume the parent handles the actual API call or we import it.
      // For now, let's assume we import it.
      // But to avoid circular dependency issues or missing imports, let's pass the handler.
      // Wait, standard practice in this repo seems to be importing hooks/api.
      // I'll import the API function directly here.
      
      const { addPatientTransaction } = await import("../../services/apiPatients");
      
      await addPatientTransaction({
        patient_id: patientId,
        amount: parseFloat(amount),
        type: type, // 'charge' or 'payment'
        description: description,
        date: new Date().toISOString()
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
      setAmount("");
      setDescription("");
    } catch (error) {
      console.error("Transaction error:", error);
      // Ideally show toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPayment = type === "payment";
  const title = isPayment ? "دفع مستحقات" : "إضافة مستحقات مالية";
  const buttonText = isPayment ? "تأكيد الدفع" : "إضافة المبلغ";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPayment ? <Wallet className="w-5 h-5 text-primary" /> : <Banknote className="w-5 h-5 text-primary" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>المبلغ (جنيه)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="text-left"
              dir="ltr"
            />
          </div>
          
          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ملاحظات عن العملية..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 w-full mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-1/4">
              إلغاء
            </Button>
            <Button type="submit" disabled={!amount || isSubmitting} className="w-3/4">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التنفيذ...
                </>
              ) : (
                buttonText
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
