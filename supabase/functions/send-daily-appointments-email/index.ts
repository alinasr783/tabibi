// Supabase Edge Function: send-daily-appointments-email
// Sends daily appointment reminder emails to doctors at their scheduled time

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Get Cairo time properly
function getCairoTime() {
  // Use Intl.DateTimeFormat for a reliable time in Cairo timezone
  const cairoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = cairoFormatter.formatToParts(new Date());
  const dateMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as any);
  
  // Return a structured object instead of a Date object to avoid offset issues
  return {
    hour: parseInt(dateMap.hour),
    minute: parseInt(dateMap.minute),
    todayStr: `${dateMap.year}-${dateMap.month}-${dateMap.day}`
  };
}

// Email template for daily appointments
function generateEmailHTML(doctorName: string, clinicName: string, date: string, appointments: any[]) {
  const dateObj = new Date(date)
  const dayName = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' })
  const formattedDate = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
  
  const hasAppointments = appointments && appointments.length > 0;
  
  const appointmentsContent = hasAppointments ? appointments.map(apt => {
    const time = apt.time || '-';
    const patientName = apt.patient_name || 'مريض';
    const notes = apt.notes || 'لا توجد ملاحظات';
    const price = apt.price ? `${apt.price} ج.م` : 'غير محدد';
    const source = apt.source === 'online' ? 'حجز أونلاين' : 'حجز من العيادة';
    const sourceColor = apt.source === 'online' ? '#1AA19C' : '#224FB5';
    const status = apt.status_label || 'قيد الانتظار';
    const phone = apt.patient_phone || '';
    
    const whatsappBtn = phone ? `
      <a href="https://wa.me/${phone.replace(/\D/g, '')}" style="display: inline-flex; align-items: center; background-color: #25D366; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; margin-top: 10px;">
        <span style="margin-left: 8px;">واتساب</span>
      </a>` : '';

    return `
      <div style="background: white; border: 1px solid #eef0f2; border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: right;" dir="rtl">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f8f9fa; padding-bottom: 10px;">
          <span style="background: #f0f7f7; color: #1AA19C; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">${time}</span>
          <span style="color: ${sourceColor}; font-size: 12px; font-weight: bold;">${source}</span>
        </div>
        
        <h3 style="margin: 0 0 8px; color: #333; font-size: 18px;">👤 ${patientName}</h3>
        
        <div style="display: flex; gap: 20px; margin-top: 10px;">
          <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>💰 السعر:</strong> ${price}</p>
          <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>📍 الحالة:</strong> ${status}</p>
        </div>
        
        <p style="margin: 10px 0; color: #888; font-size: 13px; background: #fcfcfc; padding: 8px; border-radius: 6px; border-right: 3px solid #eee;">
          <strong>📝 ملاحظات:</strong> ${notes}
        </p>
        
        ${whatsappBtn}
      </div>`
  }).join('') : `
    <div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 12px; border: 1px dashed #ccc;">
      <div style="font-size: 48px; margin-bottom: 15px;">🗓️</div>
      <h3 style="color: #666; margin: 0;">لا توجد مواعيد مجدولة لهذا اليوم</h3>
      <p style="color: #999; font-size: 14px; margin-top: 10px;">نتمنالك يوم هادئ ومريح دكتور ${doctorName} 🌸</p>
    </div>
  `;
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1AA19C 0%, #224FB5 100%); padding: 40px 20px; text-align: center; color: white; }
    .content { padding: 30px 20px; background: #f8fafc; }
    .footer { background: #fff; padding: 25px; text-align: center; border-top: 1px solid #eee; }
  </style>
</head>
<body dir="rtl">
  <div class="container" dir="rtl">
    <div class="header">
      <h1 style="margin: 0; font-size: 26px;">صباح الخير دكتور ${doctorName} 👋</h1>
      <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">${clinicName}</p>
    </div>
    
    <div class="content" dir="rtl">
      <div style="margin-bottom: 25px; text-align: right;">
        <h2 style="margin: 0; color: #1e293b; font-size: 20px;">📅 مواعيدك اليوم</h2>
        <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">${dayName}، ${formattedDate}</p>
      </div>
      
      ${appointmentsContent}
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px;">
        نتمنالك يوم شغل موفق وسعيد 🌸
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0; color: #1AA19C; font-weight: bold; font-size: 15px;">Tabibi</p>
      <p style="margin: 5px 0 0; color: #94a3b8; font-size: 12px;">منصة إدارة العيادات الذكية</p>
    </div>
  </div>
</body>
</html>`
}

// Send email using Resend SDK
async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_UkvsdPXj_2E9sBfBrwYbaW9nEj2AaTxLk'
  
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    throw new Error('Email service not configured - RESEND_API_KEY missing')
  }
  
  console.log(`Sending email to ${to} with subject: ${subject}`)
  
  const resend = new Resend(RESEND_API_KEY)
  
  const { data, error } = await resend.emails.send({
    from: 'Tabibi <notifications@resend.dev>',
    to: to,
    subject: subject,
    html: html,
  })
  
  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`)
  }
  
  console.log('Email sent successfully:', data)
  return data
}

// Main handler
Deno.serve(async (req) => {
  console.log(`--- Function execution started: ${new Date().toISOString()} ---`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    let forceMode = false
    let sendToAll = false
    let targetEmail = null
    let targetUserId = null
    
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        forceMode = body.force === true
        sendToAll = body.sendToAll === true
        targetEmail = body.email || null
        targetUserId = body.user_id || null
        console.log('Request options:', { forceMode, sendToAll, targetEmail, targetUserId })
      } catch (e) {
        console.log('Body empty or not JSON')
      }
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Cairo time object
    const cairo = getCairoTime()
    const cairoHour = cairo.hour
    const cairoMinute = cairo.minute
    const todayStr = cairo.todayStr
    
    console.log(`Job - Cairo time: ${cairoHour}:${cairoMinute}, Date: ${todayStr}, Force: ${forceMode}`)
    
    let usersQuery = supabase
      .from('user_preferences')
      .select(`user_id, daily_appointments_email_enabled, daily_appointments_email_time`)
    
    if (targetUserId) {
      usersQuery = usersQuery.eq('user_id', targetUserId)
    } else if (!sendToAll && !forceMode) {
      usersQuery = usersQuery.eq('daily_appointments_email_enabled', true)
    }
    
    const { data: users, error: usersError } = await usersQuery
    if (usersError) throw usersError
    
    let allUsers = users || []
    if (allUsers.length === 0 && (forceMode || targetUserId)) {
      console.log('No user preferences found, adding target user to list manually')
      allUsers = [{ 
        user_id: targetUserId, 
        daily_appointments_email_enabled: true, 
        daily_appointments_email_time: '07:00' 
      }]
    }
    
    console.log(`Processing ${allUsers.length} potential users`)
    const results = []
    
    for (const userPref of allUsers) {
      try {
        console.log(`Processing user ID: ${userPref.user_id}`)
        
        // Time check for scheduled runs
        if (!forceMode && !targetUserId) {
          const userTime = userPref.daily_appointments_email_time || '07:00'
          const [tH, tM] = userTime.split(':').map(Number)
          
          // Calculate total minutes from midnight for both
          const currentTotalMinutes = (cairoHour * 60) + cairoMinute;
          const targetTotalMinutes = (tH * 60) + tM;
          
          // Calculate absolute difference in minutes
          const diffMinutes = Math.abs(currentTotalMinutes - targetTotalMinutes);
          
          // Allow a 20-minute window for the Cron trigger to hit (even if hour changes)
          const timeMatch = (diffMinutes <= 20);
          
          if (!timeMatch) {
            console.log(`Skipping - not their time (Target: ${userTime}, Current Cairo: ${cairoHour}:${cairoMinute}, Diff: ${diffMinutes} min)`)
            continue
          }
          console.log(`Time matched! (Target: ${userTime}, Current: ${cairoHour}:${cairoMinute}, Diff: ${diffMinutes} min)`)
        }
        
        // Find user and clinic
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, clinic_id, user_id')
          .or(`user_id.eq.${userPref.user_id},auth_uid.eq.${userPref.user_id}`)
          .maybeSingle()
        
        if (userError) {
          console.error('Error fetching user from DB:', userError)
          continue
        }
        
        const email = userData?.email || (targetUserId === userPref.user_id ? targetEmail : null)
        const clinicId = userData?.clinic_id
        
        if (!email) {
          console.error(`No email found for user ${userPref.user_id}`)
          continue
        }
        
        if (!clinicId) {
          console.error(`No clinic_id found for user ${userPref.user_id}`)
          continue
        }
        
        console.log(`Found: ${email}, Clinic: ${clinicId}`)
        
        // Clinic Name
        const { data: clinicData } = await supabase
          .from('clinics')
          .select('name')
          .eq('clinic_uuid', clinicId)
          .maybeSingle()
        const clinicName = clinicData?.name || 'العيادة'
        
        // Appointments
        const { data: appointments, error: aptError } = await supabase
          .from('appointments')
          .select(`id, date, status, notes, patient_id, price, from`)
          .eq('clinic_id', clinicId)
          .ilike('date', `${todayStr}%`)
          .in('status', ['confirmed', 'scheduled', 'pending', 'confirmed_at_clinic'])
          .order('id', { ascending: true })
        
        if (aptError) throw aptError
        
        const patientIds = (appointments || []).map(a => a.patient_id).filter(id => id !== null)
        const { data: patients } = await supabase.from('patients').select('id, name, phone').in('id', patientIds)
        const patientMap = patients?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) || {}
        
        const mappedApts = (appointments || []).map(apt => {
          const p = patientMap[apt.patient_id] || { name: 'مريض', phone: '' }
          let timeStr = 'موعد'
          try {
            if (apt.date?.includes('T')) {
              timeStr = new Date(apt.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
            }
          } catch (e) {}
          
          return {
            time: timeStr,
            patient_name: p.name,
            patient_phone: p.phone,
            notes: apt.notes,
            price: apt.price,
            source: apt.from === 'online' ? 'online' : 'clinic',
            status_label: apt.status
          }
        })
        
        if (mappedApts.length === 0 && !forceMode) {
          console.log('No appointments - skipping email')
          continue
        }
        
        const emailHtml = generateEmailHTML(userData?.name || 'دكتور', clinicName, todayStr, mappedApts)
        const subject = mappedApts.length > 0 ? `📅 مواعيدك النهارده (${mappedApts.length} موعد)` : `📅 مواعيد اليوم`
        
        await sendEmail(email, subject, emailHtml)
        results.push({ user_id: userPref.user_id, status: 'sent' })
        
      } catch (err) {
        console.error(`Failed for user ${userPref.user_id}:`, err.message)
      }
    }
    
    console.log(`Done. Processed ${results.length} emails.`)
    return new Response(JSON.stringify({ success: true, processed: results.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    
  } catch (error) {
    console.error('Critical error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
