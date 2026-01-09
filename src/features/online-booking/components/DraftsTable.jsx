import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBookingDrafts, deleteBookingDraft } from "../apiAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2, Phone, AlertCircle, User, Calendar, Clock, Activity, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function DraftsTable({ clinicId }) {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['booking-drafts', clinicId],
    queryFn: () => getBookingDrafts(clinicId),
    enabled: !!clinicId,
    refetchInterval: 30000 // Refresh every 30s
  });

  const { mutate: deleteDraft, isPending: isDeleting } = useMutation({
    mutationFn: (id) => deleteBookingDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['booking-drafts']);
      toast.success("تم حذف الطلب بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف")
  });

  const handleDelete = (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
      deleteDraft(id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>مفيش طلبات مفقودة حالياً</p>
      </div>
    );
  }

  const DraftCard = ({ draft, className }) => (
    <div className={cn("relative group h-full", className)}>
      <div className="flex flex-col h-full p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base text-foreground truncate">
                {draft.patient_name || "غير محدد"}
              </p>
              {draft.patient_phone && (
                <div className="flex items-center gap-2 mt-0.5">
                  <a 
                    href={`tel:${draft.patient_phone}`}
                    className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-primary transition-colors font-normal"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="truncate font-mono" dir="ltr">{draft.patient_phone}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={draft.status === 'abandoned' ? 'destructive' : 'secondary'} className="h-7 px-2">
              {draft.status === 'abandoned' ? 'مهمل' : 'جاري الحجز'}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(draft.id)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border-t border-border/50 my-3" />

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground">
              {format(new Date(draft.updated_at), "dd MMM yyyy", { locale: ar })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground">
              {format(new Date(draft.updated_at), "hh:mm a", { locale: ar })}
            </span>
          </div>
          
          <div className="col-span-2 flex items-center gap-2 text-sm mt-auto">
            <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground">
              آخر خطوة: <span className="text-primary font-bold">{draft.current_step === 1 ? "بيانات المريض" : "اختيار الموعد"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold">الطلبات غير المكتملة (Lost Leads)</h3>
        <Badge variant="outline" className="text-xs">
          {data.length} طلب
        </Badge>
      </div>
      
      {/* Universal Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-0">
        {data.map((draft) => (
          <DraftCard key={draft.id} draft={draft} />
        ))}
      </div>
    </div>
  );
}
