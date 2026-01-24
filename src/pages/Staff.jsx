import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table-primitives";
import { Badge } from "../components/ui/badge";
import { SkeletonLine } from "../components/ui/skeleton";
import { 
  UserPlus, 
  User, 
  Phone, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  Search, 
  UserCog, 
  Filter, 
  CheckCircle,
  Calendar
} from "lucide-react";
import useClinicSecretaries from "../features/clinic/useClinicSecretaries";
import useClinic from "../features/auth/useClinic";
import { useAuth } from "../features/auth/AuthContext";
import useAddSecretary from "../features/clinic/useAddSecretary";
import useUpdateSecretary from "../features/clinic/useUpdateSecretary";
import useDeleteSecretary from "../features/clinic/useDeleteSecretary";
import useUpdateSecretaryPermissions from "../features/clinic/useUpdateSecretaryPermissions";
import { SECRETARY_PERMISSIONS } from "../features/clinic/clinicUtils";
import { toast } from "react-hot-toast";
import SortableStat from "../components/ui/sortable-stat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";

// --- StatCard Component (Copied from PatientsPage) ---
function StatCard({ icon: Icon, label, value, isLoading, iconColorClass = "bg-primary/10 text-primary", onClick, active }) {
  return (
    <Card 
      className={`bg-card/70 h-full transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-accent/50' : ''} ${active ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div className={`size-8 rounded-[calc(var(--radius)-4px)] grid place-items-center ${iconColorClass}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {isLoading ? (
            <SkeletonLine className="h-4 w-8" />
          ) : (
            <div className="text-lg font-semibold text-black">{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Staff() {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  
  // -- Data Fetching --
  const {
    data: secretaries,
    isLoading,
    isError,
  } = useClinicSecretaries(user?.clinic_id);
  
  const { mutate: addSecretary } = useAddSecretary();
  const { mutate: updateSecretary } = useUpdateSecretary();
  const { mutate: deleteSecretary } = useDeleteSecretary();
  const { mutate: updatePermissions } = useUpdateSecretaryPermissions();

  // -- UI State --
  const [query, setQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [addStaffStep, setAddStaffStep] = useState(1);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [createdSecretaryInfo, setCreatedSecretaryInfo] = useState(null);
  
  // -- Form State --
  const [newSecretary, setNewSecretary] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    permissions: ["dashboard", "calendar", "patients"],
  });

  // -- Stats Ordering --
  const defaultOrder = ["total", "new", "full_access", "limited"];
  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("staff_stats_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load stats order", e);
    }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem("staff_stats_order", JSON.stringify(cardsOrder));
  }, [cardsOrder]);

  const moveCard = useCallback((dragIndex, hoverIndex) => {
    setCardsOrder((prevCards) => {
      const newCards = [...prevCards];
      const draggedCard = newCards[dragIndex];
      newCards.splice(dragIndex, 1);
      newCards.splice(hoverIndex, 0, draggedCard);
      return newCards;
    });
  }, []);

  // -- Filtering Logic --
  const filteredSecretaries = useMemo(() => {
    if (!secretaries) return [];
    return secretaries.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase()) ||
      (s.phone && s.phone.includes(query))
    );
  }, [secretaries, query]);

  // -- Stats Calculation --
  const stats = useMemo(() => {
    if (!secretaries) return { total: 0, withPhone: 0, highPerms: 0, lowPerms: 0 };
    return {
      total: secretaries.length,
      withPhone: secretaries.filter(s => s.phone).length,
      highPerms: secretaries.filter(s => {
         const perms = typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions;
         return Array.isArray(perms) && perms.length >= 4;
      }).length,
      lowPerms: secretaries.filter(s => {
         const perms = typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions;
         return !Array.isArray(perms) || perms.length < 4;
      }).length
    };
  }, [secretaries]);

  // -- Handlers --
  const handleAddSecretary = () => {
    if (!newSecretary.name || !newSecretary.email || !newSecretary.password) {
      toast.error("لازم تدخل الاسم والإيميل وكلمة السر");
      return;
    }
    if (newSecretary.password.length < 6) {
      toast.error("كلمة السر لازم 6 أحرف على الأقل");
      return;
    }
    addSecretary({
        name: newSecretary.name,
        email: newSecretary.email,
        password: newSecretary.password,
        phone: newSecretary.phone,
        clinicId: user?.clinic_id,
        permissions: newSecretary.permissions,
      },
      {
        onSuccess: () => {
          setCreatedSecretaryInfo({
            email: newSecretary.email,
            password: newSecretary.password,
            name: newSecretary.name,
          });
          setIsAddDialogOpen(false);
          setAddStaffStep(1);
          setIsSuccessDialogOpen(true);
          setNewSecretary({ 
            name: "", email: "", password: "", phone: "", 
            permissions: ["dashboard", "calendar", "patients"],
          });
        },
      }
    );
  };

  const handleNextStep = () => {
    if (addStaffStep === 1) {
      if (!newSecretary.name.trim()) { toast.error("لازم تدخل الاسم"); return; }
      setAddStaffStep(2);
    } else if (addStaffStep === 2) {
      if (!newSecretary.email.trim()) { toast.error("لازم تدخل الإيميل"); return; }
      if (!newSecretary.password.trim()) { toast.error("لازم تدخل كلمة السر"); return; }
      if (newSecretary.password.length < 6) { toast.error("كلمة السر لازم 6 أحرف على الأقل"); return; }
      setAddStaffStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (addStaffStep > 1) setAddStaffStep(addStaffStep - 1);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setAddStaffStep(1);
    setNewSecretary({ name: "", email: "", password: "", phone: "", permissions: ["dashboard", "calendar", "patients"] });
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
    let permissions = [];
    if (typeof secretary.permissions === 'string') {
      try { permissions = JSON.parse(secretary.permissions); } catch (e) { permissions = []; }
    } else if (Array.isArray(secretary.permissions)) {
      permissions = secretary.permissions;
    }
    const permissionIds = permissions.map(perm => typeof perm === 'object' && perm !== null ? perm.id : perm).map(id => String(id).trim());
    setSelectedPermissions(permissionIds);
    setIsPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (permissionId) => {
    setSelectedPermissions((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(permissionId) ? current.filter(p => p !== permissionId) : [...current, permissionId];
    });
  };

  const handleNewSecretaryPermissionChange = (permissionId) => {
    setNewSecretary((prev) => {
      const current = Array.isArray(prev.permissions) ? prev.permissions : [];
      return {
        ...prev,
        permissions: current.includes(permissionId) ? current.filter(p => p !== permissionId) : [...current, permissionId],
      };
    });
  };

  const handleSavePermissions = () => {
    updatePermissions({
      secretaryId: selectedSecretary.user_id,
      permissions: selectedPermissions,
    });
    setIsPermissionsDialogOpen(false);
    setSelectedSecretary(null);
    setSelectedPermissions([]);
  };

  // -- Render Helper for Permissions Badge --
  const renderPermissionsBadges = (secretary) => {
     let perms = [];
     if (typeof secretary.permissions === 'string') {
        try { perms = JSON.parse(secretary.permissions); } catch (e) {}
     } else if (Array.isArray(secretary.permissions)) {
        perms = secretary.permissions;
     }
     
     if (!Array.isArray(perms) || perms.length === 0) return <Badge variant="outline">مفيش صلاحيات</Badge>;
     
     return (
       <div className="flex flex-wrap gap-1">
         {perms.slice(0, 3).map(p => {
            const pid = typeof p === 'object' ? p.id : p;
            const pObj = SECRETARY_PERMISSIONS.find(sp => sp.id === String(pid).trim());
            return (
              <Badge key={String(pid)} variant="secondary" className="text-[10px] h-5 px-2">
                {pObj?.label || pid}
              </Badge>
            );
         })}
         {perms.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{perms.length - 3}</span>
         )}
       </div>
     );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ادارة موظفينك</h1>
            <p className="text-sm text-muted-foreground">{stats.total} موظف اجمالا</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            احصائيات الموظفين
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cardsOrder.map((key, index) => {
            let content;
            switch (key) {
              case "total":
                content = (
                  <StatCard
                    icon={UserCog}
                    label="إجمالي الموظفين"
                    value={stats.total}
                    isLoading={isLoading}
                    active={false}
                  />
                );
                break;
              case "new":
                content = (
                  <StatCard
                    icon={Phone}
                    label="لديهم رقم هاتف"
                    value={stats.withPhone}
                    isLoading={isLoading}
                    iconColorClass="bg-blue-500/10 text-blue-600"
                    active={false}
                  />
                );
                break;
              case "full_access":
                content = (
                  <StatCard
                    icon={Shield}
                    label="صلاحيات واسعة"
                    value={stats.highPerms}
                    isLoading={isLoading}
                    iconColorClass="bg-green-500/10 text-green-600"
                    active={false}
                  />
                );
                break;
              case "limited":
                content = (
                  <StatCard
                    icon={User}
                    label="صلاحيات محدودة"
                    value={stats.lowPerms}
                    isLoading={isLoading}
                    iconColorClass="bg-orange-500/10 text-orange-600"
                    active={false}
                  />
                );
                break;
              default:
                return null;
            }
            return (
              <SortableStat key={key} id={key} index={index} moveCard={moveCard} type="STAFF_STAT">
                {content}
              </SortableStat>
            );
          })}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="mb-4">
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
          <Input
            className="w-full pr-10 h-10 md:h-11 bg-background border-border focus:border-primary text-sm md:text-base"
            placeholder="دور على الموظف بالاسم أو الإيميل"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-2 md:flex gap-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="h-10 md:h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base col-span-2 md:col-span-1"
          >
            <UserPlus className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            موظف جديد
          </Button>
        </div>
      </div>

      {/* Staff List (Mobile Cards & Desktop Table) */}
      <Card className="bg-card/70 border-none shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
             <div className="space-y-4 p-4">
               {[1, 2, 3].map((i) => <SkeletonLine key={i} height={60} />)}
             </div>
          ) : isError ? (
             <div className="text-center py-8 text-destructive">حدث خطأ في تحميل البيانات</div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden space-y-3">
                {filteredSecretaries.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCog className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-foreground mb-2">مفيش موظفين</p>
                  </div>
                ) : (
                  filteredSecretaries.map((secretary) => (
                    <Card key={secretary.user_id} className="mb-4 border-border overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-lg truncate">{secretary.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{secretary.email}</p>
                            <div className="mt-2">
                               {renderPermissionsBadges(secretary)}
                            </div>
                          </div>
                          <Badge variant="secondary">سكرتير</Badge>
                        </div>

                        <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
                           <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-primary" />
                              <span className="font-medium text-foreground">{secretary.phone || "-"}</span>
                           </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                           <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenPermissions(secretary)}>
                              <Shield className="w-4 h-4 ml-2" />
                              الصلاحيات
                           </Button>
                           <Button variant="outline" size="sm" onClick={() => handleEditSecretary(secretary)}>
                              <Edit className="w-4 h-4" />
                           </Button>
                           <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteSecretary(secretary.user_id)}>
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block border border-border rounded-lg overflow-hidden shadow-sm bg-card">
                 <Table>
                    <TableHeader>
                       <TableRow>
                          <TableHead>الاسم</TableHead>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead>الهاتف</TableHead>
                          <TableHead>الصلاحيات</TableHead>
                          <TableHead className="text-right">الإجراءات</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredSecretaries.map((secretary) => (
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
                             <TableCell>{renderPermissionsBadges(secretary)}</TableCell>
                             <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                   <Button variant="outline" size="sm" onClick={() => handleOpenPermissions(secretary)}>
                                      <Shield className="ml-1 h-4 w-4" />
                                      الصلاحيات
                                   </Button>
                                   <Button variant="outline" size="sm" onClick={() => handleEditSecretary(secretary)}>
                                      <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button variant="outline" size="sm" onClick={() => handleDeleteSecretary(secretary.user_id)} className="text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                   </Button>
                                </div>
                             </TableCell>
                          </TableRow>
                       ))}
                       {filteredSecretaries.length === 0 && (
                          <TableRow>
                             <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                مفيش موظفين بيطابقوا بحثك
                             </TableCell>
                          </TableRow>
                       )}
                    </TableBody>
                 </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Secretary Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إضافة سكرتير جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {addStaffStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم بالكامل</Label>
                  <Input
                    placeholder="اسم السكرتير"
                    value={newSecretary.name}
                    onChange={(e) => setNewSecretary({ ...newSecretary, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الموبايل</Label>
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={newSecretary.phone}
                    onChange={(e) => setNewSecretary({ ...newSecretary, phone: e.target.value })}
                  />
                </div>
              </div>
            )}
            {addStaffStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newSecretary.email}
                    onChange={(e) => setNewSecretary({ ...newSecretary, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    placeholder="******"
                    value={newSecretary.password}
                    onChange={(e) => setNewSecretary({ ...newSecretary, password: e.target.value })}
                  />
                </div>
              </div>
            )}
            {addStaffStep === 3 && (
              <div className="space-y-4">
                <Label>الصلاحيات</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {SECRETARY_PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`new-perm-${perm.id}`}
                        checked={newSecretary.permissions.includes(perm.id)}
                        onCheckedChange={() => handleNewSecretaryPermissionChange(perm.id)}
                      />
                      <label htmlFor={`new-perm-${perm.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
             {addStaffStep > 1 && (
               <Button variant="outline" onClick={handlePreviousStep}>رجوع</Button>
             )}
             {addStaffStep < 3 ? (
               <Button onClick={handleNextStep} className="w-full sm:w-auto">التالي</Button>
             ) : (
               <Button onClick={handleAddSecretary} className="w-full sm:w-auto">إضافة السكرتير</Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Secretary Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات السكرتير</DialogTitle>
          </DialogHeader>
          {selectedSecretary && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input
                  value={selectedSecretary.name}
                  onChange={(e) => setSelectedSecretary({ ...selectedSecretary, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  value={selectedSecretary.email}
                  onChange={(e) => setSelectedSecretary({ ...selectedSecretary, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={selectedSecretary.phone || ""}
                  onChange={(e) => setSelectedSecretary({ ...selectedSecretary, phone: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateSecretary}>حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الصلاحيات</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {SECRETARY_PERMISSIONS.map((perm) => (
                <div key={perm.id} className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-muted rounded-md">
                  <Checkbox
                    id={`perm-${perm.id}`}
                    checked={selectedPermissions.includes(perm.id)}
                    onCheckedChange={() => handlePermissionChange(perm.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor={`perm-${perm.id}`} className="text-sm font-medium leading-none">
                      {perm.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSavePermissions}>حفظ الصلاحيات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">بيانات الدخول:</p>
              <div className="flex justify-between items-center bg-background p-2 rounded border">
                <span className="text-sm text-muted-foreground">البريد:</span>
                <span className="font-mono select-all">{createdSecretaryInfo?.email}</span>
              </div>
              <div className="flex justify-between items-center bg-background p-2 rounded border">
                <span className="text-sm text-muted-foreground">كلمة السر:</span>
                <span className="font-mono select-all">{createdSecretaryInfo?.password}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              يرجى نسخ هذه البيانات وإرسالها للسكرتير. لن تظهر كلمة المرور مرة أخرى.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuccessDialogOpen(false)} className="w-full">
              تم، نسخت البيانات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
