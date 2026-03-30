import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Sparkles, Zap, X, ArrowLeft } from "lucide-react";

export default function SubscriptionBlockingModal({ isOpen, onClose, status }) {
  const navigate = useNavigate();
  
  const isExpired = status === "expired";

  const handleAction = () => {
    navigate("/subscriptions");
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-white rounded-3xl" dir="rtl">
        {/* Header Background with Icon */}
        <div className={`h-32 flex items-center justify-center relative ${
          isExpired ? "bg-red-50" : "bg-primary/10"
        }`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/50 hover:bg-white text-muted-foreground transition-all"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm rotate-3 ${
            isExpired ? "bg-red-600" : "bg-primary"
          }`}>
            {isExpired ? (
              <Zap className="size-8 text-white fill-current" />
            ) : (
              <Sparkles className="size-8 text-white fill-current" />
            )}
          </div>
        </div>

        <div className="p-6 pt-8 text-center space-y-4">
          <DialogHeader className="p-0">
            <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900">
              {isExpired ? "الاشتراك خلص!" : "خطوة واحدة تفصلك!"}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 pt-2 leading-relaxed">
              {isExpired 
                ? "عيادتك واقفة دلوقتي.. جدد اشتراكك عشان تكمل شغل وتضيف بيانات جديدة." 
                : "عشان تستخدم الميزة دي، محتاج تشترك في باقة طبيبي المميزة لعيادتك."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="p-0 flex-col sm:flex-row gap-3 mt-6">
            <Button 
              onClick={handleAction} 
              className={`w-full h-12 rounded-2xl text-base font-bold gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isExpired 
                  ? "bg-red-600 hover:bg-red-700 shadow-red-200" 
                  : "bg-primary hover:bg-primary/90 shadow-primary/20"
              } shadow-lg`}
            >
              {isExpired ? "جدد اشتراكك" : "اشترك في طبيبي"}
              <ArrowLeft className="size-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="w-full h-12 rounded-2xl text-gray-500 hover:bg-gray-50 font-medium"
            >
              مش دلوقتي
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
