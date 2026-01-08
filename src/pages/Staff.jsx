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
  DialogFooter,
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
import { Checkbox } from "../components/ui/checkbox";
import { SkeletonLine } from "../components/ui/skeleton";
import { Plus, Edit, Trash2, UserPlus, User, Phone, Copy, CheckCircle, AlertTriangle } from "lucide-react";
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
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [addStaffStep, setAddStaffStep] = useState(1); // Step: 1=Personal, 2=Account, 3=Permissions
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [createdSecretaryInfo, setCreatedSecretaryInfo] = useState(null);
  const [newSecretary, setNewSecretary] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    permissions: ["dashboard", "calendar", "patients"], // Default permissions
  });

  const handleAddSecretary = () => {
    if (!newSecretary.name || !newSecretary.email || !newSecretary.password) {
      toast.error("لازم تدخل الاسم والإيميل وكلمة السر");
      return;
    }
    
    if (newSecretary.password.length < 6) {
      toast.error("كلمة السر لازم 6 أحرف على الأقل");
      return;
    }
    
    addSecretary(
      {
        name: newSecretary.name,
        email: newSecretary.email,
        password: newSecretary.password,
        phone: newSecretary.phone,
        clinicId: user?.clinic_id,
        permissions: newSecretary.permissions,
      },
      {
        onSuccess: () => {
          // Save info for success dialog
          setCreatedSecretaryInfo({
            email: newSecretary.email,
            password: newSecretary.password,
            name: newSecretary.name,
          });
          setIsAddDialogOpen(false);
          setAddStaffStep(1); // Reset to first step
          setIsSuccessDialogOpen(true);
          setNewSecretary({ 
            name: "", 
            email: "", 
            password: "",
            phone: "",
            permissions: ["dashboard", "calendar", "patients"],
          });
        },
      }
    );
  };

  const handleNextStep = () => {
    // Validate current step before moving forward
    if (addStaffStep === 1) {
      if (!newSecretary.name.trim()) {
        toast.error("لازم تدخل الاسم");
        return;
      }
      setAddStaffStep(2);
    } else if (addStaffStep === 2) {
      if (!newSecretary.email.trim()) {
        toast.error("لازم تدخل الإيميل");
        return;
      }
      if (!newSecretary.password.trim()) {
        toast.error("لازم تدخل كلمة السر");
        return;
      }
      if (newSecretary.password.length < 6) {
        toast.error("كلمة السر لازم 6 أحرف على الأقل");
        return;
      }
      setAddStaffStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (addStaffStep > 1) {
      setAddStaffStep(addStaffStep - 1);
    }
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setAddStaffStep(1);
    setNewSecretary({ 
      name: "", 
      email: "", 
      password: "",
      phone: "",
      permissions: ["dashboard", "calendar", "patients"],
    });
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
    
    // Parse permissions - handle both string (JSON) and array formats
    let permissions = [];
    
    if (typeof secretary.permissions === 'string') {
      try {
        permissions = JSON.parse(secretary.permissions);
      } catch (e) {
        console.warn('Failed to parse permissions:', e);
        permissions = [];
      }
    } else if (Array.isArray(secretary.permissions)) {
      permissions = secretary.permissions;
    }
    
    // Extract permission IDs if they're objects
    const permissionIds = permissions.map(perm => {
      return typeof perm === 'object' && perm !== null ? perm.id : perm;
    }).map(id => String(id).trim());
    
    console.log('Setting permissions for secretary:', secretary.name, permissionIds);
    setSelectedPermissions(permissionIds);
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

  const handleNewSecretaryPermissionChange = (permissionId) => {
    setNewSecretary((prev) => {
      const currentPermissions = Array.isArray(prev.permissions) ? prev.permissions : [];

      if (currentPermissions.includes(permissionId)) {
        return {
          ...prev,
          permissions: currentPermissions.filter((p) => p !== permissionId),
        };
      } else {
        return {
          ...prev,
          permissions: [...currentPermissions, permissionId],
        };
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
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
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
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-[var(--radius)]">
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
                  <div key={secretary.user_id} className="mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
                    <div className="p-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-lg truncate">{secretary.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{secretary.email}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 p-3">
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
                    </div>
                  </div>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">لا يوجد موظفين</h3>
              <p className="text-muted-foreground mb-4">أضف سكرتير لمساعدتك في إدارة العيادة</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="ml-2 h-4 w-4" />
                إضافة سكرتير
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Secretary Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إضافة سكرتير جديد</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Steps indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${addStaffStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
              <div className={`w-12 h-1 bg-muted ${addStaffStep >= 2 ? 'bg-primary' : ''}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${addStaffStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
              <div className={`w-12 h-1 bg-muted ${addStaffStep >= 3 ? 'bg-primary' : ''}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${addStaffStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
            </div>

            {addStaffStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم</Label>
                  <Input 
                    id="name" 
                    value={newSecretary.name}
                    onChange={(e) => setNewSecretary({...newSecretary, name: e.target.value})}
                    placeholder="اسم السكرتير" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
                  <Input 
                    id="phone" 
                    value={newSecretary.phone}
                    onChange={(e) => setNewSecretary({...newSecretary, phone: e.target.value})}
                    placeholder="01xxxxxxxxx" 
                  />
                </div>
              </div>
            )}

            {addStaffStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={newSecretary.email}
                    onChange={(e) => setNewSecretary({...newSecretary, email: e.target.value})}
                    placeholder="email@example.com" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={newSecretary.password}
                    onChange={(e) => setNewSecretary({...newSecretary, password: e.target.value})}
                    placeholder="******" 
                  />
                </div>
              </div>
            )}

            {addStaffStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Label>الصلاحيات</Label>
                <div className="grid grid-cols-1 gap-2 border rounded-[var(--radius)] p-3 max-h-[250px] overflow-y-auto">
                  {SECRETARY_PERMISSIONS.map((permission) => (
                    <div key={permission.id} className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded-[var(--radius)]">
                      <Checkbox 
                        id={`new-${permission.id}`} 
                        checked={newSecretary.permissions.includes(permission.id)}
                        onCheckedChange={() => handleNewSecretaryPermissionChange(permission.id)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`new-${permission.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full gap-2">
              {addStaffStep > 1 ? (
                <Button variant="outline" onClick={handlePreviousStep} className="w-[25%]">
                  السابق
                </Button>
              ) : (
                <Button variant="outline" onClick={handleCloseAddDialog} className="w-[25%]">
                  إلغاء
                </Button>
              )}
              
              {addStaffStep < 3 ? (
                <Button onClick={handleNextStep} className="w-[75%]">
                  التالي
                </Button>
              ) : (
                <Button onClick={handleAddSecretary} disabled={!newSecretary.name || !newSecretary.email || !newSecretary.password} className="w-[75%]">
                  إضافة
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات السكرتير</DialogTitle>
          </DialogHeader>
          {selectedSecretary && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم</Label>
                <Input 
                  id="edit-name" 
                  value={selectedSecretary.name}
                  onChange={(e) => setSelectedSecretary({...selectedSecretary, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input 
                  id="edit-email" 
                  value={selectedSecretary.email}
                  onChange={(e) => setSelectedSecretary({...selectedSecretary, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">رقم الهاتف</Label>
                <Input 
                  id="edit-phone" 
                  value={selectedSecretary.phone || ""}
                  onChange={(e) => setSelectedSecretary({...selectedSecretary, phone: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button onClick={handleUpdateSecretary} className="w-[75%]">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      {selectedSecretary && (
        <SecretaryPermissionsDialog 
          isOpen={isPermissionsDialogOpen}
          onClose={() => setIsPermissionsDialogOpen(false)}
          secretaryName={selectedSecretary.name}
          selectedPermissions={selectedPermissions}
          onPermissionChange={handlePermissionChange}
          onSave={handleSavePermissions}
        />
      )}

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              تم إضافة السكرتير بنجاح
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-[var(--radius)] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">البريد الإلكتروني:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{createdSecretaryInfo?.email}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecretaryInfo?.email);
                      toast.success("تم نسخ البريد الإلكتروني");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">كلمة المرور:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{createdSecretaryInfo?.password}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecretaryInfo?.password);
                      toast.success("تم نسخ كلمة المرور");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-[var(--radius)] text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>يرجى نسخ هذه البيانات وإرسالها للموظف. لن تتمكن من رؤية كلمة المرور مرة أخرى.</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsSuccessDialogOpen(false)} className="w-full">
              تم، فهمت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
