import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper for phone formatting
const formatPhoneNumber = (phone: string) => {
  if (!phone) return null;
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('01')) {
    cleanPhone = '+20' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length > 10) {
    cleanPhone = '+' + cleanPhone;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
     cleanPhone = '+20' + cleanPhone;
  }
  if (!cleanPhone.startsWith('+')) {
     if (cleanPhone.length === 11) cleanPhone = '+20' + cleanPhone.substring(1);
  }
  return cleanPhone;
};

// Helper for templating
const processTemplate = (template: string, data: any) => {
  let message = template || "";
  const replacements: Record<string, string> = {
    "{clinic_name}": data.clinic_name || "",
    "{patient_name}": data.patient_name || "",
    "{patient_phone}": data.patient_phone || "",
    "{date}": data.date || "",
    "{time}": data.time || "",
    "{offset}": String(data.offset || ""),
    "{appointment_id}": String(data.appointment_id || "")
  };
  for (const [key, value] of Object.entries(replacements)) {
    message = message.replace(new RegExp(key, 'g'), value);
  }
  return message;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clinicId, appointmentId, type } = await req.json();
    const token = Deno.env.get('MESSAGE_PRO_API_TOKEN');

    if (!token) throw new Error('MESSAGE_PRO_API_TOKEN is not set');

    // 1. Get Settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('whatsapp_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (settingsError || !settings) {
       // No settings, maybe not enabled.
       return new Response(JSON.stringify({ skipped: true, reason: 'No settings' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
       });
    }

    // Check if enabled
    if (type === 'booking' && !settings.enabled_immediate) {
       return new Response(JSON.stringify({ skipped: true, reason: 'Disabled immediate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
       });
    }
    // (Reminder logic is handled by cron, but if called manually?)
    if (type === 'reminder' && !settings.enabled_reminder) {
       return new Response(JSON.stringify({ skipped: true, reason: 'Disabled reminder' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
       });
    }

    // 2. Get Integration (Instance ID)
    const { data: integration, error: intError } = await supabaseClient
      .from('integrations')
      .select('settings')
      .eq('clinic_id', clinicId)
      .eq('provider', 'message-pro')
      .eq('integration_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (intError || !integration?.settings?.instance_id) {
      throw new Error('No active WhatsApp integration found');
    }

    const instanceId = integration.settings.instance_id;

    // 3. Get Appointment Details
    const { data: appt, error: apptError } = await supabaseClient
      .from('appointments')
      .select('*, patients(name, phone), clinics(name)')
      .eq('id', appointmentId)
      .single();
    
    if (apptError || !appt) {
      throw new Error('Appointment not found');
    }

    const patientPhone = appt.patients?.phone;
    const formattedPhone = formatPhoneNumber(patientPhone);
    
    if (!formattedPhone) {
        throw new Error('Invalid phone number');
    }

    // 4. Prepare Message
    const template = type === 'booking' ? settings.immediate_template : settings.reminder_template;
    const apptDate = new Date(appt.date);
    
    const messageText = processTemplate(template, {
         clinic_name: appt.clinics?.name || "العيادة",
         patient_name: appt.patients?.name || "المريض",
         patient_phone: patientPhone,
         date: apptDate.toLocaleDateString('ar-EG'),
         time: apptDate.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
         offset: settings.reminder_offset_minutes,
         appointment_id: appt.id
    });

    // 5. Send Message
    const response = await fetch(`https://api.message-pro.com/api/v2/${instanceId}/send-message`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: formattedPhone,
        text: messageText,
        priority: 0
      }),
    });

    const result = await response.json();

    // 6. Log Result
    const status = response.ok ? 'sent' : 'failed';
    const providerMessageId = result.message_id || null;
    const errorMessage = response.ok ? null : (result.message || JSON.stringify(result));

    await supabaseClient.from('whatsapp_message_logs').insert({
      clinic_id: clinicId,
      appointment_id: appointmentId,
      patient_id: appt.patient_id,
      message_type: type,
      status: status,
      message_id: providerMessageId,
      error_message: errorMessage,
      request_payload: {
        chat_id: formattedPhone,
        text: messageText,
        priority: 0
      },
      response_payload: result,
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
