import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, Search, Edit, Stethoscope, FileText, Trash2, AlertCircle, Clock, Wallet, Users } from "lucide-react";
import { SkeletonLine } from "../../components/ui/skeleton";
import { Input } from "../../components/ui/input";
import { formatCurrency } from "../../lib/utils";
import { useState } from "react";
import TreatmentTemplateEditDialog from "./TreatmentTemplateEditDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import useDeleteTreatmentTemplate from "./useDeleteTreatmentTemplate";

function TreatmentTemplateItem({ template }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutateAsync: deleteTemplate, isPending: isDeleting } = useDeleteTreatmentTemplate();

  return (
    <>
      <Card className="group h-full border border-border/50 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-lg font-bold text-foreground leading-none">
                  {template.name}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {template.created_at ? format(new Date(template.created_at), "dd MMM yyyy", { locale: ar }) : "غير محدد"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xl font-bold text-primary">
                {formatCurrency(template.session_price || 0)}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">سعر الجلسة</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-5 pb-5">
          <div className="min-h-[3rem] mb-4">
            {template.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/40 italic">
                لا يوجد وصف لهذه الخطة
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/30 rounded-lg p-2 text-center border border-border/50">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                آخر استخدام
              </div>
              <div className="text-xs font-semibold text-foreground dir-ltr">
                {template.stats?.lastUsageDate ? format(new Date(template.stats.lastUsageDate), "dd MMM", { locale: ar }) : "-"}
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-2 text-center border border-border/50">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Wallet className="w-3 h-3" />
                المبيعات
              </div>
              <div className="text-xs font-semibold text-foreground">
                {formatCurrency(template.stats?.totalRevenue || 0)}
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 text-center border border-border/50">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                المرضى
              </div>
              <div className="text-xs font-semibold text-foreground">
                {template.stats?.uniquePatients || 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(true)}
              className="w-full gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 h-9"
            >
              <Edit className="h-4 w-4" />
              <span className="text-sm">تعديل</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="w-full gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">حذف</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <TreatmentTemplateEditDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        template={template}
      />

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              حذف الخطة العلاجية
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p>هل أنت متأكد من حذف الخطة "{template.name}"؟ لا يمكن استرجاعها بعد الحذف.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                await deleteTemplate(template.id);
                setIsDeleteDialogOpen(false);
              }}
              className="w-[75%]"
            >
              حذف نهائيًا
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TreatmentTemplateSkeleton() {
  return (
    <Card className="border border-gray-200 rounded-[var(--radius)] overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-start">
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center">
            <SkeletonLine className="h-4 w-4 mr-2" />
            <SkeletonLine className="h-4 w-32" />
          </div>
          <div className="flex items-center">
            <SkeletonLine className="h-4 w-4 mr-2" />
            <SkeletonLine className="h-4 w-32" />
          </div>
          <div className="flex items-center">
            <SkeletonLine className="h-4 w-4 mr-2" />
            <SkeletonLine className="h-4 w-32" />
          </div>
          <div className="pt-4">
            <SkeletonLine className="h-8 w-24 ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TreatmentTemplatesList({ templates, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TreatmentTemplateSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        حدث خطأ أثناء تحميل الخطط العلاجية
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-muted">
        <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold text-muted-foreground">لا توجد خطط علاجية</h3>
        <p className="text-sm text-muted-foreground mt-2">قم بإضافة خطة علاجية جديدة للبدء</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TreatmentTemplateItem key={template.id} template={template} />
      ))}
    </div>
  );
}
