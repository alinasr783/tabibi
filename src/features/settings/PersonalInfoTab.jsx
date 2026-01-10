import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../auth/AuthContext";
import useUpdateProfile from "./useUpdateProfile";
import useClinic from "../auth/useClinic";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClinic } from "../../services/apiClinic";
import toast from "react-hot-toast";
import { Plus, X, Upload, FileText, Trash2, GraduationCap, Award, User, Loader2 } from "lucide-react";
import supabase from "../../services/supabase";

export default function PersonalInfoTab() {
  const { user } = useAuth();
  const { mutate: updateProfile, isPending: isProfilePending } = useUpdateProfile();
  
  // Clinic data hooks
  const { data: clinic, isLoading: isClinicLoading } = useClinic();
  const queryClient = useQueryClient();
  
  const { mutate: updateClinicData, isPending: isClinicPending } = useMutation({
    mutationFn: updateClinic,
    onSuccess: () => {
      queryClient.invalidateQueries(["clinic"]);
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء تحديث بيانات العيادة: " + error.message);
    }
  });
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    clinicName: "",
    clinicAddress: "",
    bio: "",
    education: [],
    certificates: [],
    avatar_url: ""
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
        education: Array.isArray(user.education) ? user.education : [],
        certificates: Array.isArray(user.certificates) ? user.certificates : [],
        avatar_url: user.avatar_url || ""
      }));
    }
  }, [user]);

  useEffect(() => {
    if (clinic && user?.role === 'doctor') {
      setFormData(prev => ({
        ...prev,
        clinicName: clinic.name || "",
        clinicAddress: clinic.address || ""
      }));
    }
  }, [clinic, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload = async (e) => {
    try {
      setUploadingAvatar(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Math.random()}.${fileExt}`;
      const filePath = `${user.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("تم رفع الصورة الشخصية بنجاح");
    } catch (error) {
      toast.error("فشل رفع الصورة: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCertificateUpload = async (e) => {
    try {
      setUploadingCertificate(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `${user.user_id}/certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(filePath);

      const newCertificate = {
        name: file.name,
        url: publicUrl,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };

      setFormData(prev => ({
        ...prev,
        certificates: [...prev.certificates, newCertificate]
      }));
      toast.success("تم رفع الشهادة بنجاح");
    } catch (error) {
      toast.error("فشل رفع الشهادة: " + error.message);
    } finally {
      setUploadingCertificate(false);
    }
  };

  const removeCertificate = (index) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { school: "", degree: "", year: "" }]
    }));
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const handleEducationChange = (index, field, value) => {
    const newEducation = [...formData.education];
    newEducation[index][field] = value;
    setFormData(prev => ({ ...prev, education: newEducation }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update profile
    updateProfile({
      name: formData.name,
      phone: formData.phone,
      bio: formData.bio,
      avatar_url: formData.avatar_url,
      education: formData.education,
      certificates: formData.certificates
    });
    
    // Update clinic if doctor and fields are changed
    if (user?.role === 'doctor') {
      updateClinicData({
        name: formData.clinicName,
        address: formData.clinicAddress
      });
    }
  };

  const isPending = isProfilePending || isClinicPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base sm:text-lg font-semibold">البيانات الشخصية</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          قم بتحديث معلومات حسابك الشخصية{user?.role === 'doctor' ? ' وبيانات العيادة' : ''}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                  {formData.avatar_url ? (
                    <img 
                      src={formData.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <Label 
                  htmlFor="avatar-upload" 
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-right">
                <h3 className="font-medium">الصورة الشخصية</h3>
                <p className="text-sm text-muted-foreground">
                  اختر صورة واضحة تظهر وجهك بشكل جيد. الصيغ المدعومة: JPG, PNG.
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">الاسم</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="أدخل اسمك"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm">رقم الهاتف</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="أدخل رقم هاتفك"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email" className="text-sm">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="text-sm bg-muted/50"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm">نبذة تعريفية (Bio)</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="اكتب نبذة مختصرة عن خبراتك وتخصصك..."
                className="text-sm min-h-[100px]"
              />
            </div>

            {/* Education Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-semibold">المؤهلات العلمية</h3>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addEducation}
                  className="h-8 text-xs"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  إضافة مؤهل
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.education.map((edu, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-12 items-start bg-muted/30 p-3 rounded-md relative group">
                    <div className="sm:col-span-5 space-y-1">
                      <Input
                        placeholder="اسم الجامعة / المؤسسة"
                        value={edu.school}
                        onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-4 space-y-1">
                      <Input
                        placeholder="الدرجة العلمية (مثال: دكتوراه)"
                        value={edu.degree}
                        onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Input
                        placeholder="سنة التخرج"
                        value={edu.year}
                        onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEducation(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {formData.education.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-md border border-dashed">
                    لم يتم إضافة مؤهلات علمية بعد
                  </p>
                )}
              </div>
            </div>

            {/* Certificates Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-semibold">الشهادات والوثائق</h3>
                </div>
                <div className="relative">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    disabled={uploadingCertificate}
                  >
                    {uploadingCertificate ? (
                      <Loader2 className="w-3 h-3 ml-1 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3 ml-1" />
                    )}
                    رفع شهادة
                  </Button>
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleCertificateUpload}
                    disabled={uploadingCertificate}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {formData.certificates.map((cert, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border">
                    <div className="h-10 w-10 rounded bg-background flex items-center justify-center border flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={cert.name}>
                        {cert.name}
                      </p>
                      <a 
                        href={cert.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        عرض الملف
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCertificate(index)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {formData.certificates.length === 0 && (
                  <div className="sm:col-span-2 text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-md border border-dashed">
                    لم يتم رفع أي شهادات بعد
                  </div>
                )}
              </div>
            </div>

            {user?.role === 'doctor' && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3">بيانات العيادة</h3>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="clinicName" className="text-sm">اسم العيادة</Label>
                    <Input
                      id="clinicName"
                      name="clinicName"
                      value={formData.clinicName}
                      onChange={handleChange}
                      placeholder="أدخل اسم العيادة"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="clinicAddress" className="text-sm">عنوان العيادة</Label>
                    <Input
                      id="clinicAddress"
                      name="clinicAddress"
                      value={formData.clinicAddress}
                      onChange={handleChange}
                      placeholder="أدخل عنوان العيادة"
                      className="text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 sm:pt-4 border-t mt-4">
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : "حفظ التغييرات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}