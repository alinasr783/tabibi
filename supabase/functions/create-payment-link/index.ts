import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked");

    // 1. Get request body
    const { amount, currency, metadata, user_id, clinic_id, redirect_url } = await req.json()
    console.log(`Parsed body for user: ${user_id}, amount: ${amount}`);
    
    if (!amount || !user_id) {
      throw new Error('Missing required fields: amount, user_id')
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
        user_id,
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

    // Use the hardcoded key directly to avoid Environment Variable issues
    const easykashToken = '3qjfyybxg9iw5lft'; 
    
    if (!easykashToken) {
        throw new Error('Server misconfiguration: Missing EASYKASH_API_KEY')
    }
    // Log token prefix for debugging
    console.log(`Using EasyKash Token: ${easykashToken}`);

    const easykashPayload = {
      amount: Number(amount), // Ensure number
      currency: currency || 'EGP',
      paymentOptions: [2, 4, 5], // Card, Wallet, Fawry
      cashExpiry: 12, // 12 hours
      name: metadata?.buyer_name || 'Tabibi User',
      email: metadata?.buyer_email || 'no-email@tabibi.net',
      mobile: normalizeEgyptMobile(metadata?.buyer_mobile),
      redirectUrl: redirect_url,
      customerReference: Number(transaction.reference_number) || Date.now(), // Fallback to timestamp if ref is missing/NaN
    }

    console.log('Payload:', JSON.stringify(easykashPayload))

    // 4. Call EasyKash API (Direct Pay V1)
    // Documentation: https://back.easykash.net/api/directpayv1/pay
    const endpoint = 'https://back.easykash.net/api/directpayv1/pay';
    
    console.log(`Attempting EasyKash API at: ${endpoint}`);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': easykashToken
            },
            body: JSON.stringify(easykashPayload)
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        console.log(`EasyKash Response Status: ${response.status}`);
        console.log(`EasyKash Response Body: ${text}`);

        let data;
        try {
                if (contentType.includes('text/html') || text.trim().startsWith('<')) {
                    throw new Error(`EasyKash returned HTML (Status: ${response.status})`);
                }
                data = JSON.parse(text);
        } catch (e) {
                throw new Error(`Invalid JSON: ${text.substring(0, 100)}...`);
        }

        if (data.redirectUrl) {
            // Success!
            let paymentUrl = data.redirectUrl;
            if (paymentUrl.startsWith('/')) {
                paymentUrl = `https://www.easykash.net${paymentUrl}`;
            }

            return new Response(
                JSON.stringify({ 
                    url: paymentUrl, 
                    transactionId: transaction.id,
                    referenceNumber: transaction.reference_number
                }),
                { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200 
                }
            );
        } else if (data.responseCode !== 200 && data.status !== 'success') {
            const msg = data.message || data.error || text || 'Unknown EasyKash Error';
            throw new Error(msg);
        } else {
                // Unexpected structure
                throw new Error(`Unexpected response structure: ${JSON.stringify(data)}`);
        }

    } catch (err) {
        console.error('EasyKash Request Failed:', err.message);
        throw new Error(`EasyKash API Error: ${err.message}`);
    }

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
