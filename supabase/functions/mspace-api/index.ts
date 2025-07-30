import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface MspaceCredentials {
  username: string;
  password: string;
  senderId?: string;
}

interface MspaceRequest {
  operation: 'balance' | 'sendSMS' | 'subUsers' | 'resellerClients' | 'topUpReseller' | 'topUpSub' | 'login';
  credentials?: MspaceCredentials;
  recipient?: string;
  message?: string;
  senderId?: string;
  clientname?: string;
  subaccname?: string;
  noofsms?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Authorization header',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing environment variables',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse request body
    const { operation, credentials, recipient, message, senderId, clientname, subaccname, noofsms }: MspaceRequest = await req.json()

    // Get credentials from database if not provided
    let mspaceCredentials = credentials;
    if (!mspaceCredentials) {
      const { data: dbCredentials, error: credError } = await supabaseClient
        .from('api_credentials')
        .select('api_key_encrypted, username, sender_id')
        .eq('user_id', user.id)
        .eq('service_name', 'mspace')
        .eq('is_active', true)
        .single()

      if (credError || !dbCredentials) {
        throw new Error('Mspace credentials not found. Please configure your credentials first.')
      }

      // Use the api_key_encrypted as the password for Mspace API
      mspaceCredentials = {
        username: dbCredentials.username,
        password: dbCredentials.api_key_encrypted,
        senderId: dbCredentials.sender_id || 'MSPACE'
      }

      // Validate that we have a proper API key (should be 128 characters)
      if (!mspaceCredentials.password || mspaceCredentials.password.length !== 128) {
        throw new Error(`Invalid Mspace API key format. Expected 128 characters, got ${mspaceCredentials.password?.length || 0}`)
      }
    }

    if (!mspaceCredentials) {
      throw new Error('No credentials available')
    }

    // Use the correct Mspace API v2 endpoints based on official documentation
    let url = ''
    let method = 'POST'
    let body: any = null
    let responseData: any = null

    switch (operation) {
      case 'balance':
        // Use the v2 API with POST request and apikey header
        url = `https://api.mspace.co.ke/smsapi/v2/balance`
        method = 'POST'
        body = JSON.stringify({ 
          username: mspaceCredentials.username 
        })
        break

      case 'sendSMS':
        if (!recipient || !message) {
          throw new Error('Recipient and message are required for SMS sending')
        }
        const senderIdParam = senderId || mspaceCredentials.senderId || 'MSPACE'
        url = `https://api.mspace.co.ke/smsapi/v2/sendtext`
        method = 'POST'
        body = JSON.stringify({
          username: mspaceCredentials.username,
          senderId: senderIdParam,
          recipient: recipient,
          message: message
        })
        break

      case 'subUsers':
        url = `https://api.mspace.co.ke/smsapi/v2/subusers`
        method = 'POST'
        body = JSON.stringify({ 
          username: mspaceCredentials.username 
        })
        break

      case 'resellerClients':
        url = `https://api.mspace.co.ke/smsapi/v2/resellerclients`
        method = 'POST'
        body = JSON.stringify({ 
          username: mspaceCredentials.username 
        })
        break

      case 'topUpReseller':
        if (!clientname || !noofsms) {
          throw new Error('Client name and number of SMS are required for reseller top-up')
        }
        // Note: This endpoint might not be available in v2 API, keeping old format for now
        url = `https://api.mspace.co.ke/mspaceservice/wr/sms/resellerclienttopup/username=${mspaceCredentials.username}/password=${mspaceCredentials.password}/clientname=${clientname}/noofsms=${noofsms}`
        method = 'GET'
        break

      case 'topUpSub':
        if (!subaccname || !noofsms) {
          throw new Error('Sub account name and number of SMS are required for sub account top-up')
        }
        // Note: This endpoint might not be available in v2 API, keeping old format for now
        url = `https://api.mspace.co.ke/mspaceservice/wr/sms/subacctopup/username=${mspaceCredentials.username}/password=${mspaceCredentials.password}/subaccname=${subaccname}/noofsms=${noofsms}`
        method = 'GET'
        break

      case 'login':
        // Test credentials using balance endpoint
        url = `https://api.mspace.co.ke/smsapi/v2/balance`
        method = 'POST'
        body = JSON.stringify({ 
          username: mspaceCredentials.username 
        })
        break

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    console.log(`Making Mspace API call: ${operation}`)
    console.log(`URL: ${url.replace(mspaceCredentials.password, '[HIDDEN]')}`)
    console.log(`Username: ${mspaceCredentials.username}`)
    console.log(`API Key length: ${mspaceCredentials.password?.length || 0}`)

    // Make the API call to Mspace with proper headers based on v2 API documentation
    const fetchOptions: any = {
      method: method,
      headers: {
        'apikey': mspaceCredentials.password, // API key goes in header for v2 API
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MobiWave-SMS-Service/1.0'
      }
    }

    // For GET requests (legacy endpoints), don't include Content-Type and body
    if (method === 'GET') {
      delete fetchOptions.headers['Content-Type']
    } else if (body) {
      fetchOptions.body = body
    }

    const mspaceResponse = await fetch(url, fetchOptions)

    const responseText = await mspaceResponse.text()
    console.log(`Mspace API response status: ${mspaceResponse.status}`)
    console.log(`Mspace API response: ${responseText}`)

    if (!mspaceResponse.ok) {
      throw new Error(`Mspace API error (${mspaceResponse.status}): ${responseText}`)
    }

    // Parse and process the response based on operation type
    switch (operation) {
      case 'balance':
        if (responseText.includes('Error 100: Authentication Failure')) {
          responseData = {
            balance: 0,
            status: 'error',
            error: 'Authentication Failure - Invalid username or password'
          }
        } else {
          const balance = parseInt(responseText.trim())
          responseData = {
            balance: isNaN(balance) ? 0 : balance,
            status: isNaN(balance) ? 'error' : 'success',
            error: isNaN(balance) ? `Invalid balance response: ${responseText}` : undefined
          }
        }
        break

      case 'sendSMS':
        if (responseText.includes('Authentication failure')) {
          responseData = {
            messageId: '',
            responseTime: new Date().toISOString(),
            status: 'failed',
            error: 'Authentication failure'
          }
        } else if (responseText.includes('Insufficient Balance')) {
          responseData = {
            messageId: '',
            responseTime: new Date().toISOString(),
            status: 'failed',
            error: 'Insufficient Balance'
          }
        } else {
          try {
            const jsonResponse = JSON.parse(responseText)
            if (Array.isArray(jsonResponse) && jsonResponse.length > 0) {
              const result = jsonResponse[0]
              responseData = {
                messageId: result.messageId || '',
                responseTime: result.responseTime || new Date().toISOString(),
                status: result.status === 'successful' ? 'successful' : 'failed',
                error: result.status !== 'successful' ? 'SMS sending failed' : undefined
              }
            } else {
              responseData = {
                messageId: '',
                responseTime: new Date().toISOString(),
                status: 'failed',
                error: 'Invalid response format'
              }
            }
          } catch (parseError) {
            responseData = {
              messageId: '',
              responseTime: new Date().toISOString(),
              status: 'failed',
              error: `Parse error: ${responseText}`
            }
          }
        }
        break

      case 'subUsers':
      case 'resellerClients':
        if (responseText.includes('Authentication failure')) {
          throw new Error('Authentication failure - Invalid credentials')
        }
        try {
          responseData = JSON.parse(responseText)
          if (!Array.isArray(responseData)) {
            responseData = []
          }
        } catch (parseError) {
          responseData = []
        }
        break

      case 'topUpReseller':
      case 'topUpSub':
        if (responseText.includes('Successful Top up')) {
          responseData = {
            status: 'success',
            message: responseText
          }
        } else if (responseText.includes('Authentication failure')) {
          responseData = {
            status: 'error',
            message: 'Authentication failure',
            error: 'Authentication failure'
          }
        } else if (responseText.includes('Insufficient Balance')) {
          responseData = {
            status: 'error',
            message: 'Insufficient Balance',
            error: 'Insufficient Balance'
          }
        } else if (responseText.includes('You are not Authorized')) {
          responseData = {
            status: 'error',
            message: 'Not authorized for this transaction',
            error: 'Not Authorized'
          }
        } else {
          responseData = {
            status: 'error',
            message: responseText,
            error: 'Unknown error'
          }
        }
        break

      case 'login':
        if (responseText.includes('Authentication failure')) {
          responseData = {
            status: 'error',
            message: 'Authentication failure',
            error: 'Authentication failure'
          }
        } else {
          responseData = {
            status: 'success',
            message: 'Login successful'
          }
        }
        break
    }

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        data: responseData,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Mspace API proxy error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200, // Always return 200 for CORS compatibility
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
