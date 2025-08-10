import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// IMPORTANT: You must verify a domain with Resend.
// Replace 'onboarding@resend.dev' with an email address from your verified domain.
// For example: 'noreply@your-verified-domain.com'
const FROM_EMAIL = 'onboarding@resend.dev'; 

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, cc, subject, body } = await req.json()
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set in Supabase secrets.')
    }
    if (!to || !subject || !body) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const resendPayload = {
      from: FROM_EMAIL,
      to: [to],
      subject: subject,
      html: body.replace(/\n/g, '<br>'), // Convert newlines to <br> for HTML email
      cc: cc ? [cc] : undefined,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(resendPayload),
    })

    const data = await res.json()

    if (!res.ok) {
        console.error('Resend API Error:', data);
        throw new Error(data.message || 'Failed to send email via Resend.');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})