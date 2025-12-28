import supabase from "../supabase";
import { createPatient, updatePatient } from "../apiPatients";
import { createAppointment, updateAppointment, deleteAppointment } from "../apiAppointments";
import { createVisit, updateVisit, deleteVisit } from "../apiVisits";
import { addSecretary } from "../apiAuth";
import { updateClinic } from "../apiClinic";

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