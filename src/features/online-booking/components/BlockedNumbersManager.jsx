import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBlockedNumbers, blockNumber, unblockNumber } from "../apiAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, Ban, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function BlockedNumbersManager({ clinicId }) {
  const queryClient = useQueryClient();
  const [newPhone, setNewPhone] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ['blocked-numbers', clinicId],
    queryFn: () => getBlockedNumbers(clinicId),
    enabled: !!clinicId
  });

  const { mutate: addBlock, isPending: isBlocking } = useMutation({
    mutationFn: () => blockNumber(clinicId, newPhone, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['blocked-numbers']);
      setNewPhone("");
      setReason("");
      toast.success("تم حظر الرقم بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء حظر الرقم")
  });

  const { mutate: removeBlock } = useMutation({
    mutationFn: (id) => unblockNumber(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['blocked-numbers']);
      toast.success("تم فك الحظر");
    }
  });

  const handleBlock = (e) => {
    e.preventDefault();
    if (!newPhone) return;
    addBlock();
  };

  const BlockedNumberCard = ({ item, className }) => (
    <div className={cn("relative group h-full", className)}>
      <div className="flex flex-col h-full p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-base text-foreground" dir="ltr">{item.phone_number}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(item.created_at).toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 -ml-2"
            onClick={() => removeBlock(item.id)}
            title="فك الحظر"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        {item.reason && (
          <div className="mt-auto pt-3 border-t border-border/50">
            <div className="text-sm bg-muted/30 p-2 rounded text-muted-foreground leading-relaxed">
              <span className="font-medium ml-1 text-foreground">السبب:</span>
              {item.reason}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-600" />
            إضافة رقم للحظر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBlock} className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <Input 
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full"
              />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium">سبب الحظر (اختياري)</label>
              <Input 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: حجوزات وهمية متكررة"
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={isBlocking || !newPhone} variant="destructive" className="w-full md:w-auto whitespace-nowrap">
              {isBlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
              حظر
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            * الرقم المحظور سيتمكن من إكمال خطوات الحجز ظاهرياً، لكن لن يتم تسجيل الحجز فعلياً (Shadow Ban).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold">الأرقام المحظورة</h3>
          <Badge variant="outline" className="text-xs">
            {data?.length || 0} رقم
          </Badge>
        </div>

        {!isLoading && data?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
            <Ban className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>لا توجد أرقام محظورة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-0">
            {data?.map((item) => (
              <BlockedNumberCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
