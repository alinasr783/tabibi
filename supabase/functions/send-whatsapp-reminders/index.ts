import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get due reminders
    const { data: reminders, error: fetchError } = await supabaseClient.rpc('get_due_whatsapp_reminders')

    if (fetchError) throw fetchError

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders due" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const results = []

    // 2. Iterate and send
    for (const reminder of reminders) {
      try {
         // Format Phone
         const phone = formatPhoneNumber(reminder.patient_phone)
         if (!phone) {
             results.push({ id: reminder.appointment_id, status: 'skipped', reason: 'invalid phone' })
             continue
         }

         // Process Template
         const messageText = processTemplate(reminder.reminder_template, {
             clinic_name: reminder.clinic_name,
             patient_name: reminder.patient_name,
             date: new Date(reminder.appointment_time).toLocaleDateString('ar-EG'),
             time: new Date(reminder.appointment_time).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
             offset: reminder.reminder_offset,
             appointment_id: reminder.appointment_id
         })

         // Send API Request
         const response = await fetch(`https://api.message-pro.com/api/v2/${reminder.instance_id}/send-message`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'token': Deno.env.get('MESSAGE_PRO_API_TOKEN') ?? ''
             },
             body: JSON.stringify({
                 chat_id: phone,
                 text: messageText
             })
         })
         
         const result = await response.json()
         
         // Log result
         await supabaseClient.from('whatsapp_message_logs').insert({
             clinic_id: reminder.clinic_id,
             appointment_id: reminder.appointment_id,
             patient_phone: phone,
             message_type: 'reminder',
             status: response.ok ? 'sent' : 'failed',
             provider_message_id: result.message_id || null,
             error_message: response.ok ? null : (result.message || JSON.stringify(result))
         })

         results.push({ id: reminder.appointment_id, status: response.ok ? 'sent' : 'failed' })

      } catch (err) {
         console.error(`Error processing reminder ${reminder.appointment_id}:`, err)
         results.push({ id: reminder.appointment_id, status: 'error', error: err.message })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

function formatPhoneNumber(phone: string) {
  if (!phone) return null;
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Egyptian number logic
  if (cleanPhone.startsWith('01')) {
    cleanPhone = '+20' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length > 10) {
    cleanPhone = '+' + cleanPhone;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
     cleanPhone = '+20' + cleanPhone;
  }

  // Ensure + prefix
  if (!cleanPhone.startsWith('+')) {
     if (cleanPhone.length === 11) cleanPhone = '+20' + cleanPhone.substring(1); // Last resort assumption
  }
  
  return cleanPhone;
}

function processTemplate(template: string, data: any) {
    return template.replace(/{(\w+)}/g, (match, key) => {
        return data[key] || match;
    });
}
