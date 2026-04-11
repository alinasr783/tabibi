import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    let body: any = null
    let customerReference: string | null = null
    let easykashRef: string | null = null
    let status: string | null = null

    if (req.method === "GET") {
      const url = new URL(req.url)
      const searchParams = url.searchParams
      customerReference = searchParams.get("customerReference")
      easykashRef = searchParams.get("easykashRef") || searchParams.get("providerRefNum")
      status = searchParams.get("status")
      body = {
        ...Object.fromEntries(searchParams.entries()),
        customerReference,
        easykashRef,
        status,
        _source: "query",
      }
    } else if (req.method === "POST") {
      try {
        body = await req.json()
      } catch {
        const text = await req.text()
        if (text) {
          try {
            const params = new URLSearchParams(text)
            body = Object.fromEntries(params.entries())
          } catch {
            body = {}
          }
        } else {
          body = {}
        }
      }

      customerReference = body.customerReference || body.customer_reference || null
      easykashRef = body.easykashRef || body.providerRefNum || null
      status = body.status || null
    } else {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders })
    }

    console.log("EasyKash webhook payload:", JSON.stringify(body))

    if (!customerReference) {
      return new Response(JSON.stringify({ error: "Missing customerReference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server misconfiguration: Missing Supabase Environment Variables")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const referenceNumber = Number(customerReference)

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("id, status, type, amount, clinic_id, metadata, reference_number")
      .eq("reference_number", referenceNumber)
      .maybeSingle()

    if (txError) {
      console.error("Webhook lookup error:", txError)
      return new Response(JSON.stringify({ error: "Failed to lookup transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!tx) {
      console.warn("Webhook: transaction not found for reference", referenceNumber)
      return new Response(JSON.stringify({ ok: true, message: "Transaction not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let newStatus: string = tx.status
    if (status === "PAID") {
      newStatus = "completed"
    } else if (status === "FAILED") {
      newStatus = "failed"
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: newStatus,
        easykash_ref: easykashRef,
        response_data: body,
      })
      .eq("reference_number", referenceNumber)

    if (updateError) {
      console.error("Webhook update error:", updateError)
      return new Response(JSON.stringify({ error: "Failed to update transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (status === "PAID") {
      const isBooking = tx?.type === "booking" || tx?.metadata?.type === "booking";
      if (isBooking && tx?.clinic_id) {
        const alreadyFulfilled = tx?.metadata && typeof tx.metadata === "object" && tx.metadata.fulfilled === true;
        if (!alreadyFulfilled) {
          const booking = tx?.metadata?.booking && typeof tx.metadata.booking === "object" ? tx.metadata.booking : null;

          const { data: walletRow } = await supabase
            .from("clinic_profile_wallets")
            .select("id, balance")
            .eq("clinic_id", tx.clinic_id)
            .maybeSingle();

          let walletId = walletRow?.id;
          let balance = Number(walletRow?.balance || 0);

          if (!walletId) {
            const { data: createdWallet } = await supabase
              .from("clinic_profile_wallets")
              .insert({ clinic_id: tx.clinic_id, balance: 0 })
              .select("id, balance")
              .single();
            walletId = createdWallet?.id;
            balance = Number(createdWallet?.balance || 0);
          }

          if (walletId && tx?.amount) {
            const refId = String(tx.reference_number);
            const { data: existingWalletTx } = await supabase
              .from("clinic_profile_wallet_transactions")
              .select("id")
              .eq("reference_type", "booking")
              .eq("reference_id", refId)
              .maybeSingle();

            if (!existingWalletTx) {
              await supabase
                .from("clinic_profile_wallets")
                .update({ balance: balance + Number(tx.amount) })
                .eq("id", walletId);

              await supabase.from("clinic_profile_wallet_transactions").insert({
                wallet_id: walletId,
                amount: Number(tx.amount),
                type: "customer_payment",
                description: "حجز إلكتروني مدفوع",
                reference_type: "booking",
                reference_id: refId,
                status: "completed",
              });
            }
          }

          let appointmentId: any = null;
          if (booking?.patient_id && booking?.date) {
            const insertRow: any = {
              clinic_id: tx.clinic_id,
              patient_id: Number(booking.patient_id),
              date: String(booking.date),
              notes: typeof booking.notes === "string" ? booking.notes : "",
              price: Number(booking.price ?? tx.amount ?? 0),
              from: String(booking.from || "booking"),
              status: "paid",
            };

            const { data: appt, error: apptError } = await supabase
              .from("appointments")
              .insert(insertRow)
              .select("id")
              .single();

            if (!apptError) {
              appointmentId = appt?.id || null;
            }
          }

          const nextMetadata = {
            ...(tx?.metadata && typeof tx.metadata === "object" ? tx.metadata : {}),
            fulfilled: true,
            appointment_id: appointmentId,
          };

          await supabase
            .from("transactions")
            .update({ metadata: nextMetadata })
            .eq("reference_number", referenceNumber);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Webhook error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
