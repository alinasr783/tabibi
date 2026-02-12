import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getClinicById } from "../services/apiClinic";
import { Button } from "../components/ui/button";
import { Loader2, CheckCircle, BadgeCheck, Star, Share2, GraduationCap, Award, MapPin, Phone, MessageCircle, User, Building2, Banknote, Clock, QrCode, Download, X } from "lucide-react";
import supabase from "../services/supabase";
import { useAuth } from "../features/auth/AuthContext";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";

// Helper function to fetch extended public profile data
async function getDoctorPublicProfile(clinicUuid) {
  // 1. Get Clinic Data
  const clinic = await getClinicById(clinicUuid);
  
  // 2. Try to get Doctor Data
  let doctor = {
    name: "دكتور طبيبي",
    bio: "طبيب متخصص يستخدم منصة طبيبي لإدارة عيادته.",
    specialty: "غير محدد",
    avatar_url: null,
    banner_url: null,
    education: [],
    certificates: [],
    phone: null
  };

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('name, bio, specialty, avatar_url, banner_url, education, certificates, phone, contacts')
      .eq('clinic_id', clinicUuid)
      .eq('role', 'doctor')
      .limit(1);

    if (users && users.length > 0) {
      doctor = { ...doctor, ...users[0] };
    }
  } catch (err) {
    console.log("Could not fetch doctor extended details, using defaults", err);
  }

  // 3. Get Booking Stats (Real Data)
  const stats = {
    bookingsLastMonth: "0",
    rating: "4.9"
  };

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicUuid)
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (!error) {
      stats.bookingsLastMonth = count > 0 ? `+${count}` : "0";
    }
  } catch (err) {
    console.log("Could not fetch booking stats", err);
  }

  return { ...clinic, doctor, stats };
}

export default function DoctorProfilePage() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [contactModal, setContactModal] = useState({ show: false, type: null, list: [] }); // type: 'call' or 'whatsapp'
  
  // Check if the current user is the owner of this profile
  const isOwner = user?.clinic_id === clinicId;

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-doctor-profile', clinicId],
    queryFn: () => getDoctorPublicProfile(clinicId),
    enabled: !!clinicId
  });

  const handleContactAction = (type) => {
    const contacts = profile?.doctor?.contacts || [];
    const primaryPhone = profile?.doctor?.phone;
    
    // Filter contacts based on action type
    let filteredContacts = contacts.filter(c => {
      if (type === 'call') return c.type === 'phone' || c.type === 'both';
      if (type === 'whatsapp') return c.type === 'whatsapp' || c.type === 'both';
      return false;
    });

    // Add primary phone if it exists and matches type
    if (primaryPhone) {
      const alreadyInList = filteredContacts.some(c => c.value === primaryPhone);
      if (!alreadyInList) {
        // Assume primary phone is for both unless specified otherwise
        filteredContacts = [{ type: 'both', value: primaryPhone, isPrimary: true }, ...filteredContacts];
      }
    }

    if (filteredContacts.length === 0) {
      toast.error(type === 'call' ? "رقم الهاتف غير متوفر" : "رقم الواتساب غير متوفر");
      return;
    }

    if (filteredContacts.length === 1) {
      const val = filteredContacts[0].value.replace(/\s/g, '');
      if (type === 'call') window.location.href = `tel:${val}`;
      else window.open(`https://wa.me/${val.replace(/\+/g, '')}`, '_blank');
      return;
    }

    // Show selection modal if multiple contacts
    setContactModal({ show: true, type, list: filteredContacts });
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
      downloadLink.download = `QR-Profile-${profile?.doctor?.name || 'doctor'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("تم تحميل رمز QR بنجاح");
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Scroll to top on mount
  // Fixed BadgeCheck reference error - Force Update
  if (!isLoading && profile) {
    window.scrollTo(0, 0);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A1F44]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F8] p-4 font-[Cairo]">
        <h2 className="text-xl font-bold text-[#0A1F44] mb-2">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-4">تأكد من الرابط وحاول مرة أخرى</p>
        <Button onClick={() => navigate('/')} className="bg-[#0A1F44] hover:bg-[#0A1F44]/90">العودة للرئيسية</Button>
      </div>
    );
  }

  const { doctor, stats } = profile;

  // Helper to check if open now
  const isOpenNow = () => {
    if (!profile.available_time) return false;
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const schedule = profile.available_time[currentDay];
    
    if (!schedule || schedule.off || !schedule.start || !schedule.end) return false;
    
    // Simple time check logic
    const [startH, startM] = schedule.start.split(':').map(Number);
    const [endH, endM] = schedule.end.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currentH * 60 + currentM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8F8F8] font-[Cairo] text-[#333333] pb-24" dir="rtl">
      {/* Styles for this page specifically */}
      <style>{`
        .font-body-sans { font-family: 'Cairo', sans-serif; }
        .font-amiri { font-family: 'Amiri', serif; }
        .card-shadow-elegant { box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.08); }
        .geometric-bg {
          background-image: url(https://lh3.googleusercontent.com/aida-public/AB6AXuBRzCwGlfLb-DwCev5jFex4QmNoarquVE6In56SJMWUHJaytTZ0FifUTgk-gG_AFk-V0Ybfh3wT0522Mwz_EJcTOoRMsWyqlRtEsN-NhgO9S58kpSyD7rBZV2y8MxvHFZIIfS9QUw5ICIhD6w5WXwR6wZjsSU2I1M7cAeEyQDIBggwRPb1iFiM363Q3gsJ0Lzs6XQ5Udx_qWWTpPGcIitb72pB3Eu95UwRG1vChgkzf3O3lcOPVu3KJv_vvuXJILOfCF4Vgc5oVn4Q);
          background-size: 30px;
          background-repeat: repeat;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <div className="max-w-md mx-auto px-4 space-y-5 pt-4">
        
        {/* Profile Card */}
        <div className="rounded-2xl overflow-hidden card-shadow-elegant relative border border-gray-100 h-[280px] flex flex-col justify-end">
          {/* Banner Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url("${doctor.banner_url || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}")` 
            }}
          >
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
          
          <div className="relative px-6 pb-6 z-10">
            <div className="flex items-end mb-4 gap-4">
              <div className="relative shrink-0">
                <div 
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl h-24 w-24 border-2 border-white shadow-lg" 
                  style={{ backgroundImage: `url("${doctor.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDB3XEH1GLnnMF1LXI-gXxsHdZ2i4aMIL0B9XCTki6huDpz_FQWxwc3bH2HPtLq5m8_JkpbMQceopzUibJIE7w7lqVxv__EJwbEQcp_cRNAU4TjNs7I1IknJyfzZ-R8y-FPbNv7rLJeBq6uzTN7X8FZvffYgTumpawKxn7EvvQhMGl3jUdVMO3IEwViN5z_yZiD_YV-Y3MySPQL8jdiW2zACmsVNPuVkoOCmXk-LurEeX-u2FK_to4xAhKD6h5v9_tNod-Cxng5I0E'}")` }}
                ></div>
              </div>
              
              <div className="glass-panel rounded-xl p-3 flex-1 mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-amiri font-bold text-white drop-shadow-md">{doctor.name}</h1>
                  <BadgeCheck className="text-[#1877F2] w-6 h-6 drop-shadow-sm" fill="#C8A155" />
                </div>
                <p className="text-white text-base font-body-sans font-semibold drop-shadow-sm">{doctor.specialty}</p>
              </div>
            </div>
            
            <div className="glass-panel rounded-xl p-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xs text-white/90 font-amiri font-bold mb-1">الموعد القادم</p>
                <p className="text-lg font-amiri font-bold text-white drop-shadow-sm">
                    {isOpenNow() ? "مفتوح الآن" : "مغلق"}
                </p>
              </div>
              <div className="text-center border-x border-white/20">
                <p className="text-xs text-white/90 font-amiri font-bold mb-1">مواعيد (30 يوم)</p>
                <p className="text-lg font-amiri font-bold text-white drop-shadow-sm">{stats.bookingsLastMonth}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/90 font-amiri font-bold mb-1">التقييم</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg font-amiri font-bold text-white drop-shadow-sm">{stats.rating}</span>
                  <Star className="text-white w-4 h-4 fill-current drop-shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between gap-3 card-shadow-elegant border border-[#E0E0E0]">
          <button 
            onClick={() => handleContactAction('call')}
            className="flex-1 bg-[#0A1F44]/10 text-[#0A1F44] rounded-xl py-3 flex flex-col items-center gap-1 transition-all hover:bg-[#0A1F44]/20 active:scale-95"
          >
            <Phone className="w-5 h-5" />
            <span className="text-xs font-body-sans font-semibold">اتصال</span>
          </button>
          <button 
            onClick={() => setShowQRModal(true)}
            className="flex-1 bg-[#0A1F44]/10 text-[#0A1F44] rounded-xl py-3 flex flex-col items-center gap-1 transition-all hover:bg-[#0A1F44]/20 active:scale-95"
          >
            <QrCode className="w-5 h-5" />
            <span className="text-xs font-body-sans font-semibold">QR Code</span>
          </button>
          <button 
            onClick={() => handleContactAction('whatsapp')}
            className="flex-1 bg-[#25D366]/10 text-[#25D366] rounded-xl py-3 flex flex-col items-center gap-1 transition-all hover:bg-[#25D366]/20 active:scale-95"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-body-sans font-semibold">واتساب</span>
          </button>
          <button 
             onClick={async () => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: doctor.name,
                            text: `احجز موعد مع ${doctor.name} في ${profile.name}`,
                            url: window.location.href,
                        });
                    } catch (err) {
                        console.log('Error sharing:', err);
                    }
                } else {
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        alert("تم نسخ الرابط");
                    } catch (err) {
                        alert("فشل نسخ الرابط");
                    }
                }
             }}
            className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 flex flex-col items-center gap-1 transition-all hover:bg-gray-200 active:scale-95"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs font-body-sans font-semibold">مشاركة</span>
          </button>
        </div>

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-6 flex flex-col items-center gap-6">
                <div className="w-full flex justify-between items-center">
                  <h3 className="text-xl font-bold font-amiri text-[#0A1F44]">رمز QR للبروفايل</h3>
                  <button 
                    onClick={() => setShowQRModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 bg-white rounded-2xl border-2 border-gray-100 shadow-inner">
                  <QRCode 
                    id="profile-qr-code"
                    value={window.location.href} 
                    size={200}
                    className="w-full h-auto"
                  />
                </div>

                <div className="w-full space-y-3">
                  <Button 
                    onClick={downloadQRCode}
                    className="w-full py-6 bg-[#0A1F44] hover:bg-[#0A1F44]/90 rounded-2xl gap-2 text-lg font-bold"
                  >
                    <Download className="w-5 h-5" />
                    تحميل الرمز
                  </Button>
                  <p className="text-center text-sm text-gray-500 font-body-sans">
                    يمكن للمرضى مسح هذا الرمز للوصول لصفحتك مباشرة
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Selection Modal */}
        {contactModal.show && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">
              <div className="p-6 flex flex-col gap-6">
                <div className="w-full flex justify-between items-center">
                  <h3 className="text-xl font-bold font-amiri text-[#0A1F44]">
                    {contactModal.type === 'call' ? 'اختر رقم للاتصال' : 'اختر رقم للواتساب'}
                  </h3>
                  <button 
                    onClick={() => setContactModal({ show: false, type: null, list: [] })}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-3">
                  {contactModal.list.map((contact, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const val = contact.value.replace(/\s/g, '');
                        if (contactModal.type === 'call') window.location.href = `tel:${val}`;
                        else window.open(`https://wa.me/${val.replace(/\+/g, '')}`, '_blank');
                        setContactModal({ show: false, type: null, list: [] });
                      }}
                      className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-[#0A1F44]/5 rounded-2xl border border-gray-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${contactModal.type === 'call' ? 'bg-[#0A1F44]/10 text-[#0A1F44]' : 'bg-[#25D366]/10 text-[#25D366]'}`}>
                          {contactModal.type === 'call' ? <Phone className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold font-body-sans text-[#0A1F44]">{contact.value}</p>
                          <p className="text-[10px] text-gray-400 font-body-sans">
                            {contact.isPrimary ? 'الرقم الأساسي' : (contact.type === 'both' ? 'اتصال وواتساب' : (contact.type === 'phone' ? 'اتصال فقط' : 'واتساب فقط'))}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-100 group-hover:bg-[#0A1F44] group-hover:text-white transition-colors">
                        <CheckCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clinic Details */}
        <div className="bg-white rounded-2xl p-5 card-shadow-elegant border border-[#E0E0E0]">
          <h3 className="font-amiri font-bold text-xl text-[#0A1F44] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C8A155]" />
            تفاصيل العيادة
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#C8A155]/10 p-2 rounded-lg text-[#C8A155]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-body-sans font-bold">{profile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{profile.address}</p>
                <button className="text-[#0A1F44] text-xs font-body-sans font-semibold mt-1 hover:underline">عرض الموقع على الخريطة</button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#C8A155]/10 p-2 rounded-lg text-[#C8A155]">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-body-sans font-bold">{profile.booking_price ? `${profile.booking_price} ج.م` : "مجاناً"}</p>
                <p className="text-xs text-gray-500">رسوم الكشفية الضريبية</p>
              </div>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-2xl p-5 card-shadow-elegant border border-[#E0E0E0]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-amiri font-bold text-xl text-[#0A1F44] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C8A155]" />
              أوقات العمل
            </h3>
            <span className={`text-xs font-body-sans font-semibold ${isOpenNow() ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"} px-3 py-1 rounded-full`}>
                {isOpenNow() ? "مفتوح الآن" : "مغلق الآن"}
            </span>
          </div>
          <div className="space-y-3">
            {profile.available_time && Object.entries(profile.available_time).map(([day, time]) => {
                const dayNames = {
                    sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
                    wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
                };
                if (!time.start) return null; // Skip if no time
                return (
                    <div key={day} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{dayNames[day]}</span>
                        {time.off ? (
                             <span className="font-body-sans italic text-red-400">مغلق</span>
                        ) : (
                            <span className="font-body-sans font-semibold">{time.start} - {time.end}</span>
                        )}
                    </div>
                );
            })}
          </div>
        </div>

        {/* Bio and Education */}
        <div className="bg-white rounded-2xl p-5 card-shadow-elegant border border-[#E0E0E0]">
          <h3 className="font-amiri font-bold text-xl text-[#0A1F44] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#C8A155]" />
            النبذة المهنية
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            {doctor.bio || "لا توجد نبذة تعريفية"}
          </p>
          
          <h3 className="font-amiri font-bold text-xl text-[#0A1F44] mb-4 flex items-center gap-2 border-t border-[#E0E0E0] pt-5">
            <GraduationCap className="w-5 h-5 text-[#C8A155]" />
            المؤهلات العلمية
          </h3>
          <div className="space-y-4">
             {doctor.education && doctor.education.length > 0 ? (
                 doctor.education.map((edu, idx) => (
                    <div key={idx} className="flex gap-3 items-baseline">
                        <div className="w-1 bg-[#C8A155] rounded-full shrink-0 h-4 mt-1"></div>
                        <div>
                            <p className="text-sm font-body-sans font-bold text-[#333333]">{edu.degree}</p>
                            <p className="text-xs text-gray-500">{edu.school} {edu.year ? `، ${edu.year}` : ''}</p>
                        </div>
                    </div>
                 ))
             ) : (
                <p className="text-sm text-gray-500">لا توجد مؤهلات مضافة</p>
             )}
          </div>

          <h3 className="font-amiri font-bold text-xl text-[#0A1F44] mb-4 flex items-center gap-2 border-t border-[#E0E0E0] pt-5 mt-5">
            <Award className="w-5 h-5 text-[#C8A155]" />
            الشهادات والتراخيص
          </h3>
          <div className="grid grid-cols-2 gap-3">
             {doctor.certificates && doctor.certificates.length > 0 ? (
                 doctor.certificates.map((cert, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-[#E0E0E0] card-shadow-elegant group relative">
                        {cert.url ? (
                            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                <img 
                                    src={cert.url} 
                                    alt={cert.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onClick={() => window.open(cert.url, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                            </div>
                        ) : (
                            <div className="flex gap-3 items-baseline p-3">
                                <div className="w-1 bg-[#C8A155] rounded-full shrink-0 h-4 mt-1"></div>
                                <div>
                                    <p className="text-sm font-body-sans font-bold text-[#333333]">{cert.name}</p>
                                    <p className="text-xs text-gray-500">{cert.issuer} {cert.year ? `، ${cert.year}` : ''}</p>
                                </div>
                            </div>
                        )}
                    </div>
                 ))
             ) : (
                <p className="text-sm text-gray-500 col-span-2">لا توجد شهادات مضافة</p>
             )}
          </div>
        </div>
        
        {/* Fixed Booking Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-white border-t border-[#E0E0E0] z-50 safe-area-bottom">
            <Button 
            className="w-full h-12 text-lg rounded-xl bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white font-bold flex items-center justify-center gap-2 transition-all font-amiri shadow-none mb-2" 
            onClick={() => navigate(`/booking/${clinicId}`)}
            >
            احجز موعد الآن
            </Button>
            <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-gray-400 font-body-sans">
              <span>تم التصميم بواسطة</span>
              <a href="https://tabibi.site" target="_blank" rel="noopener noreferrer" className="font-bold text-[#C8A155] hover:underline">Tabibi</a>
            </div>
        </div>

      </div>
    </div>
  );
}
