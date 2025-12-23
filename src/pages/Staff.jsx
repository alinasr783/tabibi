import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table-primitives";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { SkeletonLine } from "../components/ui/skeleton";
import { Plus, Edit, Trash2, UserPlus, User, Phone } from "lucide-react";
import useClinicSecretaries from "../features/clinic/useClinicSecretaries";
import useClinic from "../features/auth/useClinic";
import { useAuth } from "../features/auth/AuthContext";
import useAddSecretary from "../features/clinic/useAddSecretary";
import useUpdateSecretary from "../features/clinic/useUpdateSecretary";
import useDeleteSecretary from "../features/clinic/useDeleteSecretary";
import useUpdateSecretaryPermissions from "../features/clinic/useUpdateSecretaryPermissions"; // Add this import
import SecretaryPermissionsDialog from "../features/clinic/SecretaryPermissionsDialog";
import { SECRETARY_PERMISSIONS } from "../features/clinic/clinicUtils";
import { toast } from "react-hot-toast";

export default function Staff() {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const {
    data: secretaries,
    isLoading,
    isError,
  } = useClinicSecretaries(user?.clinic_id);
  
  const { mutate: addSecretary } = useAddSecretary();
  const { mutate: updateSecretary } = useUpdateSecretary();
  const { mutate: deleteSecretary } = useDeleteSecretary();
  const { mutate: updatePermissions } = useUpdateSecretaryPermissions(); // Add this hook

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [newSecretary, setNewSecretary] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleAddSecretary = () => {
    if (!newSecretary.name || !newSecretary.email) {
      toast.error("الاسم والبريد الإلكتروني مطلوبة");
      return;
    }
    
    addSecretary({
      name: newSecretary.name,
      email: newSecretary.email,
      phone: newSecretary.phone,
      clinicId: user?.clinic_id,
      permissions: ["dashboard", "calendar", "patients"] // Default permissions
    });
    
    setIsAddDialogOpen(false);
    setNewSecretary({ name: "", email: "", phone: "" });
  };

  const handleEditSecretary = (secretary) => {
    setSelectedSecretary(secretary);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSecretary = () => {
    if (!selectedSecretary.name || !selectedSecretary.email) {
      toast.error("الاسم والبريد الإلكتروني مطلوبة");
      return;
    }
    
    updateSecretary({
      userId: selectedSecretary.user_id,
      name: selectedSecretary.name,
      email: selectedSecretary.email,
      phone: selectedSecretary.phone,
    });
    
    setIsEditDialogOpen(false);
    setSelectedSecretary(null);
  };

  const handleDeleteSecretary = (secretaryId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السكرتير؟")) {
      deleteSecretary(secretaryId);
    }
  };

  const handleOpenPermissions = (secretary) => {
    setSelectedSecretary(secretary);
    setSelectedPermissions(
      Array.isArray(secretary.permissions) ? secretary.permissions : []
    );
    setIsPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (permissionId) => {
    setSelectedPermissions((prev) => {
      const currentPermissions = Array.isArray(prev) ? prev : [];

      if (currentPermissions.includes(permissionId)) {
        return currentPermissions.filter((p) => p !== permissionId);
      } else {
        return [...currentPermissions, permissionId];
      }
    });
  };

  const handleSavePermissions = () => {
    // Use the dedicated permissions update function instead of general update
    updatePermissions({
      secretaryId: selectedSecretary.user_id,
      permissions: selectedPermissions,
    });
    
    setIsPermissionsDialogOpen(false);
    setSelectedSecretary(null);
    setSelectedPermissions([]);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-background min-h-screen pb-20 md:pb-0" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الموظفين</h1>
            <p className="text-sm text-muted-foreground">تحكم في السكرتاريه وصلاحياتهم</p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 h-9">
          <UserPlus className="ml-2 h-4 w-4" />
          سكرتير جديد
        </Button>
      </div>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>قايمة السكرتاريه</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <SkeletonLine width={120} height={16} />
                    <SkeletonLine width={200} height={14} />
                  </div>
                  <div className="flex gap-2">
                    <SkeletonLine width={80} height={36} />
                    <SkeletonLine width={80} height={36} />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-destructive text-center py-8">
              حدث خطأ أثناء تحميل قائمة السكرتير
            </div>
          ) : secretaries && secretaries.length > 0 ? (
            <>
              {/* Mobile Cards */}
              <div className="block md:hidden space-y-3">
                {secretaries.map((secretary) => (
                  <Card key={secretary.user_id} className="bg-card/70 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-lg truncate">{secretary.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{secretary.email}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 bg-accent/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-primary" />
                          <span className="text-foreground">{secretary.phone || "-"}</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">الصلاحيات:</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(secretary.permissions) && secretary.permissions.length > 0 ? (
                              secretary.permissions.map((perm) => {
                                const permId = typeof perm === 'object' && perm !== null ? perm.id : perm;
                                const permString = String(permId).trim();
                                const permission = SECRETARY_PERMISSIONS.find((p) => p.id === permString);
                                return (
                                  <Badge key={permString} variant="secondary">
                                    {permission?.label || permString}
                                  </Badge>
                                );
                              })
                            ) : (
                              (() => {
                                try {
                                  if (typeof secretary.permissions === 'string') {
                                    const parsedPermissions = JSON.parse(secretary.permissions);
                                    if (Array.isArray(parsedPermissions) && parsedPermissions.length > 0) {
                                      return parsedPermissions.map((perm) => {
                                        const permId = typeof perm === 'object' && perm !== null ? perm.id : perm;
                                        const permString = String(permId).trim();
                                        const permission = SECRETARY_PERMISSIONS.find((p) => p.id === permString);
                                        return (
                                          <Badge key={permString} variant="secondary">
                                            {permission?.label || permString}
                                          </Badge>
                                        );
                                      });
                                    }
                                  }
                                } catch (e) {
                                  console.warn("Failed to parse permissions:", e);
                                }
                                return <Badge variant="outline">مفيش صلاحيات</Badge>;
                              })()
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenPermissions(secretary)}
                        >
                          <Edit className="ml-1 h-4 w-4" />
                          الصلاحيات
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSecretary(secretary)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSecretary(secretary.user_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>رقم الهاتف</TableHead>
                    <TableHead>الصلاحيات</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secretaries.map((secretary) => (
                    <TableRow key={secretary.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          {secretary.name}
                        </div>
                      </TableCell>
                      <TableCell>{secretary.email}</TableCell>
                      <TableCell>{secretary.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(secretary.permissions) &&
                          secretary.permissions.length > 0 ? (
                            secretary.permissions.map((perm) => {
                              // Handle both string and object permissions
                              const permId = typeof perm === 'object' && perm !== null ? perm.id : perm;
                              // Ensure it's a string and trim any whitespace
                              const permString = String(permId).trim();
                              
                              const permission = SECRETARY_PERMISSIONS.find(
                                (p) => p.id === permString
                              );
                              
                              return (
                                <Badge key={permString} variant="secondary">
                                  {permission?.label || permString}
                                </Badge>
                              );
                            })
                          ) : (
                            // Handle string permissions (JSON string from database)
                            (() => {
                              try {
                                // If permissions is a string, try to parse it as JSON
                                if (typeof secretary.permissions === 'string') {
                                  const parsedPermissions = JSON.parse(secretary.permissions);
                                  if (Array.isArray(parsedPermissions) && parsedPermissions.length > 0) {
                                    return parsedPermissions.map((perm) => {
                                      // Handle both string and object permissions
                                      const permId = typeof perm === 'object' && perm !== null ? perm.id : perm;
                                      // Ensure it's a string and trim any whitespace
                                      const permString = String(permId).trim();
                                      
                                      const permission = SECRETARY_PERMISSIONS.find(
                                        (p) => p.id === permString
                                      );
                                      
                                      return (
                                        <Badge key={permString} variant="secondary">
                                          {permission?.label || permString}
                                        </Badge>
                                      );
                                    });
                                  }
                                }
                              } catch (e) {
                                // If parsing fails, fall back to displaying the raw string
                                console.warn("Failed to parse permissions:", e);
                              }
                              return <Badge variant="outline">لا توجد صلاحيات</Badge>;
                            })()
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPermissions(secretary)}
                          >
                            <Edit className="ml-1 h-4 w-4" />
                            الصلاحيات
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSecretary(secretary)}
                          >
                            <Edit className="ml-1 h-4 w-4" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSecretary(secretary.user_id)}
                          >
                            <Trash2 className="ml-1 h-4 w-4" />
                            حذف
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          ) : ( <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">مفيش سكرتاريه</h3>
              <p className="text-muted-foreground mb-4">
                ضيف سكرتير جديد للعيادة
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="ml-2 h-4 w-4" />
                ضيف سكرتير
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Secretary Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة سكرتير جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                value={newSecretary.name}
                onChange={(e) =>
                  setNewSecretary({ ...newSecretary, name: e.target.value })
                }
                placeholder="أدخل اسم السكرتير"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={newSecretary.email}
                onChange={(e) =>
                  setNewSecretary({ ...newSecretary, email: e.target.value })
                }
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={newSecretary.phone}
                onChange={(e) =>
                  setNewSecretary({ ...newSecretary, phone: e.target.value })
                }
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleAddSecretary}>إضافة السكرتير</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Secretary Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات السكرتير</DialogTitle>
          </DialogHeader>
          {selectedSecretary && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم</Label>
                <Input
                  id="edit-name"
                  value={selectedSecretary.name}
                  onChange={(e) =>
                    setSelectedSecretary({
                      ...selectedSecretary,
                      name: e.target.value,
                    })
                  }
                  placeholder="أدخل اسم السكرتير"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedSecretary.email}
                  onChange={(e) =>
                    setSelectedSecretary({
                      ...selectedSecretary,
                      email: e.target.value,
                    })
                  }
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">رقم الهاتف</Label>
                <Input
                  id="edit-phone"
                  value={selectedSecretary.phone || ""}
                  onChange={(e) =>
                    setSelectedSecretary({
                      ...selectedSecretary,
                      phone: e.target.value,
                    })
                  }
                  placeholder="أدخل رقم الهاتف"
                />
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground">
                <p>معرف المستخدم: {selectedSecretary.user_id}</p>
                <p>
                  تاريخ التسجيل:{" "}
                  {new Date(selectedSecretary.created_at).toLocaleDateString(
                    "ar-EG"
                  )}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button onClick={handleUpdateSecretary}>حفظ التغييرات</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <SecretaryPermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        secretary={selectedSecretary}
        selectedPermissions={selectedPermissions}
        onPermissionChange={handlePermissionChange}
        onSave={handleSavePermissions}
      />
    </div>
  );
}