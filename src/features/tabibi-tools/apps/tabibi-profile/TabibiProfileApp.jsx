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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Switch } from "../../../../components/ui/switch";
import { ExternalLink, Copy, Check, User, MapPin, Phone, Stethoscope, Clock, Save, Loader2, Upload, Trash2, Plus, Award, GraduationCap, FileText, QrCode, Download, MessageCircle, ChevronUp, ChevronDown, Settings, BarChart3, Eye, MousePointerClick, Share2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import useUpdateProfile from "../../../settings/useUpdateProfile";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { updateClinic } from "../../../../services/apiClinic";
import supabase from "../../../../services/supabase";
import WorkingHours from "../../../clinic/WorkingHours";
import QRCode from "react-qr-code";
import { defaultClinicProfileSettings, getClinicProfileAnalyticsCounts, getClinicProfileAnalyticsTopCities, getClinicProfileSettings, upsertClinicProfileSettings } from "../../../../services/apiClinicProfile";
import { SkeletonLine } from "../../../../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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

  const { data: profileSettingsData, isLoading: isProfileSettingsLoading } = useQuery({
    queryKey: ["clinic-profile-settings", clinic?.clinic_uuid],
    queryFn: async () => {
      try {
        return await getClinicProfileSettings(clinic?.clinic_uuid);
      } catch {
        return { clinicId: clinic?.clinic_uuid, settings: defaultClinicProfileSettings, exists: false };
      }
    },
    enabled: !!clinic?.clinic_uuid,
  });

  const [profileSettings, setProfileSettings] = useState(defaultClinicProfileSettings);

  useEffect(() => {
    if (profileSettingsData?.settings) setProfileSettings(profileSettingsData.settings);
  }, [profileSettingsData?.settings]);

  const { mutate: saveProfileSettings, isPending: isSavingProfileSettings } = useMutation({
    mutationFn: async () => {
      if (!clinic?.clinic_uuid) throw new Error("clinicId missing");
      return upsertClinicProfileSettings({ clinicId: clinic.clinic_uuid, settings: profileSettings });
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات عرض الصفحة");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حفظ إعدادات العرض");
    },
  });

  const [analyticsRangeDays, setAnalyticsRangeDays] = useState(30);

  const {
    data: analyticsCounts,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
    refetch: refetchAnalyticsCounts,
  } = useQuery({
    queryKey: ["clinic-profile-analytics", clinic?.clinic_uuid, analyticsRangeDays],
    queryFn: () => getClinicProfileAnalyticsCounts({ clinicId: clinic?.clinic_uuid, days: analyticsRangeDays }),
    enabled: !!clinic?.clinic_uuid,
  });

  const {
    data: analyticsTopCities,
    isLoading: isCitiesLoading,
    error: citiesError,
    refetch: refetchTopCities,
  } = useQuery({
    queryKey: ["clinic-profile-analytics-top-cities", clinic?.clinic_uuid, analyticsRangeDays],
    queryFn: () => getClinicProfileAnalyticsTopCities({ clinicId: clinic?.clinic_uuid, days: analyticsRangeDays, limit: 10 }),
    enabled: !!clinic?.clinic_uuid,
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

  const moveInArray = (arr, fromIndex, toIndex) => {
    const next = arr.slice();
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
  };

  const toggleStatItem = (key, enabled) => {
    setProfileSettings((prev) => {
      const items = Array.isArray(prev.stats?.items) ? prev.stats.items : [];
      const bookingRangeKeys = new Set(["bookings_last_week", "bookings_last_month", "bookings_last_year"]);
      const hasItem = items.some((i) => i?.key === key);
      const baseItems = hasItem ? items : [...items, { key, enabled: false }];
      const nextItems = baseItems.map((i) => {
        if (i?.key === key) return { ...i, enabled };
        if (enabled && bookingRangeKeys.has(key) && bookingRangeKeys.has(i?.key)) return { ...i, enabled: false };
        return i;
      });
      return { ...prev, stats: { ...prev.stats, items: nextItems } };
    });
  };

  const setRatingValue = (val) => {
    setProfileSettings((prev) => {
      const items = Array.isArray(prev.stats?.items) ? prev.stats.items : [];
      const nextItems = items.map((i) => (i.key === "rating" ? { ...i, value: val } : i));
      return { ...prev, stats: { ...prev.stats, items: nextItems } };
    });
  };

  const setStatsEnabled = (enabled) => {
    setProfileSettings((prev) => ({ ...prev, stats: { ...prev.stats, enabled } }));
  };

  const setActionsEnabled = (enabled) => {
    setProfileSettings((prev) => ({ ...prev, actions: { ...prev.actions, enabled } }));
  };

  const setShowLocation = (enabled) => {
    setProfileSettings((prev) => ({ ...prev, actions: { ...prev.actions, showLocation: enabled } }));
  };

  const setLocationUrl = (url) => {
    setProfileSettings((prev) => ({ ...prev, actions: { ...prev.actions, locationUrl: url } }));
  };

  const moveActionButton = (key, direction) => {
    setProfileSettings((prev) => {
      const order = Array.isArray(prev.actions?.order) ? prev.actions.order : [];
      const idx = order.indexOf(key);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= order.length) return prev;
      return { ...prev, actions: { ...prev.actions, order: moveInArray(order, idx, nextIdx) } };
    });
  };

  const toggleBuiltinSection = (key, enabled) => {
    setProfileSettings((prev) => ({
      ...prev,
      builtinSections: {
        ...prev.builtinSections,
        visibility: { ...(prev.builtinSections?.visibility || {}), [key]: enabled },
      },
    }));
  };

  const moveBuiltinSection = (key, direction) => {
    setProfileSettings((prev) => {
      const order = Array.isArray(prev.builtinSections?.order) ? prev.builtinSections.order : [];
      const idx = order.indexOf(key);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= order.length) return prev;
      return { ...prev, builtinSections: { ...prev.builtinSections, order: moveInArray(order, idx, nextIdx) } };
    });
  };

  const addCustomSection = () => {
    const id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setProfileSettings((prev) => {
      const list = Array.isArray(prev.customSections) ? prev.customSections : [];
      return {
        ...prev,
        customSections: [
          ...list,
          { id, order: list.length + 1, type: "text", title: "قسم جديد", content: "" },
        ],
      };
    });
  };

  const updateCustomSection = (id, patch) => {
    setProfileSettings((prev) => {
      const list = Array.isArray(prev.customSections) ? prev.customSections : [];
      return { ...prev, customSections: list.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    });
  };

  const removeCustomSection = (id) => {
    setProfileSettings((prev) => {
      const list = Array.isArray(prev.customSections) ? prev.customSections : [];
      return { ...prev, customSections: list.filter((s) => s.id !== id) };
    });
  };

  const moveCustomSection = (id, direction) => {
    setProfileSettings((prev) => {
      const list = Array.isArray(prev.customSections) ? prev.customSections.slice() : [];
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= list.length) return prev;
      const reordered = moveInArray(list, idx, nextIdx).map((s, i) => ({ ...s, order: i + 1 }));
      return { ...prev, customSections: reordered };
    });
  };

  const uploadCustomSectionImage = async (sectionId, file) => {
    if (!file) return;
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `section-${sectionId}-${Math.random()}.${fileExt}`;
      const filePath = `${user.user_id}/profile-sections/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("doctor-profiles").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("doctor-profiles").getPublicUrl(filePath);
      updateCustomSection(sectionId, { imageUrl: publicUrl });
      toast.success("تم رفع صورة القسم");
    } catch {
      toast.error("حدث خطأ أثناء رفع صورة القسم");
    }
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

  const getStatItem = (key) => {
    const items = Array.isArray(profileSettings?.stats?.items) ? profileSettings.stats.items : [];
    return items.find((i) => i?.key === key) || { key, enabled: false };
  };

  const sectionLabels = {
    actions: "أزرار التواصل",
    clinic_details: "تفاصيل العيادة",
    working_hours: "أوقات العمل",
    bio: "النبذة المهنية",
    education: "المؤهلات العلمية",
    certificates: "الشهادات والتراخيص",
    custom_sections: "أقسام مخصصة",
  };

  const actionLabels = {
    call: "اتصال",
    whatsapp: "واتساب",
    share: "مشاركة",
    location: "الموقع",
  };

  if (isClinicLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 md:p-4" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/10" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">Tabibi Profile</h1>
          <p className="text-muted-foreground" dir="rtl">
            صفحتك التعريفية الخاصة على الإنترنت. شاركها مع مرضاك ليسهل عليهم الوصول إليك والحجز.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto" dir="rtl">
          <Button variant="outline" onClick={() => window.open(publicProfileUrl, '_blank')} className="gap-2 flex-1 md:flex-none">
            <ExternalLink className="h-4 w-4" />
            عرض الصفحة
          </Button>
          <Button onClick={copyLink} className="gap-2 flex-1 md:flex-none" dir="rtl">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="edit" className="gap-2 justify-center py-2 text-[11px] sm:text-sm w-full">
            <FileText className="h-4 w-4" />
            البيانات
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2 justify-center py-2 text-[11px] sm:text-sm w-full">
            <Settings className="h-4 w-4" />
            إعدادات العرض
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 justify-center py-2 text-[11px] sm:text-sm w-full">
            <BarChart3 className="h-4 w-4" />
            إحصائيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" dir="rtl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        الصور والمظهر
                      </CardTitle>
                      <CardDescription>تخصيص الصور التي تظهر في ملفك الشخصي</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/10">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                          {formData.avatar_url ? (
                            <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
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
                          onChange={(e) => handleImageUpload(e, "avatar")}
                          disabled={uploadingAvatar}
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <h3 className="font-medium text-sm">الصورة الشخصية</h3>
                        <p className="text-xs text-muted-foreground">JPG, PNG</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/10">
                      <div className="relative group w-full h-24 rounded-md overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                        {formData.banner_url ? (
                          <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
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

                        <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/20">
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
                          onChange={(e) => handleImageUpload(e, "banner")}
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
                  <CardDescription>البيانات التي ستظهر للمرضى في أعلى صفحتك الشخصية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم الدكتور</Label>
                      <Input name="name" value={formData.name} onChange={handleChange} placeholder="د. احمد محمد" />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهاتف للتواصل</Label>
                      <Input name="phone" value={formData.phone} onChange={handleChange} dir="ltr" className="text-right" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        <h3 className="text-base font-semibold">أرقام تواصل إضافية</h3>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addContact} className="h-8 text-xs">
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
                              onChange={(e) => handleContactChange(index, "type", e.target.value)}
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
                              onChange={(e) => handleContactChange(index, "value", e.target.value)}
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
                            onChange={(e) => handleEducationChange(index, "year", e.target.value)}
                            placeholder="2010"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">الدرجة العلمية</Label>
                          <Input
                            value={edu.degree}
                            onChange={(e) => handleEducationChange(index, "degree", e.target.value)}
                            placeholder="بكالوريوس الطب والجراحة"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label className="text-xs">الجامعة / المؤسسة</Label>
                          <Input
                            value={edu.school}
                            onChange={(e) => handleEducationChange(index, "school", e.target.value)}
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

                  <Button variant="outline" size="sm" onClick={addEducation} className="w-full border-dashed">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مؤهل جديد
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    الشهادات والوثائق
                  </CardTitle>
                  <CardDescription>شهادات التقدير، التراخيص، والعضويات المهنية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <div className="relative">
                      <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={uploadingCertificate}>
                        {uploadingCertificate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]" title={cert.name}>
                              {cert.name}
                            </p>
                            <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    مواعيد العمل
                  </CardTitle>
                  <CardDescription>تحديد أيام وساعات العمل في العيادة</CardDescription>
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
                  <CardDescription>عنوان العيادة وتفاصيل الحجز</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم العيادة</Label>
                    <Input name="clinicName" value={formData.clinicName} onChange={handleChange} />
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
                      <Input name="bookingPrice" type="number" value={formData.bookingPrice} onChange={handleChange} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button size="lg" onClick={handleSave} disabled={isProfilePending || isClinicPending} className="w-full md:w-auto gap-2">
                  {isProfilePending || isClinicPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ التغييرات
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-primary" />
                      QR Code للصفحة
                    </CardTitle>
                    <CardDescription>المرضى يقدروا يمسحوا الكود ويوصلوا لصفحتك مباشرة</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center rounded-xl border bg-white p-4">
                      {publicProfileUrl ? (
                        <QRCode id="profile-qr-code" value={publicProfileUrl} size={220} level="H" />
                      ) : (
                        <div className="text-sm text-muted-foreground">رابط الصفحة غير متاح</div>
                      )}
                    </div>
                    <Button onClick={downloadQRCode} disabled={!publicProfileUrl} className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      تحميل QR Code
                    </Button>
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
        </TabsContent>

        <TabsContent value="display" dir="rtl">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  ما الذي يظهر في الإحصائيات أعلى الصفحة؟
                </CardTitle>
                <CardDescription>تحكم في ظهور التقييم وعدد الحجوزات وحالة العيادة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">تفعيل الإحصائيات</div>
                    <div className="text-xs text-muted-foreground">إظهار أو إخفاء شريط الإحصائيات أعلى الصفحة</div>
                  </div>
                  <Switch checked={profileSettings?.stats?.enabled !== false} onCheckedChange={setStatsEnabled} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">حالة العيادة (مفتوح/مغلق)</div>
                    <Switch checked={!!getStatItem("open_now").enabled} onCheckedChange={(v) => toggleStatItem("open_now", v)} />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium">التقييم</div>
                    <Switch checked={!!getStatItem("rating").enabled} onCheckedChange={(v) => toggleStatItem("rating", v)} />
                  </div>
                  {getStatItem("rating").enabled ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>قيمة التقييم (من 5)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={getStatItem("rating").value ?? 4.9}
                          onChange={(e) => setRatingValue(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">عدد الحجوزات (آخر أسبوع)</div>
                    <Switch
                      checked={!!getStatItem("bookings_last_week").enabled}
                      onCheckedChange={(v) => toggleStatItem("bookings_last_week", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">عدد الحجوزات (آخر 30 يوم)</div>
                    <Switch
                      checked={!!getStatItem("bookings_last_month").enabled}
                      onCheckedChange={(v) => toggleStatItem("bookings_last_month", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">عدد الحجوزات (آخر سنة)</div>
                    <Switch
                      checked={!!getStatItem("bookings_last_year").enabled}
                      onCheckedChange={(v) => toggleStatItem("bookings_last_year", v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  أزرار التواصل (Action Buttons)
                </CardTitle>
                <CardDescription>إظهار زر موقع العيادة والتحكم في ترتيب الأزرار</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">تفعيل أزرار التواصل</div>
                  <Switch checked={profileSettings?.actions?.enabled !== false} onCheckedChange={setActionsEnabled} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">إظهار زر موقع العيادة</div>
                    <div className="text-xs text-muted-foreground">سيظهر ضمن أزرار الاتصال/واتساب/مشاركة</div>
                  </div>
                  <Switch checked={!!profileSettings?.actions?.showLocation} onCheckedChange={setShowLocation} />
                </div>

                {profileSettings?.actions?.showLocation ? (
                  <div className="space-y-2">
                    <Label>رابط موقع العيادة (Google Maps)</Label>
                    <Input
                      value={profileSettings?.actions?.locationUrl || ""}
                      onChange={(e) => setLocationUrl(e.target.value)}
                      placeholder="https://maps.google.com/?q=..."
                      dir="ltr"
                      className="text-right"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>ترتيب الأزرار</Label>
                  <div className="space-y-2">
                    {(Array.isArray(profileSettings?.actions?.order) ? profileSettings.actions.order : []).map((k, idx) => (
                      <div key={`${k}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                        <div className="text-sm font-medium">{actionLabels[k] || k}</div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="icon" onClick={() => moveActionButton(k, "up")} className="h-8 w-8">
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" onClick={() => moveActionButton(k, "down")} className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  ترتيب أقسام الصفحة
                </CardTitle>
                <CardDescription>تحكم في ترتيب الأقسام التي تظهر للمريض</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {(Array.isArray(profileSettings?.builtinSections?.order) ? profileSettings.builtinSections.order : []).map((k, idx) => (
                    <div key={`${k}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{sectionLabels[k] || k}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>إظهار</span>
                          <Switch
                            checked={(profileSettings?.builtinSections?.visibility || {})[k] !== false}
                            onCheckedChange={(v) => toggleBuiltinSection(k, v)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="icon" onClick={() => moveBuiltinSection(k, "up")} className="h-8 w-8">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={() => moveBuiltinSection(k, "down")} className="h-8 w-8">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      الأقسام المخصصة
                    </CardTitle>
                    <CardDescription>إضافة أقسام جديدة (نص فقط / نص + صورة / فيديو يوتيوب)</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomSection} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة قسم
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Array.isArray(profileSettings?.customSections) ? profileSettings.customSections : [])
                  .slice()
                  .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
                  .map((section) => (
                    <div key={section.id} className="rounded-lg border p-4 space-y-4 bg-muted/10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" onClick={() => moveCustomSection(section.id, "up")} className="h-8 w-8">
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" onClick={() => moveCustomSection(section.id, "down")} className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomSection(section.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>عنوان القسم</Label>
                          <Input value={section.title || ""} onChange={(e) => updateCustomSection(section.id, { title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>نوع القسم</Label>
                          <select
                            value={section.type}
                            onChange={(e) => updateCustomSection(section.id, { type: e.target.value })}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="text">نص فقط</option>
                            <option value="split">نص + صورة</option>
                            <option value="youtube">فيديو يوتيوب</option>
                          </select>
                        </div>
                      </div>

                      {section.type === "text" ? (
                        <div className="space-y-2">
                          <Label>المحتوى</Label>
                          <Textarea
                            value={section.content || ""}
                            onChange={(e) => updateCustomSection(section.id, { content: e.target.value })}
                            className="h-28 resize-none"
                          />
                        </div>
                      ) : null}

                      {section.type === "split" ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>النص</Label>
                            <Textarea value={section.text || ""} onChange={(e) => updateCustomSection(section.id, { text: e.target.value })} className="h-28 resize-none" />
                          </div>
                          <div className="space-y-2">
                            <Label>صورة</Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => uploadCustomSectionImage(section.id, e.target.files?.[0])}
                              />
                              {section.imageUrl ? (
                                <Button type="button" variant="outline" onClick={() => window.open(section.imageUrl, "_blank")} className="shrink-0">
                                  عرض
                                </Button>
                              ) : null}
                            </div>
                            {section.imageUrl ? (
                              <Input value={section.imageUrl} onChange={(e) => updateCustomSection(section.id, { imageUrl: e.target.value })} dir="ltr" className="text-right" />
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {section.type === "youtube" ? (
                        <div className="space-y-2">
                          <Label>رابط يوتيوب</Label>
                          <Input
                            value={section.youtubeUrl || ""}
                            onChange={(e) => updateCustomSection(section.id, { youtubeUrl: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                            dir="ltr"
                            className="text-right"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}

                {(!profileSettings?.customSections || profileSettings.customSections.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-md border border-dashed">
                    لا توجد أقسام مخصصة بعد
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={() => saveProfileSettings()}
                disabled={isSavingProfileSettings || isProfileSettingsLoading}
                className="w-full md:w-auto gap-2"
              >
                {isSavingProfileSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ إعدادات العرض
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" dir="rtl">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                  <BarChart3 className="size-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold mb-1">إحصائيات</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">متابعة زيارات الصفحة ونقرات الأزرار</p>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <Select value={String(analyticsRangeDays)} onValueChange={(v) => setAnalyticsRangeDays(Number(v))} dir="rtl">
                  <SelectTrigger className="h-9 w-full sm:w-[160px] justify-between text-sm">
                    <SelectValue placeholder="الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">آخر 7 أيام</SelectItem>
                    <SelectItem value="30">آخر 30 يوم</SelectItem>
                    <SelectItem value="365">آخر سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {analyticsError || citiesError ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-10 text-center space-y-3">
                  <div className="mx-auto size-10 rounded-full bg-destructive/10 text-destructive grid place-items-center">
                    <X className="size-5" />
                  </div>
                  <div className="text-base font-semibold">تعذر تحميل الإحصائيات</div>
                  <div className="text-sm text-muted-foreground">حاول مرة أخرى أو تحقق من الاتصال.</div>
                  <Button variant="outline" className="gap-2" onClick={() => { refetchAnalyticsCounts(); refetchTopCities(); }}>
                    حاول تاني
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { key: "profile_view", label: "زيارات الصفحة", icon: Eye },
                    { key: "booking_click", label: "ضغط احجز موعد الآن", icon: MousePointerClick },
                    { key: "action_call", label: "ضغط اتصال", icon: Phone },
                    { key: "action_whatsapp", label: "ضغط واتساب", icon: MessageCircle },
                    { key: "action_share", label: "ضغط مشاركة", icon: Share2 },
                    { key: "action_location", label: "ضغط الموقع", icon: MapPin },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <Card key={m.key} className="bg-card/70">
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground truncate">{m.label}</div>
                            {isAnalyticsLoading ? (
                              <SkeletonLine className="h-4 w-10" />
                            ) : (
                              <div className="text-lg font-semibold truncate">{analyticsCounts?.[m.key] ?? 0}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        أماكن فتح الصفحة
                      </CardTitle>
                      <CardDescription>أعلى المدن/المناطق حسب عدد الزيارات</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isCitiesLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (analyticsTopCities?.length || 0) === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          لا توجد بيانات مواقع كافية لهذه الفترة.
                        </div>
                      ) : (
                        <div className="h-[260px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsTopCities} margin={{ top: 10, right: 10, left: 10, bottom: 28 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip cursor={{ fill: "transparent" }} />
                              <Bar dataKey="count" fill="#1AA19C" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
