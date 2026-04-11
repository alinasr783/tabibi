import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FUNCTION_VERSION = "2026-04-11-booking-no-user-id"

function jsonRes(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  })
}

function redirectRes(location: string) {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: location },
  })
}

async function fulfillBooking({
  supabase,
  referenceNumber,
  easykashRef,
  rawStatus,
}: {
  supabase: any
  referenceNumber: number
  easykashRef: string | null
  rawStatus: string | null
}) {
  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("id, status, type, amount, clinic_id, metadata, reference_number")
    .eq("reference_number", referenceNumber)
    .maybeSingle()

  if (txError) throw txError
  if (!tx) return { ok: false, reason: "tx_not_found" }

  let newStatus: string = tx.status
  if (rawStatus === "PAID") newStatus = "completed"
  else if (rawStatus === "FAILED") newStatus = "failed"

  if (newStatus !== tx.status || easykashRef) {
    await supabase
      .from("transactions")
      .update({
        status: newStatus,
        easykash_ref: easykashRef,
      })
      .eq("reference_number", referenceNumber)
  }

  const isBooking = tx?.type === "booking" || tx?.metadata?.type === "booking"
  if (!isBooking) return { ok: true, status: newStatus, referenceNumber }

  if (rawStatus !== "PAID") return { ok: true, status: newStatus, referenceNumber }

  const alreadyFulfilled = tx?.metadata && typeof tx.metadata === "object" && tx.metadata.fulfilled === true
  if (alreadyFulfilled) {
    return { ok: true, status: newStatus, referenceNumber, appointmentId: tx?.metadata?.appointment_id || null }
  }

  const booking = tx?.metadata?.booking && typeof tx.metadata.booking === "object" ? tx.metadata.booking : null
  if (!booking?.patient_id || !booking?.date) return { ok: false, reason: "missing_booking_metadata" }

  const clinicId = tx.clinic_id

  const { data: walletRow } = await supabase
    .from("clinic_profile_wallets")
    .select("id, balance")
    .eq("clinic_id", clinicId)
    .maybeSingle()

  let walletId = walletRow?.id
  let balance = Number(walletRow?.balance || 0)

  if (!walletId) {
    const { data: createdWallet } = await supabase
      .from("clinic_profile_wallets")
      .insert({ clinic_id: clinicId, balance: 0 })
      .select("id, balance")
      .single()
    walletId = createdWallet?.id
    balance = Number(createdWallet?.balance || 0)
  }

  const refId = String(referenceNumber)
  const { data: existingWalletTx } = await supabase
    .from("clinic_profile_wallet_transactions")
    .select("id")
    .eq("reference_type", "booking")
    .eq("reference_id", refId)
    .maybeSingle()

  if (!existingWalletTx && walletId && tx?.amount) {
    await supabase.from("clinic_profile_wallets").update({ balance: balance + Number(tx.amount) }).eq("id", walletId)

    await supabase.from("clinic_profile_wallet_transactions").insert({
      wallet_id: walletId,
      amount: Number(tx.amount),
      type: "customer_payment",
      description: "دفع حجز إلكتروني",
      reference_type: "booking",
      reference_id: refId,
      status: "completed",
    })
  }

  let appointmentId: any = null
  const insertRow: any = {
    clinic_id: clinicId,
    patient_id: Number(booking.patient_id),
    date: String(booking.date),
    notes: typeof booking.notes === "string" ? booking.notes : "",
    price: Number(booking.price ?? tx.amount ?? 0),
    from: String(booking.from || "booking"),
    status: "paid",
  }

  const { data: appt, error: apptError } = await supabase.from("appointments").insert(insertRow).select("id").single()
  if (!apptError) appointmentId = appt?.id || null

  const nextMetadata = {
    ...(tx?.metadata && typeof tx.metadata === "object" ? tx.metadata : {}),
    fulfilled: true,
    appointment_id: appointmentId,
  }

  await supabase.from("transactions").update({ metadata: nextMetadata }).eq("reference_number", referenceNumber)

  return { ok: true, status: newStatus, referenceNumber, appointmentId }
}

function normalizeEgyptMobile(mobile: string | undefined): string {
  if (!mobile) return '01000000000'
  let digits = mobile.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('20')) digits = digits.slice(2)
  if (digits.length === 10 && digits.startsWith('1')) digits = '0' + digits
  if (digits.length === 11 && digits.startsWith('01')) return digits
  return '01000000000'
}

function mapPaymentMethodToOptions(method: string | undefined): number[] {
  if (!method) return [2, 4, 5]
  switch (method) {
    case 'card':
      return [2]
    case 'wallet':
      return [4]
    case 'cash':
    case 'fawry':
      return [5]
    default:
      return [2, 4, 5]
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked", { FUNCTION_VERSION });

    if (req.method === "GET") {
      const url = new URL(req.url)
      const redirectTo = url.searchParams.get("redirect_to") || ""
      const status = url.searchParams.get("status")
      const customerReference = url.searchParams.get("customerReference")
      const easykashRef = url.searchParams.get("easykashRef") || url.searchParams.get("providerRefNum") || null

      if (!redirectTo) {
        return jsonRes({ error: "Missing redirect_to", version: FUNCTION_VERSION }, 400)
      }
      if (!status || !customerReference) {
        const sep = redirectTo.includes("?") ? "&" : "?"
        return redirectRes(`${redirectTo}${sep}status=FAILED&customerReference=0&version=${encodeURIComponent(FUNCTION_VERSION)}`)
      }

      const referenceNumber = Number(customerReference)
      if (!Number.isFinite(referenceNumber)) {
        const sep = redirectTo.includes("?") ? "&" : "?"
        return redirectRes(
          `${redirectTo}${sep}status=${encodeURIComponent(status)}&customerReference=${encodeURIComponent(customerReference)}&version=${encodeURIComponent(FUNCTION_VERSION)}`
        )
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!supabaseUrl || !supabaseKey) {
        const sep = redirectTo.includes("?") ? "&" : "?"
        return redirectRes(`${redirectTo}${sep}status=FAILED&customerReference=${referenceNumber}&version=${encodeURIComponent(FUNCTION_VERSION)}`)
      }

      const supabase = createClient(supabaseUrl, supabaseKey)
      try {
        await fulfillBooking({ supabase, referenceNumber, easykashRef, rawStatus: status })
      } catch (e) {
        console.log("fulfillBooking error", { message: e?.message })
      }

      const sep = redirectTo.includes("?") ? "&" : "?"
      return redirectRes(
        `${redirectTo}${sep}status=${encodeURIComponent(status)}&customerReference=${encodeURIComponent(String(referenceNumber))}&version=${encodeURIComponent(FUNCTION_VERSION)}`
      )
    }

    const { amount, currency, metadata, user_id, clinic_id, redirect_url, payment_method } = await req.json()
    console.log(`Parsed body for user: ${user_id}, amount: ${amount}`);
    
    if (!amount || !clinic_id) {
      throw new Error('Missing required fields: amount, clinic_id')
    }

    // 2. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Server misconfiguration: Missing Supabase Environment Variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log("Supabase client initialized");

    // 3. Create Transaction Record (Pending)
    // We use insert().select() to get the ID and reference_number
    console.log("Creating transaction record...");
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        amount,
        currency: currency || 'EGP',
        status: 'pending',
        type: metadata?.type || 'subscription',
        user_id: user_id || null,
        clinic_id,
        metadata,
        response_data: {} // Initialize empty
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database Error:', dbError)
      throw new Error(`DB Error: Failed to create transaction record: ${dbError.message} - ${dbError.details || ''}`)
    }

    console.log('Transaction created:', transaction.id, transaction.reference_number)

    const easykashToken = '3qjfyybxg9iw5lft'
    
    if (!easykashToken) {
      throw new Error('Server misconfiguration: Missing EASYKASH_API_KEY')
    }
    console.log(`Using EasyKash Token: ${easykashToken}`)

    const normalizedMobile = normalizeEgyptMobile(metadata?.buyer_mobile)
    const customerReference = Number(transaction.reference_number) || Date.now()

    if (payment_method === 'fawry' || payment_method === 'cash') {
      const cashPayload = {
        payerEmail: metadata?.buyer_email || 'no-email@tabibi.net',
        payerMobile: normalizedMobile,
        amount: Number(amount),
        expiryDuration: 48,
        apiKey: easykashToken,
        VoucherData:
          metadata?.type === 'wallet'
            ? 'شحن رصيد محفظة طبيبي'
            : metadata?.type === 'booking'
              ? 'دفع حجز طبيبي'
              : 'دفع اشتراك طبيبي',
        payerName: metadata?.buyer_name || 'Tabibi User',
        type: 'in',
        customerReference,
      }

      console.log('EasyKash Cash Payload:', JSON.stringify(cashPayload))

      const cashEndpoint = 'https://back.easykash.net/api/cash-api/create'
      console.log(`Attempting EasyKash Cash API at: ${cashEndpoint}`)

      try {
        const response = await fetch(cashEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cashPayload),
        })

        const text = await response.text()
        console.log(`EasyKash Cash Response Status: ${response.status}`)
        console.log(`EasyKash Cash Response Body: ${text}`)

        let data: any
        try {
          data = JSON.parse(text)
        } catch (e) {
          throw new Error(`Invalid Cash JSON: ${text.substring(0, 100)}...`)
        }

        if (!response.ok) {
          const msg = data.message || data.error || text || 'Unknown EasyKash Cash Error'
          throw new Error(msg)
        }

        const voucherData = {
          voucher: data.voucher,
          expiryDate: data.expiryDate,
          provider: data.provider,
          easykashRef: data.easykashRef,
          customerReference,
        }

        return jsonRes({ ...voucherData, version: FUNCTION_VERSION }, 200)
      } catch (err: any) {
        console.error('EasyKash Cash Request Failed:', err.message)
        throw new Error(`EasyKash Cash API Error: ${err.message}`)
      }
    }

    const easykashPayload = {
      amount: Number(amount),
      currency: currency || 'EGP',
      paymentOptions: mapPaymentMethodToOptions(payment_method),
      cashExpiry: 12,
      name: metadata?.buyer_name || 'Tabibi User',
      email: metadata?.buyer_email || 'no-email@tabibi.net',
      mobile: normalizedMobile,
      redirectUrl: redirect_url,
      customerReference,
    }

    console.log('Payload:', JSON.stringify(easykashPayload))

    const endpoint = 'https://back.easykash.net/api/directpayv1/pay'
    
    console.log(`Attempting EasyKash API at: ${endpoint}`)
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': easykashToken
            },
            body: JSON.stringify(easykashPayload)
        })

        const contentType = response.headers.get('content-type') || ''
        const text = await response.text()
        
        console.log(`EasyKash Response Status: ${response.status}`)
        console.log(`EasyKash Response Body: ${text}`)

        let data
        try {
                if (contentType.includes('text/html') || text.trim().startsWith('<')) {
                    throw new Error(`EasyKash returned HTML (Status: ${response.status})`)
                }
                data = JSON.parse(text)
        } catch (e) {
                throw new Error(`Invalid JSON: ${text.substring(0, 100)}...`)
        }

        if (data.redirectUrl) {
            let paymentUrl = String(data.redirectUrl).trim().replace(/`/g, "")
            if (paymentUrl.startsWith('/')) {
                paymentUrl = `https://www.easykash.net${paymentUrl}`
            }

            return jsonRes({ 
              url: paymentUrl,
              transactionId: transaction.id,
              referenceNumber: transaction.reference_number,
              version: FUNCTION_VERSION,
            }, 200)
        } else if (data.responseCode !== 200 && data.status !== 'success') {
            const msg = data.message || data.error || text || 'Unknown EasyKash Error'
            throw new Error(msg)
        } else {
                throw new Error(`Unexpected response structure: ${JSON.stringify(data)}`)
        }

    } catch (err: any) {
        console.error('EasyKash Request Failed:', err.message)
        throw new Error(`EasyKash API Error: ${err.message}`)
    }

  } catch (error) {
    console.error('Error:', error.message)
    return jsonRes({ error: error.message, version: FUNCTION_VERSION }, 400)
  }
})
