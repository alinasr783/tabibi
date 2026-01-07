import supabase from "../../services/supabase";
import { getDashboardStats } from "../../services/apiDashboard";

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
      .select('id, name, phone, age, gender, address, created_at')
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
        address: p.address?.substring(0, 50) || ''
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

    // Get previous month's appointments for comparison
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const { count: prevMonthCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', prevMonthStart.toISOString())
      .lte('date', prevMonthEnd.toISOString());

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
      previousMonth: prevMonthCount || 0,
      monthOverMonthChange: prevMonthCount > 0 ? Math.round(((monthCount - prevMonthCount) / prevMonthCount) * 100) : 0,
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
      .select('clinic_id, clinic_id_bigint')
      .eq('user_id', session.user.id)
      .single();

    // financial_records uses bigint clinic_id
    const clinicIdBigint = userData?.clinic_id_bigint;
    if (!clinicIdBigint) return null;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get financial records this month
    const { data: monthRecords } = await supabase
      .from('financial_records')
      .select('id, amount, type, description, created_at')
      .eq('clinic_id', clinicIdBigint)
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
      .eq('clinic_id', clinicIdBigint)
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
      })),
      // Monthly breakdown for charts
      monthlyBreakdown: getMonthlyBreakdownFromRecords(yearRecords || [])
    };
  } catch (error) {
    console.error('Error fetching finance data:', error);
    return null;
  }
}

// Helper function to get monthly breakdown for charts
function getMonthlyBreakdownFromRecords(records) {
  const months = {};
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  records.forEach(r => {
    const date = new Date(r.created_at);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthName = arabicMonths[date.getMonth()];
    
    if (!months[monthKey]) {
      months[monthKey] = { name: monthName, income: 0, expenses: 0 };
    }
    
    if (r.type === 'income' || r.amount > 0) {
      months[monthKey].income += Math.abs(r.amount || 0);
    } else {
      months[monthKey].expenses += Math.abs(r.amount || 0);
    }
  });
  
  // Return last 6 months sorted
  return Object.values(months).slice(-6);
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

    // Get patient plans with template name
    const { data: plans, count } = await supabase
      .from('patient_plans')
      .select('id, total_sessions, completed_sessions, status, patient:patients(name), template:treatment_templates(name)', { count: 'exact' })
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
        name: p.template?.name || 'خطة علاجية',
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
      .select('id, name, description, session_count, session_price, created_at', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    return {
      total: count || 0,
      templates: (templates || []).slice(0, 10).map(t => ({
        name: t.name,
        description: t.description?.substring(0, 50) || '',
        totalSessions: t.session_count,
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

export {
  getPatientsData,
  getVisitsData,
  getAppointmentsData,
  getFinanceData,
  getClinicSettingsData,
  getPatientPlansData,
  getTreatmentTemplatesData,
  getStaffData,
  getWorkModeData,
  getNotificationsData,
  getOnlineBookingData,
  getSubscriptionData,
  getAllAIContextData,
  getMonthlyBreakdownFromRecords
};
