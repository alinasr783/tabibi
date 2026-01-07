import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, DollarSign, Search, Edit, Stethoscope, FileText, Trash2, AlertCircle } from "lucide-react";
import useTreatmentTemplates from "./useTreatmentTemplates";
import { SkeletonLine } from "../../components/ui/skeleton";
import { Input } from "../../components/ui/input";
import { formatCurrency } from "../../lib/utils";
import { useState, useMemo } from "react";
import TreatmentTemplateEditDialog from "./TreatmentTemplateEditDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import useDeleteTreatmentTemplate from "./useDeleteTreatmentTemplate";

function TreatmentTemplateItem({ template }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutateAsync: deleteTemplate, isPending: isDeleting } = useDeleteTreatmentTemplate();

  return (
    <>
      <Card className="border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {template.name}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              #{String(template.id).slice(0, 8)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <DollarSign className="ml-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">سعر الجلسة:</span>
              <span className="mr-2 font-semibold text-green-600">{formatCurrency(template.session_price || 0)}</span>
            </div>

            <div className="flex items-center text-sm">
              <Calendar className="ml-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">تاريخ الإنشاء:</span>
              <span className="mr-2 font-medium">
                {template.created_at ? format(new Date(template.created_at), "dd MMM yyyy", { locale: ar }) : "غير محدد"}
              </span>
            </div>

            {template.description && (
              <div className="pt-2">
                <div className="flex items-start text-sm">
                  <FileText className="ml-2 h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground line-clamp-3">
                    {template.description}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
                className="w-full gap-1"
              >
                <Edit className="h-4 w-4" />
                تعديل
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full gap-1"
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </div>
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                await deleteTemplate(template.id);
                setIsDeleteDialogOpen(false);
              }}
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
    <Card className="border border-gray-200 rounded-xl overflow-hidden">
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

export default function TreatmentTemplatesList() {
  const { data: templates, isLoading, error } = useTreatmentTemplates();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter templates based on search term
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchTerm) return templates;
    
    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      (template.description && template.description.toLowerCase().includes(term))
    );
  }, [templates, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الخطط العلاجية..."
            className="pr-10 h-12 rounded-lg border-border"
            disabled
          />
        </div>
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
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الخطط العلاجية..."
            className="pr-10 h-12 rounded-lg border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">حدث خطأ أثناء تحميل الخطط العلاجية</h3>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الخطط العلاجية..."
            className="pr-10 h-12 rounded-lg border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">لا توجد خطط علاجية</h3>
          <p className="text-muted-foreground">لا توجد خطط علاجية متوفرة حالياً</p>
          <p className="text-sm text-muted-foreground mt-1">اضغط على "إضافة خطة علاجية" لإنشاء خطة علاجية جديدة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث في الخطط العلاجية..."
          className="pr-10 h-12 rounded-lg border-border"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">لا توجد نتائج</h3>
          <p className="text-muted-foreground">لا توجد خطط علاجية مطابقة للبحث</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TreatmentTemplateItem key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
