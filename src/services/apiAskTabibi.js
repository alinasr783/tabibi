import supabase from "./supabase";
import { getDashboardStats } from "./apiDashboard";
import { updateUserPreferences, getUserPreferences } from "./apiUserPreferences";
import { createPatient, updatePatient } from "./apiPatients";
import { createAppointment, updateAppointment, deleteAppointment } from "./apiAppointments";
import { createVisit, updateVisit, deleteVisit } from "./apiVisits";
import { addSecretary } from "./apiAuth";
import { updateClinic } from "./apiClinic";
import {
  sendMessageToAI as originalSendMessageToAI,
  sendMessageToAIStream as originalSendMessageToAIStream,
  ai,
  getCurrentDateTime,
  isComplexQuery
} from "../ai/services/aiService";

// ========================
// Tabibi Actions - CRUD Operations for AI
// ========================

// Helper to get clinic data
async function getClinicContext() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("مش مسجل دخول");

  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!userData?.clinic_id) throw new Error("مفيش عيادة");

  return { userId: session.user.id, clinicId: userData.clinic_id, role: userData.role };
}

// Helper to find next available time slot
async function findNextAvailableSlot(date, startHour, clinicId) {
  // Check next 8 hours for availability
  for (let hour = startHour + 1; hour < startHour + 9 && hour < 22; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const startTime = `${date}T${timeStr}:00`;
    const endTime = `${date}T${hour}:59:59`;

    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', startTime)
      .lte('date', endTime)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (count < 3) {
      return {
        time: timeStr,
        appointmentCount: count || 0
      };
    }
  }

  return null;
}

// Guess gender from Arabic name
function guessGenderFromName(name) {
  if (!name) return 'male';
  const femaleEndings = ['ة', 'اء', 'ى'];
  const femaleNames = ['فاطمة', 'مريم', 'نورا', 'سارة', 'ريم', 'هند', 'منى', 'دعاء', 'آية', 'نور', 'سلمى', 'رنا', 'دينا', 'مها', 'هبة', 'نهى', 'ولاء', 'إيمان', 'أماني'];
  const firstName = name.split(' ')[0];

  if (femaleNames.some(fn => firstName.includes(fn))) return 'female';
  if (femaleEndings.some(ending => firstName.endsWith(ending))) return 'female';
  return 'male';
}

// ========================
// AI Executable Actions
// ========================
export const AI_ACTIONS = {
  // Patient Actions
  async createPatientAction(data) {
    const { name, phone, gender, age, address, blood_type, date_of_birth } = data;

    if (!name) throw new Error("لازم تديني اسم المريض");
    if (!phone) throw new Error("لازم تديني رقم موبايل المريض");

    const patientData = {
      name,
      phone,
      gender: gender || guessGenderFromName(name),
      age: age || null,
      address: address || null,
      blood_type: blood_type || null,
      date_of_birth: date_of_birth || null
    };

    const result = await createPatient(patientData);
    return {
      success: true,
      message: `تم إضافة المريض "${name}" بنجاح`,
      data: result,
      patientId: result.id
    };
  },

  async updatePatientAction(data) {
    const { patientId, ...updateData } = data;
    if (!patientId) throw new Error("لازم تديني ID المريض");

    const result = await updatePatient(patientId, updateData);
    return { success: true, message: "تم تعديل بيانات المريض بنجاح", data: result };
  },

  async searchPatientAction(data) {
    const { query } = data;
    const { clinicId } = await getClinicContext();

    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, phone, gender, age')
      .eq('clinic_id', clinicId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    return { success: true, patients: patients || [] };
  },

  // Disambiguation - resolve ambiguous patient selection
  async resolvePatientAction(data) {
    const { name } = data;
    if (!name) throw new Error("لازم تديني اسم المريض");

    const { clinicId } = await getClinicContext();

    // Search for patients with similar name
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, phone, age, address')
      .eq('clinic_id', clinicId)
      .ilike('name', `%${name}%`)
      .limit(10);

    if (!patients || patients.length === 0) {
      return {
        success: false,
        message: `مفيش مريض باسم "${name}"`,
        patients: []
      };
    }

    if (patients.length === 1) {
      return {
        success: true,
        message: `تم العثور على المريض "${patients[0].name}"`,
        patients: patients,
        patientId: patients[0].id,
        needsDisambiguation: false
      };
    }

    // Multiple patients found - needs disambiguation
    return {
      success: true,
      message: `لقيت ${patients.length} مريض باسم "${name}"`,
      patients: patients,
      needsDisambiguation: true
    };
  },

  // Appointment Actions
  async createAppointmentAction(data) {
    const { patientId, patientName, patientPhone, date, time, notes, price } = data;

    let finalPatientId = patientId;
    let finalPatientPhone = patientPhone;

    const { clinicId } = await getClinicContext();

    // If no patientId provided, search by name first
    if (!finalPatientId && patientName) {
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', clinicId)
        .ilike('name', `%${patientName}%`)
        .limit(5);

      if (patients && patients.length > 0) {
        // If exact match found, use it
        const exactMatch = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        if (exactMatch) {
          finalPatientId = exactMatch.id;
          finalPatientPhone = exactMatch.phone;
        } else if (patients.length === 1) {
          // Only one patient found, use it
          finalPatientId = patients[0].id;
          finalPatientPhone = patients[0].phone;
        }
      }
    }

    // If still no patient found and no phone provided, ask for phone
    if (!finalPatientId && !finalPatientPhone) {
      throw new Error(`مفيش مريض باسم "${patientName}" في قاعدة البيانات. محتاج رقم الموبايل عشان أضيفه.`);
    }

    // If have phone but no ID, try to find or create patient
    if (!finalPatientId && finalPatientPhone) {
      // Try to find existing patient by phone
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('phone', finalPatientPhone)
        .single();

      if (existingPatient) {
        finalPatientId = existingPatient.id;
      } else {
        // Create new patient
        const newPatient = await createPatient({
          name: patientName,
          phone: finalPatientPhone,
          gender: guessGenderFromName(patientName)
        });
        finalPatientId = newPatient.id;
      }
    }

    if (!finalPatientId) throw new Error("لازم تديني بيانات المريض (اسمه ورقم موبايله)");
    if (!date) throw new Error("لازم تديني تاريخ الموعد");

    // Get booking price from clinic settings if not provided
    let finalPrice = price;
    if (!finalPrice) {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('booking_price')
        .eq('clinic_uuid', clinicId)
        .single();

      finalPrice = clinic?.booking_price || 0;
    }

    // Combine date and time
    let appointmentDate = date;
    if (time) {
      appointmentDate = `${date}T${time}:00`;
    }

    const appointmentData = {
      patient_id: finalPatientId,
      date: appointmentDate,
      notes: notes || null,
      price: finalPrice,
      status: 'confirmed'
    };

    const result = await createAppointment(appointmentData);
    return {
      success: true,
      message: `تم إضافة الموعد بنجاح لـ "${patientName}" يوم ${date} ${time ? `الساعة ${time}` : ''}`,
      data: result,
      appointmentId: result.id
    };
  },

  // Check availability at specific time slot
  async checkAvailabilityAction(data) {
    const { date, time } = data;
    if (!date || !time) throw new Error("لازم تديني التاريخ والوقت");

    const { clinicId } = await getClinicContext();

    // Create time range for the hour (e.g., 15:00-16:00)
    const [hour] = time.split(':');
    const startTime = `${date}T${hour}:00:00`;
    const endTime = `${date}T${hour}:59:59`;

    // Get appointments in this time slot
    const { data: appointments, count } = await supabase
      .from('appointments')
      .select('id, patient:patients(name), date, status', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .gte('date', startTime)
      .lte('date', endTime)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    const isBusy = count >= 3;

    if (!isBusy) {
      return {
        success: true,
        available: true,
        message: `الساعة ${time} فاضية`,
        appointmentCount: count || 0,
        appointments: appointments || []
      };
    }

    // Find next available slot
    const nextSlot = await findNextAvailableSlot(date, parseInt(hour), clinicId);

    return {
      success: true,
      available: false,
      message: `الساعة ${time} فيها زحمة وفيها ${count} موعد`,
      appointmentCount: count,
      appointments: (appointments || []).map(a => ({
        patientName: a.patient?.name || 'غير معروف',
        time: a.date
      })),
      nextAvailableSlot: nextSlot
    };
  },

  async updateAppointmentAction(data) {
    const { appointmentId, ...updateData } = data;
    if (!appointmentId) throw new Error("لازم تديني ID الموعد");

    const result = await updateAppointment(appointmentId, updateData);
    return { success: true, message: "تم تعديل الموعد بنجاح", data: result };
  },

  // Reschedule appointment (change date/time)
  async rescheduleAppointmentAction(data) {
    const { appointmentId, date, time } = data;
    if (!appointmentId) throw new Error("لازم تديني ID الموعد");
    if (!date) throw new Error("لازم تديني التاريخ الجديد");

    let appointmentDate = date;
    if (time) {
      appointmentDate = `${date}T${time}:00`;
    }

    const result = await updateAppointment(appointmentId, { date: appointmentDate });
    return {
      success: true,
      message: `تم إعادة جدولة الموعد لـ ${date} ${time ? `الساعة ${time}` : ''}`,
      data: result,
      appointmentId: result.id
    };
  },

  async cancelAppointmentAction(data) {
    const { appointmentId } = data;
    if (!appointmentId) throw new Error("لازم تديني ID الموعد");

    const result = await updateAppointment(appointmentId, { status: 'cancelled' });
    return { success: true, message: "تم إلغاء الموعد بنجاح", data: result };
  },

  // Get appointment details by ID
  async getAppointmentDetailsAction(data) {
    const { appointmentId } = data;
    if (!appointmentId) throw new Error("لازم تديني ID الموعد");

    const { clinicId } = await getClinicContext();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        notes,
        price,
        status,
        from,
        created_at,
        patient:patients(id, name, phone, age, gender, address)
      `)
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) throw new Error(`مش لاقي الموعد ده: ${error.message}`);

    return {
      success: true,
      appointment: {
        id: appointment.id,
        patientName: appointment.patient?.name || 'غير معروف',
        patientPhone: appointment.patient?.phone || '',
        patientAge: appointment.patient?.age,
        patientGender: appointment.patient?.gender,
        date: appointment.date,
        time: appointment.date ? new Date(appointment.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
        price: appointment.price,
        status: appointment.status,
        source: appointment.from === 'booking' ? 'إلكتروني' : 'العيادة',
        notes: appointment.notes,
        createdAt: appointment.created_at
      }
    };
  },

  // Filter appointments by criteria
  async filterAppointmentsAction(data) {
    const { status, date, source, limit = 50 } = data;
    const { clinicId } = await getClinicContext();

    let query = supabase
      .from('appointments')
      .select(`
        id,
        date,
        notes,
        price,
        status,
        from,
        created_at,
        patient:patients(id, name, phone, age)
      `, { count: 'exact' })
      .eq('clinic_id', clinicId);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (source && source !== 'all') {
      query = query.eq('from', source);
    }

    if (date) {
      const startDate = `${date}T00:00:00`;
      const endDate = `${date}T23:59:59`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.order('date', { ascending: false }).limit(limit);

    const { data: appointments, count, error } = await query;

    if (error) throw new Error(`فشل جلب المواعيد: ${error.message}`);

    const formattedAppointments = (appointments || []).map(a => ({
      id: a.id,
      patientName: a.patient?.name || 'غير معروف',
      patientPhone: a.patient?.phone || '',
      patientAge: a.patient?.age,
      date: a.date,
      time: a.date ? new Date(a.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      price: a.price,
      status: a.status,
      source: a.from === 'booking' ? 'إلكتروني' : 'العيادة',
      notes: a.notes,
      createdAt: a.created_at
    }));

    // Status labels in Arabic
    const statusLabels = {
      pending: 'معلق',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      rejected: 'مرفوض',
      in_progress: 'جاري الكشف'
    };

    return {
      success: true,
      total: count || 0,
      appointments: formattedAppointments,
      filters: {
        status: status ? statusLabels[status] || status : 'الكل',
        date: date || 'الكل',
        source: source === 'booking' ? 'إلكتروني' : source === 'clinic' ? 'العيادة' : 'الكل'
      }
    };
  },

  // Visit/Examination Actions
  async createVisitAction(data) {
    const { patientId, diagnosis, notes, medications } = data;

    if (!patientId) throw new Error("لازم تديني ID المريض");

    const visitData = {
      patient_id: patientId,
      diagnosis: diagnosis || null,
      notes: notes || null,
      medications: medications || null
    };

    const result = await createVisit(visitData);
    return { success: true, message: "تم إضافة الكشف بنجاح", data: result };
  },

  // Staff Actions
  async addStaffAction(data) {
    const { name, email, password, phone, permissions } = data;
    const { clinicId } = await getClinicContext();

    if (!name) throw new Error("لازم تديني اسم الموظف");
    if (!email) throw new Error("لازم تديني إيميل الموظف");
    if (!password) throw new Error("لازم تديني باسورد للموظف");

    const result = await addSecretary({
      name,
      email,
      password,
      phone: phone || '',
      clinicId,
      permissions: permissions || ['dashboard', 'calendar', 'patients']
    });

    return { success: true, message: `تم إضافة الموظف "${name}" بنجاح`, data: result };
  },

  // Clinic Settings Actions
  async setClinicDayOffAction(data) {
    const { day, off } = data;
    const { clinicId } = await getClinicContext();

    // Get current clinic settings
    const { data: clinic } = await supabase
      .from('clinics')
      .select('available_time')
      .eq('clinic_uuid', clinicId)
      .single();

    let availableTime = clinic?.available_time || {};
    if (typeof availableTime === 'string') {
      availableTime = JSON.parse(availableTime);
    }

    // Map day names
    const dayMap = {
      'السبت': 'saturday', 'saturday': 'saturday',
      'الأحد': 'sunday', 'sunday': 'sunday',
      'الاثنين': 'monday', 'monday': 'monday',
      'الثلاثاء': 'tuesday', 'tuesday': 'tuesday',
      'الأربعاء': 'wednesday', 'wednesday': 'wednesday',
      'الخميس': 'thursday', 'thursday': 'thursday',
      'الجمعة': 'friday', 'friday': 'friday'
    };

    const dayKey = dayMap[day.toLowerCase()] || day.toLowerCase();

    if (!availableTime[dayKey]) {
      availableTime[dayKey] = { start: '09:00', end: '17:00', off: false };
    }
    availableTime[dayKey].off = off !== false;

    await supabase
      .from('clinics')
      .update({ available_time: availableTime })
      .eq('clinic_uuid', clinicId);

    return {
      success: true,
      message: off !== false ? `تم إقفال الحجز يوم ${day}` : `تم فتح الحجز يوم ${day}`
    };
  },

  async updateClinicHoursAction(data) {
    const { day, start, end } = data;
    const { clinicId } = await getClinicContext();

    const { data: clinic } = await supabase
      .from('clinics')
      .select('available_time')
      .eq('clinic_uuid', clinicId)
      .single();

    let availableTime = clinic?.available_time || {};
    if (typeof availableTime === 'string') {
      availableTime = JSON.parse(availableTime);
    }

    const dayMap = {
      'السبت': 'saturday', 'الأحد': 'sunday', 'الاثنين': 'monday',
      'الثلاثاء': 'tuesday', 'الأربعاء': 'wednesday',
      'الخميس': 'thursday', 'الجمعة': 'friday'
    };

    const dayKey = dayMap[day] || day.toLowerCase();
    availableTime[dayKey] = { start, end, off: false };

    await supabase
      .from('clinics')
      .update({ available_time: availableTime })
      .eq('clinic_uuid', clinicId);

    return { success: true, message: `تم تعديل مواعيد يوم ${day} من ${start} إلى ${end}` };
  },

  async updateBookingPriceAction(data) {
    const { price } = data;
    const { clinicId } = await getClinicContext();

    await supabase
      .from('clinics')
      .update({ booking_price: price })
      .eq('clinic_uuid', clinicId);

    return { success: true, message: `تم تعديل سعر الكشف إلى ${price} جنيه` };
  },

  // Theme & Appearance Actions
  async changeThemeAction(data) {
    const { mode } = data;

    if (!['light', 'dark', 'system'].includes(mode)) {
      throw new Error("اختار light أو dark أو system");
    }

    const root = document.documentElement;

    if (mode === 'light') {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else if (mode === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', 'system');
    }

    return {
      success: true,
      message: mode === 'light' ? 'تم التغيير للوضع النهاري' :
        mode === 'dark' ? 'تم التغيير للوضع الليلي' :
          'تم التغيير لوضع النظام'
    };
  },

  async changeColorsAction(data) {
    const { primary, secondary, accent, preset } = data;

    // Preset color themes - HSL values WITHOUT wrapper (Tailwind format)
    const presets = {
      brown: { primary: '25 59% 30%', secondary: '19 57% 41%', accent: '25 75% 47%' },
      red: { primary: '0 84% 60%', secondary: '0 72% 51%', accent: '0 91% 71%' },
      blue: { primary: '217 91% 60%', secondary: '221 83% 53%', accent: '213 94% 68%' },
      green: { primary: '142 71% 45%', secondary: '142 76% 36%', accent: '142 69% 58%' },
      purple: { primary: '271 81% 56%', secondary: '271 91% 46%', accent: '271 91% 65%' },
      orange: { primary: '21 90% 48%', secondary: '21 90% 41%', accent: '25 95% 53%' },
      pink: { primary: '330 81% 60%', secondary: '330 81% 45%', accent: '330 81% 75%' },
      teal: { primary: '174 72% 40%', secondary: '174 84% 32%', accent: '174 58% 50%' },
      default: { primary: '187 85% 35%', secondary: '224 76% 45%', accent: '210 40% 96.1%' }
    };

    const root = document.documentElement;

    // Use preset if specified
    if (preset && presets[preset]) {
      const colors = presets[preset];
      root.style.setProperty('--primary', colors.primary);
      root.style.setProperty('--secondary', colors.secondary);
      root.style.setProperty('--accent', colors.accent);

      // Also update foreground colors for visibility
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--secondary-foreground', '0 0% 100%');

      return {
        success: true,
        message: `تم تطبيق ألوان ${preset} بنجاح`,
        preset
      };
    }

    // Custom hex colors
    if (!primary && !secondary && !accent) {
      throw new Error("لازم تديني لون واحد على الأقل أو اختار preset");
    }

    function hexToHSL(hex) {
      hex = hex.replace('#', '');
      let r = parseInt(hex.substring(0, 2), 16) / 255;
      let g = parseInt(hex.substring(2, 4), 16) / 255;
      let b = parseInt(hex.substring(4, 6), 16) / 255;

      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      // Return WITHOUT hsl() wrapper for Tailwind
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    }

    if (primary) {
      root.style.setProperty('--primary', hexToHSL(primary));
      root.style.setProperty('--primary-foreground', '0 0% 100%');
    }

    if (secondary) {
      root.style.setProperty('--secondary', hexToHSL(secondary));
      root.style.setProperty('--secondary-foreground', '0 0% 100%');
    }

    if (accent) {
      root.style.setProperty('--accent', hexToHSL(accent));
    }

    return {
      success: true,
      message: 'تم تغيير الألوان بنجاح'
    };
  },

  async setBrownThemeAction(data) {
    const root = document.documentElement;

    // Set light mode first
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');

    // Apply brown colors WITHOUT hsl() wrapper
    root.style.setProperty('--primary', '25 59% 30%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--secondary', '19 57% 41%');
    root.style.setProperty('--secondary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '25 75% 47%');

    return {
      success: true,
      message: 'تم تطبيق الوضع النهاري باللون البني'
    };
  },

  async resetThemeAction(data) {
    const root = document.documentElement;

    // Remove all custom color properties
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--secondary-foreground');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');

    // Set light mode
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');

    return {
      success: true,
      message: 'تم إرجاع الألوان الأصلية'
    };
  },

  // Reschedule all appointments from one day to another
  async rescheduleAppointments(data) {
    const { date, fromDate } = data;
    if (!date) throw new Error("لازم تديني التاريخ الجديد");

    const { clinicId } = await getClinicContext();

    // Get source date (default to today)
    const sourceDate = fromDate || new Date().toISOString().split('T')[0];
    const startTime = `${sourceDate}T00:00:00`;
    const endTime = `${sourceDate}T23:59:59`;

    // Get all appointments for the source date (active statuses only)
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, patient_id, date, notes, price, patient:patients(name, phone)')
      .eq('clinic_id', clinicId)
      .gte('date', startTime)
      .lte('date', endTime)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .order('date', { ascending: true });

    if (!appointments || appointments.length === 0) {
      return {
        success: false,
        message: `مفيش مواعيد في يوم ${sourceDate} عشان توزعها`,
        rescheduled: 0
      };
    }

    // Define time slots (distributed throughout the day)
    const timeSlots = [
      '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00',
      '20:00', '21:00'
    ];

    // Check availability for each slot and distribute appointments
    const rescheduledAppointments = [];
    let slotIndex = 0;

    for (const appointment of appointments) {
      let scheduled = false;
      let attempts = 0;

      // Try to find available slot (max 12 attempts = all slots)
      while (!scheduled && attempts < timeSlots.length) {
        const timeSlot = timeSlots[slotIndex % timeSlots.length];
        const [hour, minute] = timeSlot.split(':');
        const newDateTime = `${date}T${hour}:${minute}:00`;

        // Check if this slot is available (less than 3 appointments)
        const slotStart = `${date}T${hour}:00:00`;
        const slotEnd = `${date}T${hour}:59:59`;

        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('date', slotStart)
          .lte('date', slotEnd)
          .in('status', ['pending', 'confirmed', 'in_progress']);

        if (count < 3) {
          // Slot is available - reschedule appointment
          await updateAppointment(appointment.id, {
            date: newDateTime,
            notes: appointment.notes
              ? `${appointment.notes}\n[تم التأجيل من ${sourceDate}]`
              : `تم التأجيل من ${sourceDate}`
          });

          rescheduledAppointments.push({
            patientName: appointment.patient?.name || 'غير معروف',
            oldTime: appointment.date,
            newTime: newDateTime
          });

          scheduled = true;
        }

        slotIndex++;
        attempts++;
      }

      if (!scheduled) {
        // Could not find slot for this appointment
        console.warn(`Could not reschedule appointment ${appointment.id} - no available slots`);
      }
    }

    return {
      success: true,
      message: `تم توزيع ${rescheduledAppointments.length} موعد على يوم ${date}`,
      rescheduled: rescheduledAppointments.length,
      total: appointments.length,
      appointments: rescheduledAppointments
    };
  },

  // Database Query Action
  async databaseQueryAction(data) {
    const { table, operation, where, select, limit } = data;
    const { clinicId } = await getClinicContext();

    if (!table) throw new Error("لازم تحدد الجدول");
    if (!operation) throw new Error("لازم تحدد نوع العملية");

    let query = supabase.from(table);

    if (operation === 'select') {
      const selectFields = select || '*';
      query = query.select(selectFields);
      query = query.eq('clinic_id', clinicId);

      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: results, error } = await query;
      if (error) throw new Error(error.message);

      return {
        success: true,
        data: results,
        count: results?.length || 0
      };
    }

    throw new Error("عملية غير مدعومة");
  },

  // Create Notification
  async createNotificationAction(data) {
    const { type, title, message, patientId, appointmentId } = data;
    const { clinicId } = await getClinicContext();

    if (!type || !title) throw new Error("لازم تديني نوع وعنوان الإشعار");

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        clinic_id: clinicId,
        type,
        title,
        message: message || '',
        patient_id: patientId || null,
        appointment_id: appointmentId || null,
        is_read: false
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      data: notification
    };
  },

  // Analyze Performance
  async analyzeUserPerformanceAction(data) {
    const { period = 'month', metrics = [] } = data;
    const { clinicId } = await getClinicContext();

    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const results = {};

    if (metrics.includes('appointments_count') || metrics.length === 0) {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate.toISOString());
      results.appointments_count = count || 0;
    }

    if (metrics.includes('revenue') || metrics.length === 0) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('price')
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate.toISOString());
      results.revenue = appointments?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
    }

    if (metrics.includes('new_patients') || metrics.length === 0) {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate.toISOString());
      results.new_patients = count || 0;
    }

    return {
      success: true,
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      metrics: results
    };
  },

  // Delete Patient Action
  async deletePatientAction(data) {
    const { patientId } = data;
    if (!patientId) throw new Error("لازم تديني ID المريض");

    const { clinicId } = await getClinicContext();

    // First, get patient info for confirmation message
    const { data: patient } = await supabase
      .from('patients')
      .select('name')
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single();

    if (!patient) throw new Error("مش لاقي المريض ده");

    // Delete the patient (cascade will handle related records)
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId)
      .eq('clinic_id', clinicId);

    if (error) throw new Error(`فشل الحذف: ${error.message}`);

    return {
      success: true,
      message: `تم حذف المريض "${patient.name}" بنجاح`
    };
  },

  // Delete Appointment Action
  async deleteAppointmentAction(data) {
    const { appointmentId } = data;
    if (!appointmentId) throw new Error("لازم تديني ID الموعد");

    const { clinicId } = await getClinicContext();

    // Get appointment info for confirmation
    const { data: appointment } = await supabase
      .from('appointments')
      .select('date, patient:patients(name)')
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (!appointment) throw new Error("مش لاقي الموعد ده");

    // Delete the appointment
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId);

    if (error) throw new Error(`فشل الحذف: ${error.message}`);

    return {
      success: true,
      message: `تم حذف موعد "${appointment.patient?.name || 'غير معروف'}" بنجاح`
    };
  },

  // Delete Visit Action
  async deleteVisitAction(data) {
    const { visitId } = data;
    if (!visitId) throw new Error("لازم تديني ID الكشف");

    const { clinicId } = await getClinicContext();

    // Get visit info for confirmation
    const { data: visit } = await supabase
      .from('visits')
      .select('patient:patients(name)')
      .eq('id', visitId)
      .eq('clinic_id', clinicId)
      .single();

    if (!visit) throw new Error("مش لاقي الكشف ده");

    // Delete the visit
    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', visitId)
      .eq('clinic_id', clinicId);

    if (error) throw new Error(`فشل الحذف: ${error.message}`);

    return {
      success: true,
      message: `تم حذف كشف "${visit.patient?.name || 'غير معروف'}" بنجاح`
    };
  },

  // Update Visit Action
  async updateVisitAction(data) {
    const { visitId, diagnosis, notes, medications } = data;
    if (!visitId) throw new Error("لازم تديني ID الكشف");

    const { clinicId } = await getClinicContext();

    const updateData = {};
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (notes !== undefined) updateData.notes = notes;
    if (medications !== undefined) updateData.medications = medications;

    const { data: result, error } = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', visitId)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw new Error(`فشل التعديل: ${error.message}`);

    return {
      success: true,
      message: "تم تعديل الكشف بنجاح",
      data: result
    };
  },

  // Create Treatment Plan Action
  async createTreatmentPlanAction(data) {
    const { patientId, templateId, name, totalSessions, sessionPrice, notes } = data;
    if (!patientId) throw new Error("لازم تديني ID المريض");

    const { clinicId } = await getClinicContext();

    const planData = {
      clinic_id: clinicId,
      patient_id: patientId,
      template_id: templateId || null,
      status: 'active',
      total_sessions: totalSessions || 1,
      completed_sessions: 0,
      notes: notes || null
    };

    const { data: result, error } = await supabase
      .from('patient_plans')
      .insert(planData)
      .select()
      .single();

    if (error) throw new Error(`فشل الإضافة: ${error.message}`);

    return {
      success: true,
      message: "تم إضافة الخطة العلاجية بنجاح",
      planId: result.id,
      data: result
    };
  },

  // Update Treatment Plan Action
  async updateTreatmentPlanAction(data) {
    const { planId, status, completedSessions, notes } = data;
    if (!planId) throw new Error("لازم تديني ID الخطة");

    const { clinicId } = await getClinicContext();

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (completedSessions !== undefined) updateData.completed_sessions = completedSessions;
    if (notes !== undefined) updateData.notes = notes;

    const { data: result, error } = await supabase
      .from('patient_plans')
      .update(updateData)
      .eq('id', planId)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw new Error(`فشل التعديل: ${error.message}`);

    return {
      success: true,
      message: "تم تعديل الخطة العلاجية بنجاح",
      data: result
    };
  },

  // Delete Treatment Plan Action
  async deleteTreatmentPlanAction(data) {
    const { planId } = data;
    if (!planId) throw new Error("لازم تديني ID الخطة");

    const { clinicId } = await getClinicContext();

    const { error } = await supabase
      .from('patient_plans')
      .delete()
      .eq('id', planId)
      .eq('clinic_id', clinicId);

    if (error) throw new Error(`فشل الحذف: ${error.message}`);

    return {
      success: true,
      message: "تم حذف الخطة العلاجية بنجاح"
    };
  },

  // Get Patient Details Action
  async getPatientDetailsAction(data) {
    const { patientId } = data;
    if (!patientId) throw new Error("لازم تديني ID المريض");

    const { clinicId } = await getClinicContext();

    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        id,
        name,
        phone,
        age,
        gender,
        address,
        blood_type,
        date_of_birth,
        created_at,
        notes
      `)
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) throw new Error(`مش لاقي المريض ده: ${error.message}`);

    // Get patient's appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, date, status, price')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .order('date', { ascending: false })
      .limit(10);

    // Get patient's visits
    const { data: visits } = await supabase
      .from('visits')
      .select('id, diagnosis, created_at')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get patient's treatment plans
    const { data: plans } = await supabase
      .from('patient_plans')
      .select('id, status, total_sessions, completed_sessions')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId);

    return {
      success: true,
      patient: {
        ...patient,
        appointments: appointments || [],
        visits: visits || [],
        treatmentPlans: plans || []
      }
    };
  },

  // Get Notifications Details Action
  async getNotificationsDetailsAction(data) {
    const { limit = 20, unreadOnly = false, type } = data || {};
    const { clinicId } = await getClinicContext();

    let query = supabase
      .from('notifications')
      .select(`
        id,
        title,
        message,
        type,
        is_read,
        created_at,
        patient_id,
        appointment_id
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) throw new Error(`فشل جلب الإشعارات: ${error.message}`);

    // Format notifications for AI
    const formattedNotifications = (notifications || []).map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      date: n.created_at,
      patientId: n.patient_id,
      appointmentId: n.appointment_id
    }));

    return {
      success: true,
      total: formattedNotifications.length,
      notifications: formattedNotifications
    };
  },

  // Mark Notification as Read Action
  async markNotificationReadAction(data) {
    const { notificationId, markAll = false } = data;
    const { clinicId } = await getClinicContext();

    if (markAll) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('clinic_id', clinicId)
        .eq('is_read', false);

      if (error) throw new Error(`فشل التحديث: ${error.message}`);

      return {
        success: true,
        message: "تم تعليم كل الإشعارات كمقروءة"
      };
    }

    if (!notificationId) throw new Error("لازم تديني ID الإشعار");

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('clinic_id', clinicId);

    if (error) throw new Error(`فشل التحديث: ${error.message}`);

    return {
      success: true,
      message: "تم تعليم الإشعار كمقروء"
    };
  },

  // Get Today's Schedule Action
  async getTodayScheduleAction(data) {
    const { clinicId } = await getClinicContext();
    const today = new Date().toISOString().split('T')[0];

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        status,
        price,
        notes,
        from,
        patient:patients(id, name, phone, age)
      `)
      .eq('clinic_id', clinicId)
      .gte('date', `${today}T00:00:00`)
      .lte('date', `${today}T23:59:59`)
      .order('date', { ascending: true });

    if (error) throw new Error(`فشل جلب المواعيد: ${error.message}`);

    const statusLabels = {
      pending: 'معلق',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      in_progress: 'جاري الكشف'
    };

    const formattedAppointments = (appointments || []).map(a => ({
      id: a.id,
      patientName: a.patient?.name || 'غير معروف',
      patientPhone: a.patient?.phone || '',
      patientAge: a.patient?.age,
      time: a.date ? new Date(a.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      status: a.status,
      statusArabic: statusLabels[a.status] || a.status,
      price: a.price,
      source: a.from === 'booking' ? 'إلكتروني' : 'العيادة',
      notes: a.notes
    }));

    const summary = {
      total: formattedAppointments.length,
      pending: formattedAppointments.filter(a => a.status === 'pending').length,
      confirmed: formattedAppointments.filter(a => a.status === 'confirmed').length,
      completed: formattedAppointments.filter(a => a.status === 'completed').length,
      fromOnline: formattedAppointments.filter(a => a.source === 'إلكتروني').length,
      fromClinic: formattedAppointments.filter(a => a.source === 'العيادة').length
    };

    return {
      success: true,
      date: today,
      summary,
      appointments: formattedAppointments
    };
  }
};

// Execute an action by name
export async function executeAIAction(actionName, data) {
  const actionFn = AI_ACTIONS[actionName];
  if (!actionFn) {
    throw new Error(`الأمر ده مش موجود: ${actionName}`);
  }
  return await actionFn(data);
}

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
// جلب بيانات المواعيد (شاملة - كل المواعيد بالتفاصيل الكاملة)
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

    // Get ALL appointments with FULL details
    const { data: allAppointments, count: totalCount } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        notes,
        price,
        status,
        from,
        created_at,
        patient:patients(id, name, phone, age, gender)
      `, { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('date', { ascending: false });

    if (!allAppointments) return null;

    // Get today's appointments with full details
    const todayAppts = allAppointments.filter(a => {
      const apptDate = a.date ? new Date(a.date).toISOString().split('T')[0] : null;
      return apptDate === todayStr;
    });

    // Get this week's appointments
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekAppts = allAppointments.filter(a => {
      if (!a.date) return false;
      const apptDate = new Date(a.date);
      return apptDate >= weekStart && apptDate <= weekEnd;
    });

    // Get this month's appointments
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthAppts = allAppointments.filter(a => {
      if (!a.date) return false;
      const apptDate = new Date(a.date);
      return apptDate >= startOfMonth && apptDate <= endOfMonth;
    });

    // Get previous month's appointments for comparison
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const prevMonthAppts = allAppointments.filter(a => {
      if (!a.date) return false;
      const apptDate = new Date(a.date);
      return apptDate >= prevMonthStart && apptDate <= prevMonthEnd;
    });

    // Get past appointments (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const pastAppts = allAppointments.filter(a => {
      if (!a.date) return false;
      const apptDate = new Date(a.date);
      return apptDate < today && apptDate >= thirtyDaysAgo;
    });

    // Get future appointments (next 30 days)
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    const futureAppts = allAppointments.filter(a => {
      if (!a.date) return false;
      const apptDate = new Date(a.date);
      return apptDate > today && apptDate <= thirtyDaysLater;
    });

    // Status breakdown for today
    const pending = todayAppts.filter(a => a.status === 'pending');
    const confirmed = todayAppts.filter(a => a.status === 'confirmed');
    const completed = todayAppts.filter(a => a.status === 'completed');
    const cancelled = todayAppts.filter(a => a.status === 'cancelled' || a.status === 'rejected');

    // Source breakdown
    const fromOnline = todayAppts.filter(a => a.from === 'booking');
    const fromClinic = todayAppts.filter(a => a.from !== 'booking');

    // Financial data
    const totalRevenue = allAppointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    const todayRevenue = todayAppts
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    const monthRevenue = monthAppts
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    // Format appointments for AI
    const formatAppointment = (a) => ({
      id: a.id,
      patientName: a.patient?.name || 'غير معروف',
      patientPhone: a.patient?.phone || '',
      patientAge: a.patient?.age,
      patientGender: a.patient?.gender,
      date: a.date,
      time: a.date ? new Date(a.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      dayName: a.date ? new Date(a.date).toLocaleDateString('ar-EG', { weekday: 'long' }) : '',
      price: a.price,
      status: a.status,
      statusArabic: {
        pending: 'معلق',
        confirmed: 'مؤكد',
        completed: 'مكتمل',
        cancelled: 'ملغي',
        rejected: 'مرفوض',
        in_progress: 'جاري الكشف'
      }[a.status] || a.status,
      source: a.from === 'booking' ? 'إلكتروني' : 'العيادة',
      notes: a.notes || '',
      createdAt: a.created_at
    });

    return {
      total: totalCount || 0,
      allAppointments: allAppointments.slice(0, 100).map(formatAppointment), // Include ALL appointments (limited to 100 for performance)
      today: {
        total: todayAppts.length,
        pending: pending.length,
        confirmed: confirmed.length,
        completed: completed.length,
        cancelled: cancelled.length,
        fromOnline: fromOnline.length,
        fromClinic: fromClinic.length,
        revenue: todayRevenue,
        appointments: todayAppts.map(formatAppointment)
      },
      thisWeek: {
        total: weekAppts.length,
        appointments: weekAppts.slice(0, 20).map(formatAppointment)
      },
      thisMonth: {
        total: monthAppts.length,
        revenue: monthRevenue,
        appointments: monthAppts.slice(0, 30).map(formatAppointment)
      },
      previousMonth: {
        total: prevMonthAppts.length
      },
      monthOverMonthChange: prevMonthAppts.length > 0
        ? Math.round(((monthAppts.length - prevMonthAppts.length) / prevMonthAppts.length) * 100)
        : 0,
      past: {
        total: pastAppts.length,
        appointments: pastAppts.slice(0, 20).map(formatAppointment)
      },
      future: {
        total: futureAppts.length,
        appointments: futureAppts.slice(0, 20).map(formatAppointment)
      },
      financial: {
        totalRevenue,
        todayRevenue,
        monthRevenue,
        averageAppointmentPrice: totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0
      },
      byStatus: {
        pending: allAppointments.filter(a => a.status === 'pending').length,
        confirmed: allAppointments.filter(a => a.status === 'confirmed').length,
        completed: allAppointments.filter(a => a.status === 'completed').length,
        cancelled: allAppointments.filter(a => a.status === 'cancelled' || a.status === 'rejected').length,
        inProgress: allAppointments.filter(a => a.status === 'in_progress').length
      },
      bySource: {
        online: allAppointments.filter(a => a.from === 'booking').length,
        clinic: allAppointments.filter(a => a.from !== 'booking').length
      }
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
        try { perms = JSON.parse(s.permissions); } catch (e) { }
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

  // Get current date/time
  const dateTime = getCurrentDateTime();

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
  const appointmentsPreviousMonth = appointmentsData?.previousMonth || 0;
  const appointmentsMonthChange = appointmentsData?.monthOverMonthChange || 0;
  const appointmentsPast = appointmentsData?.past || {};
  const appointmentsFuture = appointmentsData?.future || {};
  const todayAppointmentsList = appointmentsData?.todayAppointments || [];

  // Finance data
  const financeThisMonth = financeData?.thisMonth || {};
  const financeThisYear = financeData?.thisYear || {};
  const recentTransactions = financeData?.recentTransactions || [];
  const financeMonthlyBreakdown = financeData?.monthlyBreakdown || [];

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

## معلومات الوقت:
- اليوم: ${dateTime.full}
- الوقت: ${dateTime.time}
- التاريخ: ${dateTime.date}

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
- مواعيد الشهر اللي فات: **${appointmentsPreviousMonth}**
- التغيير شهر بشهر: **${appointmentsMonthChange > 0 ? '+' : ''}${appointmentsMonthChange}%** ${appointmentsMonthChange > 0 ? '[ارتفاع]' : appointmentsMonthChange < 0 ? '[انخفاض]' : '[ثابت]'}
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
- changeTheme: تغيير المظهر (data: {mode: "dark"/"light"/"system"})
- changeColors: تغيير الألوان (data: {primary: "#hex", secondary: "#hex", accent: "#hex"})
- reorderMenu: تغيير ترتيب المنيو (data: {itemId: "id", position: number})
- resetSettings: إعادة كل الإعدادات للوضع الافتراضي

## مهم جدا:
- **ممنوع استخدام placeholder مثلا {{patientId}} أو {{appointmentId}}** - استخدم الأرقام الحقيقية من البيانات
- **ممنوع إنشاء روابط باستخدام placeholder** - استخدم الأرقام الحقيقية
- **لو حصلت نتيجة تنفيذ، استخدم الـ ID الحقيقي من النتيجة**

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

## قدرات التخصيص والإعدادات:

### لما حد عايز يغير الألوان:
- لو قال "عايز اللون الأحمر" أو "غير اللون للأحمر" أو "بحب الأحمر":
[icon:Palette] تمام! هغير ألوان الموقع للون الأحمر ودرجاته دلوقتي 🎨
\`\`\`action
{"type": "button", "label": "تغيير للون الأحمر", "action": "changeColors", "data": {"primary": "#E53935", "secondary": "#C62828", "accent": "#FF5252"}, "icon": "Palette"}
\`\`\`

- لو قال "عايز اللون الأزرق" أو "غير للأزرق":
[icon:Palette] تمام! هغير ألوان الموقع للون الأزرق ودرجاته دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للون الأزرق", "action": "changeColors", "data": {"primary": "#1976D2", "secondary": "#1565C0", "accent": "#42A5F5"}, "icon": "Palette"}
\`\`\`

- لو قال "عايز اللون الأخضر" أو "غير للأخضر":
[icon:Palette] تمام! هغير ألوان الموقع للون الأخضر ودرجاته دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للون الأخضر", "action": "changeColors", "data": {"primary": "#43A047", "secondary": "#2E7D32", "accent": "#66BB6A"}, "icon": "Palette"}
\`\`\`

- لو قال "عايز اللون البنفسجي" أو "غير للبنفسجي":
[icon:Palette] تمام! هغير ألوان الموقع للون البنفسجي ودرجاته دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للون البنفسجي", "action": "changeColors", "data": {"primary": "#7B1FA2", "secondary": "#6A1B9A", "accent": "#AB47BC"}, "icon": "Palette"}
\`\`\`

- لو قال "عايز اللون البرتقالي" أو "غير للبرتقالي":
[icon:Palette] تمام! هغير ألوان الموقع للون البرتقالي ودرجاته دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للون البرتقالي", "action": "changeColors", "data": {"primary": "#FB8C00", "secondary": "#EF6C00", "accent": "#FFB74D"}, "icon": "Palette"}
\`\`\`

- لو قال "عايز اللون الوردي" أو "غير للوردي" أو "pink":
[icon:Palette] تمام! هغير ألوان الموقع للون الوردي ودرجاته دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للون الوردي", "action": "changeColors", "data": {"primary": "#EC407A", "secondary": "#D81B60", "accent": "#F48FB1"}, "icon": "Palette"}
\`\`\`

- لو قال "عايز اللون الفيروزي" أو "teal" أو "اللون الأصلي":
[icon:Palette] تمام! هغير ألوان الموقع للون الفيروزي (اللون الأصلي) دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للون الفيروزي", "action": "changeColors", "data": {"primary": "#1AA19C", "secondary": "#224FB5", "accent": "#FF6B6B"}, "icon": "Palette"}
\`\`\`

**ملاحظة مهمة:** لو طلب لون معين، نفذ مباشرة بزرار - متشرحش أزاي يغير من الإعدادات.

### لما حد عايز يغير المظهر:
- لو قال "غير للوضع الليلي" أو "وضع ليلي" أو "dark mode" أو "عايز الموقع يبقى دارك":
[‪icon:Moon] تمام! هغير المظهر للوضع الليلي دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للوضع الليلي", "action": "changeTheme", "data": {"mode": "dark"}, "icon": "Moon"}
\`\`\`

- لو قال "غير للوضع النهاري" أو "وضع نهاري" أو "light mode" أو "عايز الموقع يبقى فاتح":
[icon:Sun] تمام! هغير المظهر للوضع النهاري دلوقتي
\`\`\`action
{"type": "button", "label": "تغيير للوضع النهاري", "action": "changeTheme", "data": {"mode": "light"}, "icon": "Sun"}
\`\`\`

- لو قال "وضع تلقائي" أو "system mode" أو "عايز يبقى زي النظام":
[icon:Monitor] تمام! هغير المظهر للوضع التلقائي (زي النظام)
\`\`\`action
{"type": "button", "label": "تغيير للوضع التلقائي", "action": "changeTheme", "data": {"mode": "system"}, "icon": "Monitor"}
\`\`\`

**ملاحظة:** المظهر الحالي يتغير فوراً بدون إعادة تحميل الصفحة.

### لما حد عايز يغير ترتيب المنيو:
- لو قال "عايز زرار العيادة يكون فوق زرار المرضى" أو "ضع العيادة أول":
[icon:Menu] تمام! هغير ترتيب المنيو دلوقتي
\`\`\`action
{"type": "button", "label": "ضع العيادة في البداية", "action": "reorderMenu", "data": {"itemId": "clinic", "position": 1}, "icon": "ArrowUp"}
\`\`\`

**عناصر المنيو المتاحة:**
- dashboard (لوحة التحكم)
- appointments (المواعيد)
- patients (المرضى)
- clinic (العيادة)
- treatments (الخطط العلاجية)
- finance (المالية)
- online-booking (الحجز الإلكتروني)
- staff (الموظفين)
- settings (الإعدادات)

### لما حد عايز يرجع للإعدادات الافتراضية:
[icon:RotateCcw] تمام! هرجع كل الإعدادات للوضع الافتراضي (الألوان، المظهر، وترتيب المنيو)
\`\`\`action
{"type": "button", "label": "إعادة للوضع الافتراضي", "action": "resetSettings", "icon": "RotateCcw"}
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

## 🚀 Tabibi Actions - التنفيذ المباشر (مهم جدا!):

**انت تقدر تنفذ أوامر مباشرة بدون أزرار!** لما حد يطلب حاجة، نفذها فوريًا.

### صيغة التنفيذ المباشر:
\`\`\`execute
{"action": "actionName", "data": {...}}
\`\`\`

### الأوامر المتاحة للتنفيذ المباشر:

**1. إضافة مريض جديد (createPatientAction):**
لما حد يقول: "أضف مريض اسمه علي نصر رقمه 01098764899"
\`\`\`execute
{"action": "createPatientAction", "data": {"name": "علي نصر", "phone": "01098764899"}}
\`\`\`
بعد التنفيذ: "تم إضافة المريض بنجاح!" + زر للروح للملف

**معطيات createPatientAction:**
- name: اسم المريض (مطلوب)
- phone: رقم الموبايل (مطلوب)
- gender: الجنس (male/female) - اختياري، هيتخمن من الاسم
- age: العمر - اختياري
- address: العنوان - اختياري

**2. إضافة موعد جديد (createAppointmentAction):**
لما حد يقول: "اعمل موعد لأحمد محمد 01011111111 بكرة الساعة 3"
\`\`\`execute
{"action": "createAppointmentAction", "data": {"patientName": "أحمد محمد", "patientPhone": "01011111111", "date": "2024-01-15", "time": "15:00"}}
\`\`\`

**معطيات createAppointmentAction:**
- patientId: ID المريض (لو معروف)
- patientName: اسم المريض (لو مفيش ID)
- patientPhone: رقم الموبايل (مطلوب لو مفيش ID)
- date: التاريخ بصيغة YYYY-MM-DD (مطلوب)
- time: الوقت بصيغة HH:MM - اختياري
- notes: ملاحظات - اختياري
- price: السعر - اختياري

**3. إلغاء موعد (cancelAppointmentAction):**
\`\`\`execute
{"action": "cancelAppointmentAction", "data": {"appointmentId": "uuid"}}
\`\`\`

**4. إضافة كشف (createVisitAction):**
\`\`\`execute
{"action": "createVisitAction", "data": {"patientId": "uuid", "diagnosis": "التشخيص", "medications": "الأدوية"}}
\`\`\`

**5. إضافة موظف (addStaffAction):**
\`\`\`execute
{"action": "addStaffAction", "data": {"name": "الاسم", "email": "email@example.com", "password": "123456", "phone": "01011111111"}}
\`\`\`

**6. إقفال/فتح الحجز يوم معين (setClinicDayOffAction):**
لما حد يقول: "اقفل الحجز يوم الجمعة"
\`\`\`execute
{"action": "setClinicDayOffAction", "data": {"day": "الجمعة", "off": true}}
\`\`\`
لما حد يقول: "افتح الحجز يوم الجمعة"
\`\`\`execute
{"action": "setClinicDayOffAction", "data": {"day": "الجمعة", "off": false}}
\`\`\`

**7. تعديل مواعيد العمل (updateClinicHoursAction):**
\`\`\`execute
{"action": "updateClinicHoursAction", "data": {"day": "السبت", "start": "10:00", "end": "18:00"}}
\`\`\`

**8. تعديل سعر الكشف (updateBookingPriceAction):**
\`\`\`execute
{"action": "updateBookingPriceAction", "data": {"price": 200}}
\`\`\`

### قواعد التنفيذ المباشر:
1. **لو البيانات كاملة** → نفذ فوراً بدون سؤال
2. **لو البيانات ناقصة** → اسأل عن البيانات المطلوبة فقط + اعرض input للإدخال
3. **بعد التنفيذ** → أكد النجاح + اعرض زر للإجراء التالي

### مثال كامل - إضافة مريض:

**المستخدم:** "أضف مريض اسمه علي نصر رقمه 01098764899"
**الرد:**
\`\`\`execute
{"action": "createPatientAction", "data": {"name": "علي نصر", "phone": "01098764899"}}
\`\`\`
[icon:CheckCircle] تم إضافة المريض "علي نصر" بنجاح!
\`\`\`action
{"type": "button", "label": "فتح ملف المريض", "navigate": "/patients/{{patientId}}", "icon": "User"}
\`\`\`

### مثال - بيانات ناقصة:

**المستخدم:** "أضف مريض اسمه سارة"
**الرد:**
[icon:AlertCircle] عشان أضيف المريضة سارة، محتاج رقم الموبايل:
\`\`\`action
{"type": "input", "id": "patientPhone", "placeholder": "رقم الموبايل"}
\`\`\`

### مثال - إقفال يوم:

**المستخدم:** "اقفل الحجز يوم الجمعة"
**الرد:**
\`\`\`execute
{"action": "setClinicDayOffAction", "data": {"day": "الجمعة", "off": true}}
\`\`\`
[icon:CheckCircle] تم! يوم الجمعة بقى إجازة والحجز مقفول فيه.

## 📊 Tabibi Charts - الرسومات البيانية المتقدمة:

### قواعد الرسومات:
1. **للنسب والتوزيعات** → استخدم pie/donut
2. **للمقارنات** → استخدم bar (vertical/horizontal)
3. **للاتجاهات عبر الزمن** → استخدم line

### مقارنة فترات:
لما حد يطلب مقارنة شهر بشهر، استخدم البيانات المتاحة واعرضها في رسم بياني مناسب.

### تحليل الرسومات:
لما تعرض رسم بياني، اشرح النتائج:
- "الحجوزات من الموقع أكثر بنسبة X%"
- "فيه زيادة في المرضى الذكور"
- "الإيرادات ارتفعت هذا الشهر"

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

// ========================
// وظائف تنفيذ أوامر التخصيص
// ========================

// تغيير المظهر إلى الوضع الليلي أو النهاري
export async function changeThemeMode(mode) {
  try {
    const validModes = ['light', 'dark', 'system'];
    if (!validModes.includes(mode)) {
      throw new Error('وضع غير صحيح');
    }

    await updateUserPreferences({ theme_mode: mode });
    return { success: true, message: `تم التغيير إلى الوضع ${mode === 'dark' ? 'الليلي' : mode === 'light' ? 'النهاري' : 'التلقائي'}` };
  } catch (error) {
    console.error('Error changing theme:', error);
    throw error;
  }
}

// تغيير الألوان
export async function changeColors(primaryColor, secondaryColor, accentColor) {
  try {
    const updates = {};
    if (primaryColor) updates.primary_color = primaryColor;
    if (secondaryColor) updates.secondary_color = secondaryColor;
    if (accentColor) updates.accent_color = accentColor;

    await updateUserPreferences(updates);
    return { success: true, message: 'تم تغيير الألوان بنجاح' };
  } catch (error) {
    console.error('Error changing colors:', error);
    throw error;
  }
}

// تغيير ترتيب عناصر المنيو
export async function reorderMenuItem(itemId, newPosition) {
  try {
    const prefs = await getUserPreferences();
    let menuItems = prefs?.menu_items || [];

    // If no custom order exists, create default order
    if (menuItems.length === 0) {
      menuItems = [
        { id: 'dashboard', label: 'لوحة التحكم', order: 1, enabled: true },
        { id: 'appointments', label: 'المواعيد', order: 2, enabled: true },
        { id: 'patients', label: 'المرضى', order: 3, enabled: true },
        { id: 'clinic', label: 'العيادة', order: 4, enabled: true },
        { id: 'treatments', label: 'الخطط العلاجية', order: 5, enabled: true },
        { id: 'finance', label: 'المالية', order: 6, enabled: true },
        { id: 'online-booking', label: 'الحجز الإلكتروني', order: 7, enabled: true },
        { id: 'staff', label: 'الموظفين', order: 8, enabled: true },
        { id: 'settings', label: 'الإعدادات', order: 9, enabled: true },
      ];
    }

    // Find the item to move
    const itemIndex = menuItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('العنصر غير موجود');
    }

    // Remove item from current position
    const [item] = menuItems.splice(itemIndex, 1);

    // Insert at new position (1-based to 0-based index)
    menuItems.splice(newPosition - 1, 0, item);

    // Update order numbers
    menuItems = menuItems.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    await updateUserPreferences({ menu_items: menuItems });
    return { success: true, message: 'تم تغيير ترتيب المنيو بنجاح', menuItems };
  } catch (error) {
    console.error('Error reordering menu:', error);
    throw error;
  }
}

// إعادة الإعدادات الافتراضية
export async function resetToDefaultSettings() {
  try {
    const defaultSettings = {
      theme_mode: 'system',
      primary_color: '#1AA19C',
      secondary_color: '#224FB5',
      accent_color: '#FF6B6B',
      sidebar_style: 'default',
      sidebar_collapsed: false,
      menu_items: [],
      dashboard_widgets: [],
    };

    await updateUserPreferences(defaultSettings);
    return { success: true, message: 'تم إعادة كل الإعدادات للوضع الافتراضي بنجاح' };
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
}

// إرسال رسالة للـ AI
export async function sendMessageToAI(messages, userData, clinicData, subscriptionData, deepReasoning = false) {
  return await originalSendMessageToAI(messages, userData, clinicData, subscriptionData, deepReasoning);
}

// Streaming version للرسائل (لو عايز تعرض الرد حرف حرف)
export async function sendMessageToAIStream(messages, userData, clinicData, subscriptionData, onChunk) {
  return await originalSendMessageToAIStream(messages, userData, clinicData, subscriptionData, onChunk);
}
