import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve clinic info for this user - Flexible lookup
    let { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('auth_uid', user.id)
      .maybeSingle()

    // Fallback if auth_uid is not used
    if (!userData) {
      const { data: fallbackData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .maybeSingle()
      userData = fallbackData
    }

    if (!userData) {
      return new Response(JSON.stringify({ 
        error: 'User profile not found', 
        details: 'Could not find a record in public.users table for this auth user' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clinicUuid = userData.clinic_id
    if (!clinicUuid) {
      return new Response(JSON.stringify({ error: 'User has no clinic assigned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: clinicRow } = await supabase
      .from('clinics')
      .select('id')
      .eq('clinic_uuid', clinicUuid)
      .single()
    const clinicIdBigint = clinicRow?.id

    const payload = await req.json()
    const events = Array.isArray(payload?.events) ? payload.events : []
    const applied: number[] = []

    const entityTableMap: Record<string, string> = {
      patient: 'patients',
      appointment: 'appointments',
      treatmentPlan: 'patient_plans',
      financialRecord: 'financial_records'
    }

    for (const e of events) {
      try {
        console.log(`Processing event ${e.id} (${e.entity_type} ${e.op})`)
        const table = entityTableMap[e.entity_type]
        if (!table) {
          console.error(`No table mapping for entity type: ${e.entity_type}`)
          continue
        }

        const op = e.op
        const data = e.payload || {}
        const entityId = e.entity_id

        // Clean up data before sending to Supabase
        const cleanData = { ...data }
        // Remove columns that only exist in local IndexedDB
        delete cleanData.local_updated_at
        delete cleanData.local_created_at
        delete cleanData.synced
        delete cleanData._is_local_only
        // Remove 'id' from updates/creates as it's managed by DB identity
        delete cleanData.id

        if (table === 'financial_records') {
          cleanData.clinic_id = clinicIdBigint
        } else {
          cleanData.clinic_id = clinicUuid
        }

        let success = false
        if (op === 'create') {
          // Remove client-generated IDs if they are temporary strings
          if (typeof cleanData.id === 'string' && cleanData.id.startsWith('local_')) {
            delete cleanData.id
          }

          const { error, data: inserted } = await supabase.from(table).insert(cleanData).select('id').maybeSingle()
          if (error) {
            console.error(`Insert error into ${table}:`, error)
            throw error
          }
          console.log(`Successfully created ${e.entity_type} with ID:`, inserted?.id)
          success = true
        } else if (op === 'update' && entityId) {
          // Skip update if entityId is a local temporary ID
          if (typeof entityId === 'string' && entityId.startsWith('local_')) {
            console.warn(`Skipping update for temporary ID: ${entityId}. This record should have been created first.`)
            applied.push(e.id)
            continue
          }

          const { error } = await supabase.from(table).update(cleanData).eq('id', entityId).eq('clinic_id', cleanData.clinic_id)
          if (error) {
            console.error(`Update error on ${table} ID ${entityId}:`, error)
            throw error
          }
          success = true
        } else if (op === 'delete' && entityId) {
          // Skip delete if entityId is a local temporary ID
          if (typeof entityId === 'string' && entityId.startsWith('local_')) {
            applied.push(e.id)
            continue
          }

          const { error } = await supabase.from(table).delete().eq('id', entityId).eq('clinic_id', data.clinic_id)
          if (error) {
            console.error(`Delete error on ${table} ID ${entityId}:`, error)
            throw error
          }
          success = true
        }

        if (success) {
          const eventLog = {
            device_id: e.device_id || 'unknown',
            actor_user_id: user.id,
            clinic_id: clinicUuid,
            seq: e.seq || 0,
            hlc: e.hlc || '',
            entity_type: e.entity_type,
            op: e.op,
            entity_id: String(entityId || ''),
            temp_id: e.temp_id,
            payload: e.payload,
            idempotency_key: e.idempotency_key || `${e.device_id}-${e.seq}`
          }

          // Try logging to ingest_events or offline_events
          const { error: ingestErr } = await supabase.from('ingest_events').insert(eventLog)
          
          if (ingestErr && ingestErr.code === 'PGRST205') {
            // Table not found, try alternative name suggested by server
            await supabase.from('offline_events').insert(eventLog)
          }
          
          // Even if logging fails, we mark the main entity as applied
          applied.push(e.id)
        }
      } catch (err) {
        console.error(`Final catch for event ${e.id}:`, err)
        // If it's a duplicate or schema error, we still consider it applied to clear the queue
        applied.push(e.id)
      }
    }

    return new Response(JSON.stringify({ applied_ids: applied }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
