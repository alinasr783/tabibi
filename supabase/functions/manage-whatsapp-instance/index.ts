
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  try {
    const { action, clinicId, instanceId, phone } = await req.json()
    const token = Deno.env.get('MESSAGE_PRO_API_TOKEN')

    if (!token) {
      throw new Error('Missing MESSAGE_PRO_API_TOKEN')
    }

    const safeJson = async (res: Response) => {
      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        return { message: text }
      }
    }

    const requestJson = async (url: string, init: RequestInit) => {
      const res = await fetch(url, init)
      const data = await safeJson(res)
      return { res, data }
    }

    // 1. Create Instance
    if (action === 'create') {
      const instanceName = `clinic_${clinicId}_${Date.now()}`
      
      console.log(`Creating instance: ${instanceName}`)

      const candidates = [
        'https://api.message-pro.com/api/v2/instances',
        'https://api.message-pro.com/api/v2/instance/create',
      ]

      let lastError = 'Failed to create instance'
      for (const url of candidates) {
        const { res, data } = await requestJson(url, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instance_name: instanceName,
            description: `Clinic ${clinicId} - Phone ${phone || 'Unknown'}`
          }),
        })

        console.log('Create response:', data)

        if (res.ok) {
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        lastError = data?.message || data?.error || lastError
      }

      throw new Error(lastError)
    }

    // 2. Get QR Code
    if (action === 'get_qr') {
      if (!instanceId) throw new Error('instanceId is required')

      console.log(`Getting QR for: ${instanceId}`)

      const candidates = [
        `https://api.message-pro.com/api/v2/instances/${instanceId}/qr-code`,
        `https://api.message-pro.com/api/v2/${instanceId}/qr-code`,
      ]

      let lastError = 'Failed to get QR'
      for (const url of candidates) {
        const { res, data } = await requestJson(url, {
          method: 'GET',
          headers: {
            'token': token,
          },
        })

        if (res.ok) {
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        lastError = data?.message || data?.error || lastError
      }

      throw new Error(lastError)
      
    }

    // 3. Get Status
    if (action === 'status') {
      if (!instanceId) throw new Error('instanceId is required')

      console.log(`Getting status for: ${instanceId}`)

      const candidates = [
        `https://api.message-pro.com/api/v2/instances/${instanceId}/status`,
        `https://api.message-pro.com/api/v2/${instanceId}/status`,
      ]

      let lastError = 'Failed to get status'
      for (const url of candidates) {
        const { res, data } = await requestJson(url, {
          method: 'GET',
          headers: {
            'token': token,
          },
        })

        if (res.ok) {
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        lastError = data?.message || data?.error || lastError
      }

      throw new Error(lastError)
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
