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
  const now = new Date()
  // Cairo is UTC+2 (or UTC+3 during DST, but Egypt doesn't observe DST since 2014)
  const cairoOffset = 2 * 60 // +2 hours in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  const cairoTime = new Date(utcTime + (cairoOffset * 60000))
  return cairoTime
}

// Email template for daily appointments
function generateEmailHTML(doctorName: string, clinicName: string, date: string, appointments: any[]) {
  const dateObj = new Date(date)
  const dayName = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' })
  const formattedDate = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
  
  const appointmentsList = appointments.map(apt => {
    const time = apt.appointment_time?.split(' ')[1] || apt.appointment_time || apt.time || '-'
    return `<tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${time}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${apt.patient_name || apt.name || 'مريض'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${apt.notes || '-'}</td>
    </tr>`
  }).join('')
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1AA19C 0%, #224FB5 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">صباح الخير دكتور ${doctorName} 👋</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">عيادة ${clinicName}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 5px; color: #333; font-size: 18px;">📅 مواعيدك النهارده</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">${dayName} ${formattedDate}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">⏰ الوقت</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">👤 المريض</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">📝 ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${appointmentsList}
        </tbody>
      </table>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 14px; margin: 0;">نتمنالك يوم شغل موفق 🌸</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center;">
      <p style="margin: 0; color: #888; font-size: 12px;">
        هذه الرسالة مرسلة تلقائياً من منصة <strong style="color: #1AA19C;">Tabibi</strong>
      </p>
      <p style="margin: 5px 0 0; color: #aaa; font-size: 11px;">
        لإلغاء هذه الرسائل، اذهب للإعدادات > الإشعارات
      </p>
    </div>
  </div>
</body>
</html>`
}

// Send email using Resend SDK
async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    throw new Error('Email service not configured - RESEND_API_KEY missing')
  }
  
  console.log(`Sending email to ${to} with subject: ${subject}`)
  
  const resend = new Resend(RESEND_API_KEY)
  
  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Parse request body for options
    let forceMode = false
    let sendToAll = false
    let targetEmail = null
    
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        forceMode = body.force === true
        sendToAll = body.sendToAll === true
        targetEmail = body.email || null
        console.log('Request options:', { forceMode, sendToAll, targetEmail })
      } catch {
        // Body might be empty for cron triggers
      }
    }
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get Cairo time
    const cairoTime = getCairoTime()
    const cairoHour = cairoTime.getHours()
    const cairoMinute = cairoTime.getMinutes()
    const todayStr = cairoTime.toISOString().split('T')[0]
    
    console.log(`Running daily email job - Cairo time: ${cairoHour}:${cairoMinute}, Date: ${todayStr}, Force: ${forceMode}`)
    
    // Get users to process
    let usersQuery = supabase
      .from('user_preferences')
      .select(`
        user_id,
        daily_appointments_email_enabled,
        daily_appointments_email_time,
        timezone
      `)
    
    // If not sending to all, only get enabled users
    if (!sendToAll) {
      usersQuery = usersQuery.eq('daily_appointments_email_enabled', true)
    }
    
    const { data: users, error: usersError } = await usersQuery
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }
    
    console.log(`Found ${users?.length || 0} users to process`)
    
    // If no users with preferences, try to get all users directly
    let allUsers = users || []
    if (allUsers.length === 0 && (forceMode || sendToAll)) {
      console.log('No user preferences found, fetching all users directly...')
      const { data: directUsers, error: directError } = await supabase
        .from('users')
        .select('id, auth_uid, name, email, clinic_id')
      
      if (!directError && directUsers) {
        allUsers = directUsers.map(u => ({
          user_id: u.auth_uid,
          daily_appointments_email_enabled: true,
          daily_appointments_email_time: '07:00',
          timezone: 'Africa/Cairo',
          _userData: u // Store user data to avoid re-query
        }))
        console.log(`Found ${allUsers.length} users directly`)
      }
    }
    
    const results: any[] = []
    
    for (const userPref of allUsers) {
      try {
        // Check if it's the right time (skip if force mode)
        if (!forceMode) {
          const userTime = userPref.daily_appointments_email_time || '07:00'
          const [targetHour, targetMinute] = userTime.split(':').map(Number)
          
          // Check if we should send now (within 15 minute window)
          const hourMatch = cairoHour === targetHour
          const minuteMatch = Math.abs(cairoMinute - targetMinute) <= 15
          
          if (!hourMatch || !minuteMatch) {
            console.log(`Skipping user ${userPref.user_id} - not their time (target: ${targetHour}:${targetMinute}, current: ${cairoHour}:${cairoMinute})`)
            continue
          }
        }
        
        // Get user details (might be cached from direct query)
        let userData = (userPref as any)._userData
        if (!userData) {
          const { data: fetchedUser, error: userError } = await supabase
            .from('users')
            .select('id, name, email, clinic_id')
            .eq('auth_uid', userPref.user_id)
            .single()
          
          if (userError || !fetchedUser?.email) {
            console.log(`No user data found for ${userPref.user_id}:`, userError)
            continue
          }
          userData = fetchedUser
        }
        
        // If target email specified, skip others
        if (targetEmail && userData.email !== targetEmail) {
          continue
        }
        
        console.log(`Processing user: ${userData.name} (${userData.email}), clinic: ${userData.clinic_id}`)
        
        // Get clinic details
        let clinicName = 'العيادة'
        if (userData.clinic_id) {
          const { data: clinicData } = await supabase
            .from('clinics')
            .select('name')
            .eq('clinic_uuid', userData.clinic_id)
            .single()
          clinicName = clinicData?.name || 'العيادة'
        }
        
        // Get today's appointments - try RPC first, fallback to direct query
        let appointments: any[] = []
        
        if (userData.clinic_id) {
          // Try RPC function first
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_daily_appointments_for_email', {
              p_clinic_id: userData.clinic_id,
              p_date: todayStr
            })
          
          if (!rpcError && rpcData) {
            appointments = rpcData
          } else {
            console.log('RPC not available, using direct query...')
            // Fallback to direct query
            const { data: directApts } = await supabase
              .from('appointments')
              .select(`
                id,
                appointment_time,
                status,
                notes,
                patients!inner(name, phone)
              `)
              .eq('clinic_id', userData.clinic_id)
              .gte('appointment_time', `${todayStr}T00:00:00`)
              .lt('appointment_time', `${todayStr}T23:59:59`)
              .in('status', ['confirmed', 'scheduled', 'pending'])
              .order('appointment_time', { ascending: true })
            
            if (directApts) {
              appointments = directApts.map(apt => ({
                appointment_time: apt.appointment_time,
                patient_name: (apt.patients as any)?.name || 'مريض',
                notes: apt.notes
              }))
            }
          }
        }
        
        console.log(`Found ${appointments.length} appointments for ${userData.name}`)
        
        // Skip if no appointments (unless force mode)
        if ((!appointments || appointments.length === 0) && !forceMode) {
          console.log(`No appointments for ${userData.name} today - skipping email`)
          
          // Log as skipped
          try {
            await supabase.from('daily_email_logs').insert({
              user_id: userPref.user_id,
              clinic_id: userData.clinic_id,
              email_to: userData.email,
              appointments_count: 0,
              status: 'skipped'
            })
          } catch (logErr) {
            console.log('Could not log skip:', logErr)
          }
          
          continue
        }
        
        // Generate email HTML
        const emailHtml = generateEmailHTML(
          userData.name || 'دكتور',
          clinicName,
          todayStr,
          appointments.length > 0 ? appointments : [{ appointment_time: '-', patient_name: 'لا توجد مواعيد', notes: '' }]
        )
        
        const subject = appointments.length > 0 
          ? `📅 مواعيدك النهارده (${appointments.length} موعد)`
          : `📅 مواعيد اليوم - تجربة`
        
        // Send email
        await sendEmail(userData.email, subject, emailHtml)
        
        // Log success
        try {
          await supabase.from('daily_email_logs').insert({
            user_id: userPref.user_id,
            clinic_id: userData.clinic_id,
            email_to: userData.email,
            appointments_count: appointments.length,
            status: 'sent'
          })
        } catch (logErr) {
          console.log('Could not log success:', logErr)
        }
        
        results.push({
          user_id: userPref.user_id,
          email: userData.email,
          name: userData.name,
          appointments: appointments.length,
          status: 'sent'
        })
        
        console.log(`✅ Email sent to ${userData.email} with ${appointments.length} appointments`)
        
      } catch (userError: any) {
        console.error(`Error processing user ${userPref.user_id}:`, userError)
        
        // Log failure
        try {
          await supabase.from('daily_email_logs').insert({
            user_id: userPref.user_id,
            clinic_id: null,
            email_to: 'unknown',
            appointments_count: 0,
            status: 'failed',
            error_message: userError.message
          })
        } catch (logErr) {
          console.log('Could not log failure:', logErr)
        }
        
        results.push({
          user_id: userPref.user_id,
          status: 'failed',
          error: userError.message
        })
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        cairoTime: `${cairoHour}:${cairoMinute}`,
        date: todayStr,
        processed: results.length,
        forceMode,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error: any) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
