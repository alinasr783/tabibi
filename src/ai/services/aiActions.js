import supabase from "../../services/supabase";
import { createPatient, updatePatient } from "../../services/apiPatients";
import { createAppointment, updateAppointment, deleteAppointment } from "../../services/apiAppointments";
import { createVisit, updateVisit, deleteVisit } from "../../services/apiVisits";
import { addSecretary } from "../../services/apiAuth";
import { updateClinic } from "../../services/apiClinic";
import { 
  enableDailyAppointmentsEmail, 
  disableDailyAppointmentsEmail, 
  updateDailyAppointmentsEmailTime,
  getDailyEmailSettings 
} from "../../services/apiUserPreferences";

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
const AI_ACTIONS = {
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
    
    // If no patient ID but have name/phone, create or find patient
    if (!finalPatientId && patientName) {
      if (!patientPhone) throw new Error("لازم تديني رقم موبايل المريض عشان أقدر أضيفه");
      
      // Try to find existing patient
      const { clinicId } = await getClinicContext();
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('phone', patientPhone)
        .single();
      
      if (existingPatient) {
        finalPatientId = existingPatient.id;
      } else {
        // Create new patient
        const newPatient = await createPatient({
          name: patientName,
          phone: patientPhone,
          gender: guessGenderFromName(patientName)
        });
        finalPatientId = newPatient.id;
      }
    }
    
    if (!finalPatientId) throw new Error("لازم تديني بيانات المريض (اسمه ورقم موبايله)");
    if (!date) throw new Error("لازم تديني تاريخ الموعد");
    
    // Combine date and time
    let appointmentDate = date;
    if (time) {
      appointmentDate = `${date}T${time}:00`;
    }
    
    const appointmentData = {
      patient_id: finalPatientId,
      date: appointmentDate,
      notes: notes || null,
      price: price || null,
      status: 'confirmed'
    };
    
    const result = await createAppointment(appointmentData);
    return { 
      success: true, 
      message: `تم إضافة الموعد بنجاح`,
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
  
  async cancelAppointmentAction(data) {
    const { appointmentId } = data;
    if (!appointmentId) throw new Error("لازم تديني ID الموعد");
    
    const result = await updateAppointment(appointmentId, { status: 'cancelled' });
    return { success: true, message: "تم إلغاء الموعد بنجاح", data: result };
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
    const { mode } = data; // 'light', 'dark', or 'system'
    
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
      // System preference
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
    const { primary, secondary, accent } = data;
    
    if (!primary && !secondary && !accent) {
      throw new Error("لازم تديني لون واحد على الأقل");
    }
    
    // Helper to convert hex to HSL
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
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    }
    
    const root = document.documentElement;
    
    if (primary) {
      const primaryHSL = hexToHSL(primary);
      root.style.setProperty('--primary', primaryHSL);
    }
    
    if (secondary) {
      const secondaryHSL = hexToHSL(secondary);
      root.style.setProperty('--secondary', secondaryHSL);
    }
    
    if (accent) {
      const accentHSL = hexToHSL(accent);
      root.style.setProperty('--accent', accentHSL);
    }
    
    return { 
      success: true, 
      message: 'تم تغيير الألوان بنجاح',
      colors: { primary, secondary, accent }
    };
  },
  
  async setBrownThemeAction(data) {
    // Brown color palette with shades
    const brownPalette = {
      primary: '#8B4513',      // SaddleBrown
      secondary: '#A0522D',    // Sienna
      accent: '#D2691E'        // Chocolate
    };
    
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
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    }
    
    const root = document.documentElement;
    
    // Apply brown theme colors
    root.style.setProperty('--primary', hexToHSL(brownPalette.primary));
    root.style.setProperty('--secondary', hexToHSL(brownPalette.secondary));
    
    // Set light mode
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    
    return { 
      success: true, 
      message: 'تم تطبيق اللون البني ودرجاته',
      colors: brownPalette
    };
  },
  
  // Reschedule Appointments Action
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
  
  // Database Query Action - Direct database access
  async databaseQueryAction(data) {
    const { table, operation, where, include, select, limit } = data;
    const { clinicId } = await getClinicContext();
    
    if (!table) throw new Error("لازم تحدد الجدول");
    if (!operation) throw new Error("لازم تحدد نوع العملية");
    
    let query = supabase.from(table);
    
    if (operation === 'select') {
      // Build select query
      const selectFields = select || '*';
      query = query.select(selectFields);
      
      // Add clinic filter
      query = query.eq('clinic_id', clinicId);
      
      // Apply where conditions
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      // Apply limit
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
  
  // Create Notification Action
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
  
  // Analyze User Performance
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
    
    // Appointments count
    if (metrics.includes('appointments_count') || metrics.length === 0) {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate.toISOString());
      
      results.appointments_count = count || 0;
    }
    
    // Revenue
    if (metrics.includes('revenue') || metrics.length === 0) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('price')
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate.toISOString());
      
      results.revenue = appointments?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
    }
    
    // New patients
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
  
  // ========================
  // Daily Email Settings Actions
  // ========================
  
  // Enable daily appointments email
  async enableDailyAppointmentsEmailAction(data) {
    await enableDailyAppointmentsEmail();
    return {
      success: true,
      message: 'تمام! هبعتلك مواعيدك اليومية على الإيميل كل يوم'
    };
  },
  
  // Disable daily appointments email
  async disableDailyAppointmentsEmailAction(data) {
    await disableDailyAppointmentsEmail();
    return {
      success: true,
      message: 'تمام! وقفت إرسال المواعيد اليومية على الإيميل'
    };
  },
  
  // Update daily email time
  async updateDailyAppointmentsEmailTimeAction(data) {
    const { time } = data;
    if (!time) throw new Error('لازم تديني الوقت (مثلاً 07:00 أو 08:30)');
    
    await updateDailyAppointmentsEmailTime(time);
    
    // Format time for display
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'مساءً' : 'صباحًا';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    return {
      success: true,
      message: `تمام! هبعتلك مواعيدك اليومية الساعة ${formattedTime}`
    };
  },
  
  // Get current daily email settings
  async getDailyEmailSettingsAction(data) {
    const settings = await getDailyEmailSettings();
    
    // Format time for display
    const [hours, minutes] = settings.time.split(':').map(Number);
    const period = hours >= 12 ? 'مساءً' : 'صباحًا';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    return {
      success: true,
      enabled: settings.enabled,
      time: settings.time,
      formattedTime,
      timezone: settings.timezone,
      message: settings.enabled 
        ? `الإيميل اليومي مفعل - بيتبعت الساعة ${formattedTime}`
        : 'الإيميل اليومي موقف'
    };
  }
};

// Execute an action by name
async function executeAIAction(actionName, data) {
  const actionFn = AI_ACTIONS[actionName];
  if (!actionFn) {
    throw new Error(`الأمر ده مش موجود: ${actionName}`);
  }
  return await actionFn(data);
}

export {
  AI_ACTIONS,
  executeAIAction,
  guessGenderFromName,
  getClinicContext
};