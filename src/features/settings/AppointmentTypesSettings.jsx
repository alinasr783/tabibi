import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { getAppointmentTypes, createAppointmentType, updateAppointmentType, deleteAppointmentType } from "../../services/apiAppointmentTypes";
import toast from "react-hot-toast";

const DEFAULT_COLORS = [
  "#1AA19C", "#224FB5", "#FF6B6B", "#10B981", "#F59E0B", 
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#6366F1"
];

export default function AppointmentTypesSettings() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ name: "", color: "#1AA19C" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["appointmentTypes"],
    queryFn: getAppointmentTypes,
  });

  const createMutation = useMutation({
    mutationFn: createAppointmentType,
    onSuccess: () => {
      queryClient.invalidateQueries(["appointmentTypes"]);
      toast.success("تم إضافة النوع بنجاح");
      setIsDialogOpen(false);
      setFormData({ name: "", color: "#1AA19C" });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAppointmentType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["appointmentTypes"]);
      toast.success("تم التعديل بنجاح");
      setIsDialogOpen(false);
      setEditingType(null);
      setFormData({ name: "", color: "#1AA19C" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointmentType,
    onSuccess: () => {
      queryClient.invalidateQueries(["appointmentTypes"]);
      toast.success("تم الحذف بنجاح");
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("لازم تدخل اسم النوع");
      return;
    }
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({ name: type.name, color: type.color });
    setIsDialogOpen(true);
  };

  const handleDelete = (type) => {
    setDeleteConfirm(type);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">أنواع الحجوزات</h2>
          <p className="text-muted-foreground">حدد أنواع الحجوزات وألوانها المميزة</p>
        </div>
        <Button onClick={() => { setEditingType(null); setFormData({ name: "", color: "#1AA19C" }); setIsDialogOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة نوع جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : types.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد أنواع حجوزات. أضف نوع جديد للبدء.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((type) => (
            <Card key={type.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(type)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "تعديل نوع الحجز" : "إضافة نوع حجز جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label>اسم النوع</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: استشارة، فحص، متابعة"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>لون النوع</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input 
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 font-mono"
                    placeholder="#1AA19C"
                  />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-6 h-6 rounded-full border-2 ${formData.color === color ? 'border-black dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingType ? "حفظ التعديل" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف نوع الحجز</DialogTitle>
          </DialogHeader>
          <p>هل أنت متأكد من حذف "{deleteConfirm?.name}"؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}