import supabase from "./supabase";
import { getDashboardStats } from "./apiDashboard";

const OPENROUTER_API_KEY = "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_MODEL = "deepseek/deepseek-v3.2";

// ========================
// جلب بيانات المرضى (شاملة)
// ========================
async function getPatientsData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    // Get total count
    const { count: total } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    // Get recent patients with details
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, phone, age, gender, notes, created_at')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Gender breakdown
    const males = (patients || []).filter(p => p.gender === 'male' || p.gender === 'ذكر').length;
    const females = (patients || []).filter(p => p.gender === 'female' || p.gender === 'أنثى').length;

    // Get patients added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: thisMonth } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', startOfMonth.toISOString());

    return {
      total: total || 0,
      thisMonth: thisMonth || 0,
      males,
      females,
      recentPatients: (patients || []).slice(0, 10).map(p => ({
        name: p.name,
        phone: p.phone,
        age: p.age,
        notes: p.notes?.substring(0, 50) || ''
      }))
    };
  } catch (error) {
    console.error('Error fetching patients data:', error);
    return null;
  }
}

// ========================
// جلب بيانات الكشوفات/الزيارات (شاملة)
// ========================
async function getVisitsData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    // Get total visits
    const { count: total } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    // Get recent visits with patient info
    const { data: visits } = await supabase
      .from('visits')
      .select('id, diagnosis, notes, medications, created_at, patient:patients(name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(15);

    // Get visits this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: thisMonth } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', startOfMonth.toISOString());

    return {
      total: total || 0,
      thisMonth: thisMonth || 0,
      recentVisits: (visits || []).slice(0, 10).map(v => ({
        patientName: v.patient?.name || 'غير معروف',
        diagnosis: v.diagnosis?.substring(0, 100) || '',
        notes: v.notes?.substring(0, 100) || '',
        date: v.created_at
      }))
    };
  } catch (error) {
    console.error('Error fetching visits data:', error);
    return null;
  }
}

// ========================
// جلب بيانات المواعيد (شاملة - كل المواعيد)
// ========================
async function getAppointmentsData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get ALL appointments (total count)
    const { count: totalCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);
    
    // Get today's appointments
    const { data: todayAppts, count: todayCount } = await supabase
      .from('appointments')
      .select('id, status, date, from, patient:patients(name, phone)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .gte('date', todayStr + 'T00:00:00')
      .lte('date', todayStr + 'T23:59:59')
      .order('date', { ascending: true });

    // Get this week's appointments
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const { count: weekCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnd.toISOString());

    // Get this month's appointments
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const { count: monthCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());

    // Get past appointments (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const { data: pastAppts, count: pastCount } = await supabase
      .from('appointments')
      .select('id, status, date, from, patient:patients(name, phone)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .lt('date', todayStr + 'T00:00:00')
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false })
      .limit(20);

    // Get future appointments (next 30 days)
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    const { data: futureAppts, count: futureCount } = await supabase
      .from('appointments')
      .select('id, status, date, from, patient:patients(name, phone)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .gt('date', todayStr + 'T23:59:59')
      .lte('date', thirtyDaysLater.toISOString())
      .order('date', { ascending: true })
      .limit(20);

    // Status breakdown for today
    const pending = (todayAppts || []).filter(a => a.status === 'pending').length;
    const confirmed = (todayAppts || []).filter(a => a.status === 'confirmed').length;
    const completed = (todayAppts || []).filter(a => a.status === 'completed').length;
    const cancelled = (todayAppts || []).filter(a => a.status === 'cancelled' || a.status === 'rejected').length;

    // Source breakdown
    const fromOnline = (todayAppts || []).filter(a => a.from === 'booking').length;
    const fromClinic = (todayAppts || []).filter(a => a.from !== 'booking').length;

    return {
      total: totalCount || 0,
      today: {
        total: todayCount || 0,
        pending,
        confirmed,
        completed,
        cancelled,
        fromOnline,
        fromClinic
      },
      thisWeek: weekCount || 0,
      thisMonth: monthCount || 0,
      past: {
        total: pastCount || 0,
        appointments: (pastAppts || []).map(a => ({
          patientName: a.patient?.name || 'غير معروف',
          phone: a.patient?.phone || '',
          time: a.date,
          status: a.status,
          source: a.from === 'booking' ? 'إلكتروني' : 'العيادة'
        }))
      },
      future: {
        total: futureCount || 0,
        appointments: (futureAppts || []).map(a => ({
          patientName: a.patient?.name || 'غير معروف',
          phone: a.patient?.phone || '',
          time: a.date,
          status: a.status,
          source: a.from === 'booking' ? 'إلكتروني' : 'العيادة'
        }))
      },
      todayAppointments: (todayAppts || []).map(a => ({
        patientName: a.patient?.name || 'غير معروف',
        phone: a.patient?.phone || '',
        time: a.date,
        status: a.status,
        source: a.from === 'booking' ? 'إلكتروني' : 'العيادة'
      }))
    };
  } catch (error) {
    console.error('Error fetching appointments data:', error);
    return null;
  }
}

// ========================
// جلب البيانات المالية (شاملة)
// ========================
async function getFinanceData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get financial records this month
    const { data: monthRecords } = await supabase
      .from('financial_records')
      .select('id, amount, type, description, created_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false });

    // Calculate totals
    const income = (monthRecords || []).filter(r => r.type === 'income' || r.amount > 0);
    const expenses = (monthRecords || []).filter(r => r.type === 'expense' || r.amount < 0);
    
    const totalIncome = income.reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Get yearly data for comparison
    const { data: yearRecords } = await supabase
      .from('financial_records')
      .select('amount, type, created_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', startOfYear.toISOString());

    const yearlyIncome = (yearRecords || []).filter(r => r.type === 'income' || r.amount > 0)
      .reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);

    return {
      thisMonth: {
        income: totalIncome,
        expenses: totalExpenses,
        netProfit,
        transactionCount: (monthRecords || []).length
      },
      thisYear: {
        totalIncome: yearlyIncome
      },
      recentTransactions: (monthRecords || []).slice(0, 10).map(r => ({
        amount: r.amount,
        type: r.type,
        description: r.description?.substring(0, 50) || '',
        date: r.created_at
      }))
    };
  } catch (error) {
    console.error('Error fetching finance data:', error);
    return null;
  }
}

// ========================
// جلب بيانات إعدادات العيادة (شاملة)
// ========================
async function getClinicSettingsData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, address, booking_price, online_booking_enabled, available_time')
      .eq('clinic_uuid', clinicId)
      .single();

    if (!clinic) return null;

    // Parse available time
    let workingHours = {};
    if (clinic.available_time) {
      const days = typeof clinic.available_time === 'string' 
        ? JSON.parse(clinic.available_time) 
        : clinic.available_time;
      
      Object.keys(days).forEach(day => {
        if (!days[day].off) {
          workingHours[day] = `${days[day].start} - ${days[day].end}`;
        } else {
          workingHours[day] = 'إجازة';
        }
      });
    }

    return {
      name: clinic.name,
      address: clinic.address,
      bookingPrice: clinic.booking_price,
      onlineBookingEnabled: clinic.online_booking_enabled,
      workingHours
    };
  } catch (error) {
    console.error('Error fetching clinic settings:', error);
    return null;
  }
}

// ========================
// جلب بيانات الخطط العلاجية للمرضى (شاملة)
// ========================
async function getPatientPlansData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    // Get patient plans
    const { data: plans, count } = await supabase
      .from('patient_plans')
      .select('id, name, total_sessions, completed_sessions, status, patient:patients(name)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(20);

    const active = (plans || []).filter(p => p.status === 'active').length;
    const completed = (plans || []).filter(p => p.status === 'completed').length;

    return {
      total: count || 0,
      active,
      completed,
      plans: (plans || []).slice(0, 10).map(p => ({
        name: p.name,
        patientName: p.patient?.name || 'غير معروف',
        totalSessions: p.total_sessions,
        completedSessions: p.completed_sessions,
        status: p.status
      }))
    };
  } catch (error) {
    console.error('Error fetching patient plans:', error);
    return null;
  }
}

// ========================
// جلب قوالب الخطط العلاجية (شاملة)
// ========================
async function getTreatmentTemplatesData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const { data: templates, count } = await supabase
      .from('treatment_templates')
      .select('id, name, description, total_sessions, session_price, created_at', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    return {
      total: count || 0,
      templates: (templates || []).slice(0, 10).map(t => ({
        name: t.name,
        description: t.description?.substring(0, 50) || '',
        totalSessions: t.total_sessions,
        session_price: t.session_price
      }))
    };
  } catch (error) {
    console.error('Error fetching treatment templates:', error);
    return null;
  }
}

// ========================
// جلب بيانات الموظفين (شاملة)
// ========================
async function getStaffData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const { data: staff, count } = await supabase
      .from('users')
      .select('user_id, name, email, phone, permissions, created_at', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('role', 'secretary');

    // Parse permissions for each staff member
    const staffWithPermissions = (staff || []).map(s => {
      let perms = [];
      if (typeof s.permissions === 'string') {
        try { perms = JSON.parse(s.permissions); } catch (e) {}
      } else if (Array.isArray(s.permissions)) {
        perms = s.permissions;
      }
      return {
        name: s.name,
        email: s.email,
        phone: s.phone || 'غير محدد',
        permissions: perms,
        joinedAt: s.created_at
      };
    });

    return {
      total: count || 0,
      staff: staffWithPermissions
    };
  } catch (error) {
    console.error('Error fetching staff:', error);
    return null;
  }
}

// ========================
// جلب بيانات وضع العمل (مواعيد اليوم)
// ========================
async function getWorkModeData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const today = new Date().toISOString().split('T')[0];

    // Get today's appointments by status
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, status, date, from, patient:patients(name, phone)')
      .eq('clinic_id', clinicId)
      .gte('date', today + 'T00:00:00')
      .lte('date', today + 'T23:59:59')
      .order('date', { ascending: true });

    const pending = (appointments || []).filter(a => a.status === 'pending');
    const confirmed = (appointments || []).filter(a => a.status === 'confirmed');
    const inProgress = (appointments || []).filter(a => a.status === 'in_progress');
    const completed = (appointments || []).filter(a => a.status === 'completed');

    return {
      total: (appointments || []).length,
      pending: pending.length,
      confirmed: confirmed.length,
      inProgress: inProgress.length,
      completed: completed.length,
      nextPatient: confirmed[0]?.patient?.name || null,
      queue: (appointments || []).filter(a => ['pending', 'confirmed', 'in_progress'].includes(a.status)).map(a => ({
        name: a.patient?.name || 'غير معروف',
        phone: a.patient?.phone || '',
        time: a.date,
        status: a.status
      }))
    };
  } catch (error) {
    console.error('Error fetching work mode data:', error);
    return null;
  }
}

// ========================
// جلب بيانات الإشعارات (شاملة)
// ========================
async function getNotificationsData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    // Count unread notifications
    const { count: unread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_read', false);

    // Get total notifications
    const { count: total } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    // Get recent notifications with full details
    const { data: recent } = await supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(15);

    return {
      total: total || 0,
      unreadCount: unread || 0,
      recent: (recent || []).map(n => ({
        title: n.title,
        message: n.message?.substring(0, 100) || '',
        type: n.type,
        isRead: n.is_read,
        date: n.created_at
      }))
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return null;
  }
}

// ========================
// جلب إعدادات الحجز الإلكتروني
// ========================
async function getOnlineBookingData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    const { data: clinic } = await supabase
      .from('clinics')
      .select('clinic_uuid, name, online_booking_enabled, booking_price, available_time')
      .eq('clinic_uuid', clinicId)
      .single();

    if (!clinic) return null;

    const bookingLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/booking/${clinic.clinic_uuid}`;

    return {
      enabled: clinic.online_booking_enabled ?? true,
      bookingPrice: clinic.booking_price || 0,
      bookingLink: bookingLink,
      clinicName: clinic.name
    };
  } catch (error) {
    console.error('Error fetching online booking data:', error);
    return null;
  }
}

// ========================
// تفعيل/إيقاف الحجز الإلكتروني
// ========================
export async function toggleOnlineBooking(enable) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("مش مسجل دخول");

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (!userData?.clinic_id) throw new Error("مفيش عيادة");
    if (userData.role !== 'doctor') throw new Error("بس الدكتور يقدر يغير الإعدادات");

    const { error } = await supabase
      .from('clinics')
      .update({ online_booking_enabled: enable })
      .eq('clinic_uuid', userData.clinic_id);

    if (error) throw error;

    return { success: true, enabled: enable };
  } catch (error) {
    console.error('Error toggling online booking:', error);
    throw error;
  }
}

// ========================
// Fetch subscription data with limits - same logic as useSubscriptionUsage
// ========================
async function getSubscriptionData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return null;

    // Get subscription with plan limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plans:plan_id (
          id,
          name,
          price,
          limits
        )
      `)
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .single();

    // Parse limits - handle both string and object formats
    let limits = { max_patients: 50, max_appointments: 200 };
    if (subscription?.plans?.limits) {
      let planLimits;
      if (typeof subscription.plans.limits === 'string') {
        try {
          planLimits = JSON.parse(subscription.plans.limits);
        } catch (e) {
          console.error('Failed to parse plan limits string:', e);
        }
      } else {
        planLimits = subscription.plans.limits;
      }
      if (planLimits) {
        limits = { ...limits, ...planLimits };
      }
    }

    // Get total patients count (same as useSubscriptionUsage)
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    // Get appointments for current month (same date range as useSubscriptionUsage)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get total monthly appointments
    const { count: monthlyAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());

    // Get online booking appointments (from="booking") - same as useSubscriptionUsage
    const { count: onlineAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('from', 'booking')
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());

    // Calculate clinic appointments (from clinic directly)
    const clinicAppointments = (monthlyAppointments || 0) - (onlineAppointments || 0);

    const maxPatients = limits.max_patients;
    const maxAppointments = limits.max_appointments;
    const patientsCount = totalPatients || 0;
    const appointmentsCount = monthlyAppointments || 0;

    // Calculate percentages (handle unlimited = -1)
    const patientsPercentage = maxPatients === -1 ? 0 : Math.round((patientsCount / maxPatients) * 100);
    const appointmentsPercentage = maxAppointments === -1 ? 0 : Math.round((appointmentsCount / maxAppointments) * 100);

    const result = {
      planName: subscription?.plans?.name || 'الباقة المجانية',
      billingPeriod: subscription?.billing_period,
      periodEnd: subscription?.current_period_end,
      limits: {
        maxPatients: maxPatients === -1 ? 'غير محدود' : maxPatients,
        maxAppointments: maxAppointments === -1 ? 'غير محدود' : maxAppointments,
        patientsUsed: patientsCount,
        appointmentsUsed: appointmentsCount,
        patientsPercentage,
        appointmentsPercentage
      },
      // Booking source data
      bookingSources: {
        onlineAppointments: onlineAppointments || 0,
        clinicAppointments: clinicAppointments,
        totalMonthlyAppointments: monthlyAppointments || 0,
        onlinePercentage: monthlyAppointments > 0 ? Math.round((onlineAppointments / monthlyAppointments) * 100) : 0,
        clinicPercentage: monthlyAppointments > 0 ? Math.round((clinicAppointments / monthlyAppointments) * 100) : 0
      }
    };

    return result;
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return null;
  }
}

// ========================
// جلب كل البيانات للـ AI
// ========================
async function getAllAIContextData() {
  const [
    subDetails,
    treatmentData,
    staffData,
    workModeData,
    notificationsData,
    onlineBookingData,
    patientsData,
    visitsData,
    appointmentsData,
    financeData,
    clinicSettingsData,
    patientPlansData
  ] = await Promise.all([
    getSubscriptionData(),
    getTreatmentTemplatesData(),
    getStaffData(),
    getWorkModeData(),
    getNotificationsData(),
    getOnlineBookingData(),
    getPatientsData(),
    getVisitsData(),
    getAppointmentsData(),
    getFinanceData(),
    getClinicSettingsData(),
    getPatientPlansData()
  ]);

  return {
    subDetails,
    treatmentData,
    staffData,
    workModeData,
    notificationsData,
    onlineBookingData,
    patientsData,
    visitsData,
    appointmentsData,
    financeData,
    clinicSettingsData,
    patientPlansData
  };
}

// ========================
// System prompt للـ AI باللهجة المصرية مع قدرات الـ Actions
// ========================
const getSystemPrompt = (userData, clinicData, subscriptionData, statsData, allData) => {
  const { subDetails, treatmentData, staffData, workModeData, notificationsData, onlineBookingData, patientsData, visitsData, appointmentsData, financeData, clinicSettingsData, patientPlansData } = allData || {};
  const userName = userData?.name || "المستخدم";
  const clinicName = clinicData?.name || "العيادة";
  
  // Stats data
  const totalPatients = statsData?.totalPatients || 0;
  const todayAppointments = statsData?.todayAppointments || 0;
  const pendingAppointments = statsData?.pendingAppointments || 0;
  const totalIncome = statsData?.totalIncome || 0;
  
  // Subscription details (accurate from database)
  const planName = subDetails?.planName || 'الباقة المجانية';
  const maxPatients = subDetails?.limits?.maxPatients ?? 50;
  const maxAppointments = subDetails?.limits?.maxAppointments ?? 200;
  const patientsUsed = subDetails?.limits?.patientsUsed ?? 0;
  const appointmentsUsed = subDetails?.limits?.appointmentsUsed ?? 0;
  const patientsPercentage = subDetails?.limits?.patientsPercentage ?? 0;
  const appointmentsPercentage = subDetails?.limits?.appointmentsPercentage ?? 0;
  const patientsRemaining = typeof maxPatients === 'number' ? maxPatients - patientsUsed : 'غير محدود';
  
  // Booking source data
  const onlineAppointments = subDetails?.bookingSources?.onlineAppointments ?? 0;
  const clinicAppointments = subDetails?.bookingSources?.clinicAppointments ?? 0;
  const totalMonthlyAppointments = subDetails?.bookingSources?.totalMonthlyAppointments ?? 0;
  const onlinePercentage = subDetails?.bookingSources?.onlinePercentage ?? 0;
  const clinicPercentage = subDetails?.bookingSources?.clinicPercentage ?? 0;
  
  // Treatment templates data
  const totalTemplates = treatmentData?.total || 0;
  const templatesList = treatmentData?.templates || [];
  const templatesPreview = templatesList.slice(0, 5).map(t => `${t.name} (${t.session_price} جنيه)`).join('، ') || 'لا يوجد';
  
  // Staff data
  const totalStaff = staffData?.total || 0;
  const staffList = staffData?.staff || [];
  const staffPreview = staffList.slice(0, 3).map(s => s.name).join('، ') || 'لا يوجد';
  
  // Work mode data
  const workModePending = workModeData?.pending || 0;
  const workModeConfirmed = workModeData?.confirmed || 0;
  const workModeInProgress = workModeData?.inProgress || 0;
  const workModeCompleted = workModeData?.completed || 0;
  const workModeTotal = workModeData?.total || 0;
  const nextPatient = workModeData?.nextPatient || 'مفيش';
  
  // Notifications data
  const unreadNotifications = notificationsData?.unreadCount || 0;
  
  // Online booking data
  const onlineBookingEnabled = onlineBookingData?.enabled ?? true;
  const bookingLink = onlineBookingData?.bookingLink || '';
  const bookingPrice = onlineBookingData?.bookingPrice || 0;
  
  // Patients data
  const patientsTotal = patientsData?.total || 0;
  const patientsThisMonth = patientsData?.thisMonth || 0;
  const patientsMales = patientsData?.males || 0;
  const patientsFemales = patientsData?.females || 0;
  const recentPatients = patientsData?.recentPatients || [];
  const recentPatientsPreview = recentPatients.slice(0, 5).map(p => p.name).join('، ') || 'لا يوجد';
  
  // Visits data
  const visitsTotal = visitsData?.total || 0;
  const visitsThisMonth = visitsData?.thisMonth || 0;
  const recentVisits = visitsData?.recentVisits || [];
  
  // Appointments data
  const appointmentsTotal = appointmentsData?.total || 0;
  const appointmentsToday = appointmentsData?.today || {};
  const appointmentsThisWeek = appointmentsData?.thisWeek || 0;
  const appointmentsThisMonth = appointmentsData?.thisMonth || 0;
  const appointmentsPast = appointmentsData?.past || {};
  const appointmentsFuture = appointmentsData?.future || {};
  const todayAppointmentsList = appointmentsData?.todayAppointments || [];
  
  // Finance data
  const financeThisMonth = financeData?.thisMonth || {};
  const financeThisYear = financeData?.thisYear || {};
  const recentTransactions = financeData?.recentTransactions || [];
  
  // Clinic settings data
  const clinicAddress = clinicSettingsData?.address || 'غير محدد';
  const workingHours = clinicSettingsData?.workingHours || {};
  const workingHoursPreview = Object.entries(workingHours).slice(0, 3).map(([day, hours]) => `${day}: ${hours}`).join(' | ') || 'غير محدد';
  
  // Patient plans data
  const patientPlansTotal = patientPlansData?.total || 0;
  const patientPlansActive = patientPlansData?.active || 0;
  const patientPlansCompleted = patientPlansData?.completed || 0;
  const patientPlansList = patientPlansData?.plans || [];
  
  return `انت اسمك "طبيبي" (Tabibi) - مساعد ذكي متقدم لمنصة إدارة العيادات. بترد باللهجة المصرية بطريقة ودودة ومختصرة.

## معلومات المستخدم:
- الاسم: ${userName}
- العيادة: ${clinicName}
- العنوان: ${clinicAddress}
- مواعيد العمل: ${workingHoursPreview}

## بيانات الباقة:
- اسم الباقة: **${planName}**
- المرضى: **${patientsUsed}** / **${maxPatients}** (${patientsPercentage}%)
- المتبقي: **${patientsRemaining}** مريض
- المواعيد الشهرية: **${appointmentsUsed}** / **${maxAppointments}**

## المرضى (شامل):
- إجمالي المرضى: **${patientsTotal}**
- هذا الشهر: **${patientsThisMonth}** مريض جديد
- ذكور: **${patientsMales}** | إناث: **${patientsFemales}**
- آخر المرضى: ${recentPatientsPreview}

## الكشوفات/الزيارات (شامل):
- إجمالي الكشوفات: **${visitsTotal}**
- هذا الشهر: **${visitsThisMonth}** كشف

## المواعيد (شامل - كل المواعيد):
- إجمالي المواعيد: **${appointmentsTotal}**
- مواعيد النهاردة: **${appointmentsToday.total || 0}**
  - معلقة: ${appointmentsToday.pending || 0} | مؤكدة: ${appointmentsToday.confirmed || 0} | مكتملة: ${appointmentsToday.completed || 0}
  - من الموقع: ${appointmentsToday.fromOnline || 0} | من العيادة: ${appointmentsToday.fromClinic || 0}
- مواعيد الأسبوع: **${appointmentsThisWeek}**
- مواعيد الشهر: **${appointmentsThisMonth}**
- مواعيد الماضي (آخر 30 يوم): **${appointmentsPast.total || 0}**
- مواعيد المستقبل (الـ 30 يوم الجاية): **${appointmentsFuture.total || 0}**

## مصادر الحجوزات (الشهر الحالي):
- إجمالي: **${totalMonthlyAppointments}** ميعاد
- من الموقع: **${onlineAppointments}** (${onlinePercentage}%)
- من العيادة: **${clinicAppointments}** (${clinicPercentage}%)

## الماليات (شامل):
- إيرادات الشهر: **${financeThisMonth.income || 0}** جنيه
- مصروفات الشهر: **${financeThisMonth.expenses || 0}** جنيه
- صافي الربح: **${financeThisMonth.netProfit || 0}** جنيه
- إيرادات السنة: **${financeThisYear.totalIncome || 0}** جنيه

## قوالب الخطط العلاجية:
- عدد القوالب: **${totalTemplates}**
- أمثلة: ${templatesPreview}

## خطط المرضى العلاجية:
- إجمالي الخطط: **${patientPlansTotal}**
- نشطة: **${patientPlansActive}** | مكتملة: **${patientPlansCompleted}**

## الموظفين (السكرتارية):
- عدد الموظفين: **${totalStaff}**
- الأسماء: ${staffPreview}

## وضع العمل (اليوم):
- إجمالي: **${workModeTotal}** ميعاد
- جديد: **${workModePending}** | مؤكد: **${workModeConfirmed}** | بيتكشف: **${workModeInProgress}** | مكتمل: **${workModeCompleted}**
- المريض التالي: **${nextPatient}**

## الإشعارات:
- غير مقروءة: **${unreadNotifications}** إشعار

## الحجز الإلكتروني:
- الحالة: **${onlineBookingEnabled ? 'مفعل' : 'متوقف'}**
- سعر الكشف: **${bookingPrice}** جنيه
- الرابط: ${bookingLink}

## الـ Actions:

**زر للتنقل:**
\`\`\`action
{"type": "button", "label": "النص", "navigate": "/path", "icon": "IconName"}
\`\`\`

**زر لفتح نافذة:**
\`\`\`action
{"type": "button", "label": "إضافة ميعاد", "openComponent": "new-appointment", "icon": "CalendarPlus"}
\`\`\`

**زر لتنفيذ أمر:**
\`\`\`action
{"type": "button", "label": "تفعيل الحجز", "action": "enableOnlineBooking", "icon": "Globe"}
\`\`\`
\`\`\`action
{"type": "button", "label": "إيقاف الحجز", "action": "disableOnlineBooking", "icon": "XCircle"}
\`\`\`
\`\`\`action
{"type": "button", "label": "نسخ رابط الحجز", "action": "copyBookingLink", "icon": "Copy"}
\`\`\`

**شريط تقدم:**
\`\`\`action
{"type": "progress", "label": "العنوان", "value": 75}
\`\`\`

**أنواع الرسوم البيانية:**

1. رسم الأعمدة العمودي (bar/vertical-bar):
\`\`\`action
{"type": "chart", "chartType": "bar", "title": "العنوان", "data": [{"label": "عنصر1", "value": 25, "color": "primary"}, {"label": "عنصر2", "value": 75, "color": "success"}]}
\`\`\`

2. رسم الأعمدة الأفقي (horizontal-bar):
\`\`\`action
{"type": "chart", "chartType": "horizontal-bar", "title": "العنوان", "data": [{"label": "عنصر1", "value": 40, "color": "blue"}, {"label": "عنصر2", "value": 60, "color": "purple"}]}
\`\`\`

3. رسم الخطوط (line):
\`\`\`action
{"type": "chart", "chartType": "line", "title": "الاتجاه", "data": [{"label": "يناير", "value": 10}, {"label": "فبراير", "value": 25}, {"label": "مارس", "value": 18}, {"label": "أبريل", "value": 35}]}
\`\`\`

4. رسم دائري (pie/donut):
\`\`\`action
{"type": "chart", "chartType": "pie", "title": "التوزيع", "data": [{"label": "قسم1", "value": 40, "color": "primary"}, {"label": "قسم2", "value": 30, "color": "success"}, {"label": "قسم3", "value": 30, "color": "warning"}]}
\`\`\`

**الألوان المتاحة:** primary, secondary, success, warning, danger, blue, purple, pink, indigo, cyan

## الأيقونات:
[icon:CheckCircle] [icon:Star] [icon:Rocket] [icon:Users] [icon:Calendar] [icon:CreditCard] [icon:Globe] [icon:Bell] [icon:Settings] [icon:FileText] [icon:Clock] [icon:UserPlus] [icon:XCircle] [icon:Copy] [icon:ExternalLink] [icon:TrendingUp] [icon:DollarSign] [icon:Activity] [icon:PieChart] [icon:BarChart]

## الصفحات:
- /dashboard - لوحة التحكم
- /appointments - المواعيد
- /patients - المرضى
- /clinic - العيادة
- /finance - الحسابات
- /settings - الإعدادات
- /subscriptions - الاشتراكات
- /online-booking - الحجز الإلكتروني
- /work-mode - وضع العمل
- /treatments - الخطط العلاجية
- /staff - الموظفين
- /notifications - الإشعارات

## النوافذ:
- new-appointment: إضافة ميعاد جديد
- new-patient: إضافة مريض جديد
- new-treatment: إضافة خطة علاجية
- new-staff: إضافة موظف جديد

## الأوامر التنفيذية:
- enableOnlineBooking: تفعيل الحجز الإلكتروني
- disableOnlineBooking: إيقاف الحجز الإلكتروني
- copyBookingLink: نسخ رابط الحجز

## أمثلة:

### لما حد يسأل عن المرضى:
[icon:Users] عندك **${patientsTotal}** مريض (${patientsThisMonth} جديد هذا الشهر)
\`\`\`action
{"type": "chart", "chartType": "pie", "title": "توزيع المرضى", "data": [{"label": "ذكور", "value": ${patientsMales}, "color": "blue"}, {"label": "إناث", "value": ${patientsFemales}, "color": "pink"}]}
\`\`\`
\`\`\`action
{"type": "button", "label": "عرض المرضى", "navigate": "/patients", "icon": "Users"}
\`\`\`

### لما حد يسأل عن الماليات:
[icon:DollarSign] **الماليات هذا الشهر:**
- إيرادات: ${financeThisMonth.income || 0} جنيه
- مصروفات: ${financeThisMonth.expenses || 0} جنيه
- صافي: ${financeThisMonth.netProfit || 0} جنيه
\`\`\`action
{"type": "chart", "chartType": "bar", "title": "الماليات", "data": [{"label": "إيرادات", "value": ${financeThisMonth.income || 0}, "color": "success"}, {"label": "مصروفات", "value": ${financeThisMonth.expenses || 0}, "color": "danger"}]}
\`\`\`
\`\`\`action
{"type": "button", "label": "عرض الحسابات", "navigate": "/finance", "icon": "CreditCard"}
\`\`\`

### لما حد يسأل عن مصادر الحجوزات:
[icon:PieChart] **مصادر الحجوزات هذا الشهر:**
\`\`\`action
{"type": "chart", "chartType": "pie", "title": "مصادر الحجوزات", "data": [{"label": "من الموقع", "value": ${onlineAppointments}, "color": "primary"}, {"label": "من العيادة", "value": ${clinicAppointments}, "color": "secondary"}]}
\`\`\`

### لما حد يسأل عن الخطط العلاجية:
[icon:FileText] عندك **${totalTemplates}** قالب خطة علاجية و **${patientPlansTotal}** خطة للمرضى (${patientPlansActive} نشطة)
\`\`\`action
{"type": "button", "label": "عرض كل الخطط", "navigate": "/treatments", "icon": "FileText"}
\`\`\`
\`\`\`action
{"type": "button", "label": "إضافة خطة جديدة", "openComponent": "new-treatment", "icon": "Plus"}
\`\`\`

### لما حد يسأل عن الموظفين:
[icon:Users] عندك **${totalStaff}** موظف: ${staffPreview}
\`\`\`action
{"type": "button", "label": "إدارة الموظفين", "navigate": "/staff", "icon": "Users"}
\`\`\`
\`\`\`action
{"type": "button", "label": "إضافة موظف", "openComponent": "new-staff", "icon": "UserPlus"}
\`\`\`

### لما حد يسأل عن الإشعارات:
[icon:Bell] عندك **${unreadNotifications}** إشعار جديد
\`\`\`action
{"type": "button", "label": "عرض الإشعارات", "navigate": "/notifications", "icon": "Bell"}
\`\`\`

### لما حد يسأل عن وضع العمل:
[icon:Clock] مواعيد النهاردة: **${workModeTotal}** (جديد: ${workModePending} | مؤكد: ${workModeConfirmed} | بيتكشف: ${workModeInProgress})
\`\`\`action
{"type": "button", "label": "فتح وضع العمل", "navigate": "/work-mode", "icon": "Clock"}
\`\`\`

### لما حد عايز يفعل/يوقف الحجز الإلكتروني:
${onlineBookingEnabled ? '[icon:CheckCircle] الحجز الإلكتروني **مفعل** دلوقتي' : '[icon:XCircle] الحجز الإلكتروني **متوقف** دلوقتي'}
\`\`\`action
{"type": "button", "label": "${onlineBookingEnabled ? 'إيقاف الحجز' : 'تفعيل الحجز'}", "action": "${onlineBookingEnabled ? 'disableOnlineBooking' : 'enableOnlineBooking'}", "icon": "${onlineBookingEnabled ? 'XCircle' : 'Globe'}"}
\`\`\`

### لما حد عايز رابط الحجز:
[icon:Globe] ده رابط الحجز الخاص بعيادتك:
**${bookingLink}**
\`\`\`action
{"type": "button", "label": "نسخ الرابط", "action": "copyBookingLink", "icon": "Copy"}
\`\`\`
\`\`\`action
{"type": "button", "label": "فتح صفحة الحجز", "navigate": "/online-booking", "icon": "ExternalLink"}
\`\`\`

## تعليمات مهمة:
1. استخدم البيانات الحقيقية فقط - متختلقش أرقام
2. لو حد طلب حاجة مش موجودة، قول "مش متاح" بدل ما تختلق بيانات
3. استخدم [icon:Name] بدل الإيموجي
4. الـ JSON لازم يكون صحيح 100%
5. الرد مختصر وواضح
6. لو حد عايز ينفذ أمر (تفعيل/إيقاف)، استخدم action button
7. لو حد عايز يروح صفحة، استخدم navigate button
8. لو حد عايز يفتح نافذة، استخدم openComponent button
9. استخدم الرسوم البيانية لتوضيح البيانات بصريا عند الحاجة
10. اختر نوع الرسم البياني المناسب للبيانات (pie للنسب، bar للمقارنات، line للاتجاهات)
11. عندك بيانات كل المواعيد (الماضي والحالي والمستقبل) - متقولش إنك معندكش بيانات
12. عندك بيانات كل الماليات (إيرادات ومصروفات) - قدر توصلها

## تحذير أمني مهم جدا:
- **ممنوع منعا باتا** الوصول لأكواد الخصم أو ذكرها نهائيا
- **ممنوع منعا باتا** الوصول لبيانات مستخدمين آخرين
- لو حد سأل عن أكواد الخصم، قل: "معلش، مش مسموح ليا أوصل لأكواد الخصم"
- كل البيانات اللي بتوصلها هي بيانات العيادة الحالية فقط`;
};

// إنشاء محادثة جديدة
export async function createConversation(clinicId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("مش مسجل دخول");

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: session.user.id,
      clinic_id: clinicId,
      title: "محادثة جديدة"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// جلب كل المحادثات
export async function getConversations() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("مش مسجل دخول");

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// جلب رسائل محادثة معينة
export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// حفظ رسالة
export async function saveMessage(conversationId, role, content) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// تحديث عنوان المحادثة
export async function updateConversationTitle(conversationId, title) {
  const { error } = await supabase
    .from("chat_conversations")
    .update({ title })
    .eq("id", conversationId);

  if (error) throw error;
}

// حذف محادثة
export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId);

  if (error) throw error;
}

// أرشفة محادثة
export async function archiveConversation(conversationId) {
  const { error } = await supabase
    .from("chat_conversations")
    .update({ is_archived: true })
    .eq("id", conversationId);

  if (error) throw error;
}

// إرسال رسالة للـ AI
export async function sendMessageToAI(messages, userData, clinicData, subscriptionData, deepReasoning = false) {
  // Fetch all context data in parallel
  let statsData = null;
  let allData = null;
  
  try {
    const [stats, contextData] = await Promise.all([
      getDashboardStats().catch(err => {
        console.error("Failed to fetch stats:", err);
        return { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
      }),
      getAllAIContextData().catch(err => {
        console.error("Failed to fetch context data:", err);
        return {};
      })
    ]);
    statsData = stats;
    allData = contextData;
  } catch (error) {
    console.error("Failed to fetch AI context:", error);
    statsData = { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
    allData = {};
  }
  
  const systemPrompt = getSystemPrompt(userData, clinicData, subscriptionData, statsData, allData);
  
  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const requestBody = {
      model: AI_MODEL,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2000
    };
    
    // Add reasoning only if enabled
    if (deepReasoning) {
      requestBody.reasoning = { enabled: true };
    }
    
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Tabibi - Clinic Management System",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("AI API Error:", errorData);
      throw new Error("حصل مشكلة في التواصل مع الـ AI");
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    throw new Error("الرد من الـ AI مش واضح");
  } catch (error) {
    console.error("Error calling AI:", error);
    throw error;
  }
}

// Streaming version للرسائل (لو عايز تعرض الرد حرف حرف)
export async function sendMessageToAIStream(messages, userData, clinicData, subscriptionData, onChunk) {
  // Fetch all context data in parallel
  let statsData = null;
  let allData = null;
  
  try {
    const [stats, contextData] = await Promise.all([
      getDashboardStats().catch(err => {
        console.error("Failed to fetch stats:", err);
        return { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
      }),
      getAllAIContextData().catch(err => {
        console.error("Failed to fetch context data:", err);
        return {};
      })
    ]);
    statsData = stats;
    allData = contextData;
  } catch (error) {
    console.error("Failed to fetch AI context:", error);
    statsData = { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
    allData = {};
  }
  
  const systemPrompt = getSystemPrompt(userData, clinicData, subscriptionData, statsData, allData);
  
  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Tabibi - Clinic Management System",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error("حصل مشكلة في التواصل مع الـ AI");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              onChunk(content, fullContent);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error("Error streaming AI:", error);
    throw error;
  }
}
