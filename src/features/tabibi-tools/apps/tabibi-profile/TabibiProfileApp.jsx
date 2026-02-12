import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/AuthContext";
import useClinic from "../../../auth/useClinic";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../components/ui/badge";
import { Separator } from "../../../../components/ui/separator";
import { ExternalLink, Copy, Check, User, MapPin, Phone, Stethoscope, Clock, Save, Loader2, Upload, Trash2, Plus, Award, GraduationCap, FileText, QrCode, Download, MessageCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import useUpdateProfile from "../../../settings/useUpdateProfile";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { updateClinic } from "../../../../services/apiClinic";
import supabase from "../../../../services/supabase";
import WorkingHours from "../../../clinic/WorkingHours";
import QRCode from "react-qr-code";

export default function TabibiProfileApp() {
  const { user } = useAuth();
  const { data: clinic, isLoading: isClinicLoading } = useClinic();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: updateProfile, isPending: isProfilePending } = useUpdateProfile();
  
  const { mutate: updateClinicData, isPending: isClinicPending } = useMutation({
    mutationFn: updateClinic,
    onSuccess: () => {
      queryClient.invalidateQueries(["clinic"]);
      toast.success("تم تحديث بيانات العيادة بنجاح");
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء تحديث بيانات العيادة");
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['clinic-stats', clinic?.clinic_uuid],
    queryFn: async () => {
        if (!clinic?.clinic_uuid) return { bookingsLastMonth: 0 };
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinic.clinic_uuid)
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        return { bookingsLastMonth: count || 0 };
    },
    enabled: !!clinic?.clinic_uuid
  });

  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    phone: "",
    specialty: "",
    avatar_url: "",
    banner_url: "",
    education: [],
    certificates: [],
    contacts: [],
    clinicName: "",
    clinicAddress: "",
    bookingPrice: "",
    availableTime: {
      saturday: { start: "09:00", end: "17:00", off: false },
      sunday: { start: "09:00", end: "17:00", off: false },
      monday: { start: "09:00", end: "17:00", off: false },
      tuesday: { start: "09:00", end: "17:00", off: false },
      wednesday: { start: "09:00", end: "17:00", off: false },
      thursday: { start: "09:00", end: "17:00", off: false },
      friday: { start: "09:00", end: "17:00", off: true },
    }
  });

  useEffect(() => {
    if (user && clinic) {
      setFormData({
        name: user.name || "",
        bio: user.bio || "",
        phone: user.phone || "",
        specialty: user.specialty || "طبيب عام",
        avatar_url: user.avatar_url || "",
        banner_url: user.banner_url || "",
        education: user.education || [],
        certificates: user.certificates || [],
        contacts: Array.isArray(user.contacts) ? user.contacts : [],
        clinicName: clinic.name || "",
        clinicAddress: clinic.address || "",
        bookingPrice: clinic.booking_price || "",
        availableTime: clinic.available_time || {
          saturday: { start: "09:00", end: "17:00", off: false },
          sunday: { start: "09:00", end: "17:00", off: false },
          monday: { start: "09:00", end: "17:00", off: false },
          tuesday: { start: "09:00", end: "17:00", off: false },
          wednesday: { start: "09:00", end: "17:00", off: false },
          thursday: { start: "09:00", end: "17:00", off: false },
          friday: { start: "09:00", end: "17:00", off: true },
        }
      });
    }
  }, [user, clinic]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTimeChange = (day, type, value) => {
    setFormData(prev => ({
      ...prev,
      availableTime: {
        ...prev.availableTime,
        [day]: {
          ...prev.availableTime[day],
          [type]: value,
        },
      },
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      availableTime: {
        ...prev.availableTime,
        [day]: {
          ...prev.availableTime[day],
          off: !prev.availableTime[day].off,
        },
      },
    }));
  };

  const getDayName = (day) => {
    const days = {
      saturday: "السبت",
      sunday: "الأحد",
      monday: "الإثنين",
      tuesday: "الثلاثاء",
      wednesday: "الأربعاء",
      thursday: "الخميس",
      friday: "الجمعة",
    };
    return days[day] || day;
  };

  const handleImageUpload = async (event, type) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      if (type === 'banner') setUploadingBanner(true);
      else setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const filePath = `${user.user_id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(filePath);

      // IMPORTANT: Update database immediately to persist the change
      const updateField = type === 'banner' ? 'banner_url' : 'avatar_url';
      
      const { error: dbError } = await supabase
        .from('users')
        .update({ [updateField]: publicUrl })
        .eq('user_id', user.user_id);

      if (dbError) throw dbError;

      setFormData(prev => ({ 
        ...prev, 
        [updateField]: publicUrl 
      }));
      
      toast.success(type === 'banner' ? "تم رفع الغلاف وحفظه بنجاح" : "تم رفع الصورة وحفظها بنجاح");

    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء رفع الصورة");
    } finally {
      if (type === 'banner') setUploadingBanner(false);
      else setUploadingAvatar(false);
    }
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { school: '', degree: '', year: '' }]
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

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { type: "phone", value: "" }]
    }));
  };

  const removeContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleContactChange = (index, field, value) => {
    const newContacts = [...formData.contacts];
    newContacts[index][field] = value;
    setFormData(prev => ({ ...prev, contacts: newContacts }));
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("profile-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-Profile-${formData.name || 'doctor'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("تم تحميل رمز QR بنجاح");
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCertificateUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setUploadingCertificate(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `cert-${Math.random()}.${fileExt}`;
      const filePath = `${user.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(filePath);

      const newCertificates = [...formData.certificates, { name: file.name, url: publicUrl }];

      const { error: dbError } = await supabase
        .from('users')
        .update({ certificates: newCertificates })
        .eq('user_id', user.user_id);

      if (dbError) throw dbError;

      setFormData(prev => ({ 
        ...prev, 
        certificates: newCertificates
      }));
      
      toast.success("تم رفع الشهادة بنجاح");

    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء رفع الشهادة");
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

  const handleSave = () => {
    // Update User Profile
    updateProfile({
      name: formData.name,
      bio: formData.bio,
      phone: formData.phone,
      specialty: formData.specialty,
      avatar_url: formData.avatar_url,
      banner_url: formData.banner_url,
      education: formData.education,
      certificates: formData.certificates,
      contacts: formData.contacts
    });

    // Update Clinic Data
    updateClinicData({
      name: formData.clinicName,
      address: formData.clinicAddress,
      booking_price: formData.bookingPrice,
      available_time: formData.availableTime
    });
  };

  const publicProfileUrl = clinic?.clinic_uuid 
    ? `${window.location.origin}/doctor-profile/${clinic.clinic_uuid}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("تم نسخ الرابط");
  };

  if (isClinicLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 md:p-4" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">Tabibi Profile</h1>
          <p className="text-muted-foreground">
            صفحتك التعريفية الخاصة على الإنترنت. شاركها مع مرضاك ليسهل عليهم الوصول إليك والحجز.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => window.open(publicProfileUrl, '_blank')} className="gap-2 flex-1 md:flex-none">
            <ExternalLink className="h-4 w-4" />
            عرض الصفحة
          </Button>
          <Button onClick={copyLink} className="gap-2 flex-1 md:flex-none">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stats Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">إحصائيات ظهورك</p>
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {stats?.bookingsLastMonth || 0}
                  <span className="text-sm font-normal text-gray-500">حجز في آخر 30 يوم</span>
                </h3>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          
          {/* Images Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                الصور والمظهر
              </CardTitle>
              <CardDescription>
                تخصيص الصور التي تظهر في ملفك الشخصي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/10">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                      {formData.avatar_url ? (
                        <img 
                          src={formData.avatar_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-muted-foreground" />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <Label 
                      htmlFor="avatar-upload-app" 
                      className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Upload className="w-3 h-3" />
                    </Label>
                    <Input
                      id="avatar-upload-app"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'avatar')}
                      disabled={uploadingAvatar}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-medium text-sm">الصورة الشخصية</h3>
                    <p className="text-xs text-muted-foreground">JPG, PNG</p>
                  </div>
                </div>

                {/* Banner */}
                <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/10">
                  <div className="relative group w-full h-24 rounded-md overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                    {formData.banner_url ? (
                      <img 
                        src={formData.banner_url} 
                        alt="Banner" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <span className="text-xs">لا يوجد غلاف</span>
                      </div>
                    )}
                    {uploadingBanner && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <Label 
                        htmlFor="banner-upload-app" 
                        className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                        >
                        <Upload className="w-4 h-4" />
                        تغيير الغلاف
                        </Label>
                    </div>
                    <Input
                      id="banner-upload-app"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'banner')}
                      disabled={uploadingBanner}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-medium text-sm">صورة الغلاف (Banner)</h3>
                    <p className="text-xs text-muted-foreground">مستحسن: 1200x400</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                البيانات الشخصية
              </CardTitle>
              <CardDescription>
                البيانات التي ستظهر للمرضى في أعلى صفحتك الشخصية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الدكتور</Label>
                  <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="د. احمد محمد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف للتواصل</Label>
                  <Input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    dir="ltr" 
                    className="text-right"
                  />
                </div>
              </div>

              {/* Multiple Contacts Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-semibold">أرقام تواصل إضافية</h3>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addContact}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    إضافة رقم
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="grid gap-3 sm:grid-cols-12 items-start bg-muted/30 p-3 rounded-md relative group">
                      <div className="sm:col-span-4 space-y-1">
                        <select
                          value={contact.type}
                          onChange={(e) => handleContactChange(index, 'type', e.target.value)}
                          className="w-full h-8 text-sm rounded-md border border-input bg-background px-3 py-1"
                        >
                          <option value="phone">اتصال فقط</option>
                          <option value="whatsapp">واتساب فقط</option>
                          <option value="both">اتصال وواتساب</option>
                        </select>
                      </div>
                      <div className="sm:col-span-7 space-y-1">
                        <Input
                          placeholder="رقم الهاتف (مثال: 01234567890)"
                          value={contact.value}
                          onChange={(e) => handleContactChange(index, 'value', e.target.value)}
                          className="h-8 text-sm"
                          type="tel"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeContact(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {formData.contacts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-md border border-dashed">
                      لم يتم إضافة أرقام تواصل إضافية بعد
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>التخصص</Label>
                <Input 
                  name="specialty" 
                  value={formData.specialty} 
                  onChange={handleChange} 
                  placeholder="مثال: استشاري طب وجراحة العيون"
                />
              </div>
              
              <div className="space-y-2">
                <Label>نبذة تعريفية (Bio)</Label>
                <Textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  placeholder="اكتب نبذة مختصرة عن خبراتك وشهاداتك..."
                  className="h-32 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Education Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                المؤهلات العلمية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.education.map((edu, index) => (
                <div key={index} className="flex gap-2 items-start bg-muted/20 p-3 rounded-lg border">
                  <div className="grid gap-3 flex-1 sm:grid-cols-3">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs">السنة</Label>
                      <Input 
                        value={edu.year} 
                        onChange={(e) => handleEducationChange(index, 'year', e.target.value)} 
                        placeholder="2010"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">الدرجة العلمية</Label>
                      <Input 
                        value={edu.degree} 
                        onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} 
                        placeholder="بكالوريوس الطب والجراحة"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <Label className="text-xs">الجامعة / المؤسسة</Label>
                      <Input 
                        value={edu.school} 
                        onChange={(e) => handleEducationChange(index, 'school', e.target.value)} 
                        placeholder="جامعة القاهرة"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEducation(index)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addEducation}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة مؤهل جديد
              </Button>
            </CardContent>
          </Card>

          {/* Certificates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                الشهادات والوثائق
              </CardTitle>
              <CardDescription>
                شهادات التقدير، التراخيص، والعضويات المهنية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <div className="relative">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 cursor-pointer"
                    disabled={uploadingCertificate}
                  >
                    {uploadingCertificate ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    رفع شهادة جديدة
                  </Button>
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleCertificateUpload}
                    disabled={uploadingCertificate}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {formData.certificates.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]" title={cert.name}>
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
                  <div className="sm:col-span-2 text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-md border border-dashed">
                    لم يتم رفع أي شهادات بعد
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


          {/* Working Hours Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                مواعيد العمل
              </CardTitle>
              <CardDescription>
                تحديد أيام وساعات العمل في العيادة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkingHours
                availableTime={formData.availableTime}
                onTimeChange={handleTimeChange}
                onDayToggle={handleDayToggle}
                getDayName={getDayName}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                بيانات العيادة
              </CardTitle>
              <CardDescription>
                عنوان العيادة وتفاصيل الحجز
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم العيادة</Label>
                <Input 
                  name="clinicName" 
                  value={formData.clinicName} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>العنوان بالتفصيل</Label>
                <Input 
                  name="clinicAddress" 
                  value={formData.clinicAddress} 
                  onChange={handleChange} 
                  placeholder="المحافظة - المنطقة - اسم الشارع - الدور"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سعر الكشف (ج.م)</Label>
                  <Input 
                    name="bookingPrice" 
                    type="number"
                    value={formData.bookingPrice} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              size="lg" 
              onClick={handleSave} 
              disabled={isProfilePending || isClinicPending}
              className="w-full md:w-auto gap-2"
            >
              {(isProfilePending || isClinicPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <h3 className="font-semibold text-muted-foreground mb-2 text-sm">معاينة حية (Live Preview)</h3>
            <div className="border rounded-xl overflow-hidden bg-background shadow-lg">
              {/* Cover */}
              <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                {formData.banner_url ? (
                  <img src={formData.banner_url} alt="Cover" className="w-full h-full object-cover" />
                ) : null}
                <div className="absolute -bottom-8 right-6">
                  <div className="h-16 w-16 rounded-full border-4 border-background bg-gray-200 overflow-hidden">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl">
                        {formData.name?.[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-10 px-6 pb-6 space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{formData.name || "اسم الدكتور"}</h3>
                  <p className="text-sm text-muted-foreground">{formData.specialty || "التخصص الطبي"}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{formData.clinicAddress || "العنوان"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{formData.phone || "رقم الهاتف"}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex gap-2 mb-3">
                    <Badge variant="secondary" className="w-full justify-center py-1">
                      {formData.bookingPrice ? `${formData.bookingPrice} ج.م` : "سعر الكشف"}
                    </Badge>
                  </div>
                  <Button className="w-full h-8 text-xs" disabled>حجز موعد</Button>
                </div>
              </div>
            </div>
            
            {/* QR Code Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  رمز QR للبروفايل
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-xl shadow-sm border border-primary/10">
                  {publicProfileUrl ? (
                    <QRCode 
                      id="profile-qr-code"
                      value={publicProfileUrl} 
                      size={150}
                      level="H"
                    />
                  ) : (
                    <div className="w-[150px] h-[150px] flex items-center justify-center text-muted-foreground text-xs text-center px-4">
                      جارٍ تجهيز الرابط...
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 bg-white"
                  onClick={downloadQRCode}
                  disabled={!publicProfileUrl}
                >
                  <Download className="h-4 w-4" />
                  تحميل الرمز (QR Code)
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  يمكنك طباعة هذا الرمز ووضعه في عيادتك ليسهل على المرضى الوصول لملفك الشخصي.
                </p>
              </CardContent>
            </Card>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-xs leading-relaxed border border-blue-100">
              <p>
                <strong>ملاحظة:</strong> البيانات التي تقوم بتعديلها هنا تنعكس تلقائياً على صفحة إعداداتك الرئيسية وعلى صفحة ملفك الشخصي العامة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
