import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || ""
    if (!auth) return new Response("Unauthorized", { status: 401 })
    const payload = await req.json()
    const events = Array.isArray(payload?.events) ? payload.events : []
    const applied: number[] = []
    for (const e of events) {
      if (e?.entity_type === "patient" && e?.op === "create") {
        const p = e?.payload || {}
        const insertObj: Record<string, unknown> = {}
        const allowed = new Set([
          "name","phone","address","date_of_birth","blood_type","gender",
          "clinic_id","age","age_unit","job","marital_status","email",
          "notes","medical_history","insurance_info","custom_fields"
        ])
        for (const k in p) {
          if (allowed.has(k)) insertObj[k] = p[k]
        }
        const { error } = await supabase.from("patients").insert(insertObj)
        if (error) continue
      }
      // TODO: handle other entity types (appointments, treatment plans) similarly
      applied.push(e.id)
    }
    return new Response(JSON.stringify({ applied_ids: applied }), { headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
