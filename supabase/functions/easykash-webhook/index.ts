import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to convert ArrayBuffer to Hex
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Webhook received:', payload)

    const secret = Deno.env.get('EASYKASH_HMAC_SECRET')
    if (!secret) {
      throw new Error('Server misconfiguration: Missing HMAC Secret')
    }

    // 1. Verify Signature
    // Expected Formula: HMAC-SHA512 of concatenated fields
    // Order: ProductCode + Amount + ProductType + PaymentMethod + status + easykashRef + customerReference
    // Note: Ensure the order matches EasyKash documentation exactly.
    const dataString = 
        String(payload.productCode || '') +
        String(payload.amount || '') +
        String(payload.productType || '') +
        String(payload.paymentMethod || '') +
        String(payload.status || '') +
        String(payload.easykashRef || '') +
        String(payload.customerReference || '');

    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      keyData,
      encoder.encode(dataString)
    );

    const calculatedHash = bufferToHex(signature);
    
    // Check if signature matches (case-insensitive usually, but strict is better)
    if (calculatedHash.toLowerCase() !== (payload.signatureHash || '').toLowerCase()) {
       console.error('Invalid Signature:', { calculated: calculatedHash, received: payload.signatureHash })
       // We might return 400 or 401, but for security sometimes 200 is returned to not leak info.
       // But here we want to know if it fails.
       throw new Error('Invalid HMAC Signature')
    }

    // 2. Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Update Transaction
    const referenceNumber = payload.customerReference;
    const easykashRef = payload.easykashRef;
    const paymentStatus = payload.status === 'PAID' ? 'completed' : 'failed';

    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: paymentStatus,
        easykash_ref: easykashRef,
        response_data: payload,
        updated_at: new Date().toISOString()
      })
      .eq('reference_number', referenceNumber)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update transaction:', updateError)
      throw new Error('Database update failed')
    }

    // 4. Handle Subscription Activation (Optional - Server Side)
    // Ideally, if status is 'completed' and type is 'subscription', we activate the subscription here.
    // This ensures that even if the user closes the browser, the subscription is activated.
    if (transaction && transaction.status === 'completed' && transaction.type === 'subscription') {
       // TODO: Call createSubscription logic or insert into subscriptions table directly.
       // For now, we rely on the Frontend Callback to finalize, or the user can check 'My Subscription'.
       // To be robust, you should implement the subscription insertion here.
       console.log('Payment successful for subscription. Transaction:', transaction.id)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Webhook Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
