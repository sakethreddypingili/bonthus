import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://esm.sh/resend@4.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set in Supabase project secrets.')
    }

    const resend = new Resend(resendApiKey)
    const { employeeEmail, employeeName, role, temporaryPassword, portalUrl } = await req.json()

    // 1. Basic Validation
    if (!employeeEmail || !employeeName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Compile HTML Template
    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; border: 1px solid #e5e7eb;">
    <h1 style="font-size: 24px; font-weight: 800; color: #000;">Welcome to LensCare, ${employeeName}!</h1>
    <p style="color: #4b5563; line-height: 1.6;">We're excited to have you on board as our new <strong>${role}</strong>. Your account has been initialized.</p>
    
    <div style="background: #f3f4f6; padding: 24px; border-radius: 12px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Portal URL</p>
      <p style="margin: 0 0 20px 0; font-weight: 600;"><a href="${portalUrl}" style="color: #000;">${portalUrl}</a></p>
      
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Username</p>
      <p style="margin: 0 0 20px 0; font-weight: 600;">${employeeEmail}</p>
      
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Temporary Password</p>
      <p style="margin: 0; font-family: monospace; font-weight: 700; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; display: inline-block;">${temporaryPassword}</p>
    </div>

    <a href="${portalUrl}" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase;">Log In To Dashboard</a>
    
    <p style="margin-top: 30px; font-size: 12px; color: #ef4444; font-weight: 600;">
      Security Notice: You must change this temporary password immediately after your first login.
    </p>
  </div>
</body>
</html>
    `;

    // 3. Dispatch via Resend SDK
    const { data, error } = await resend.emails.send({
      from: 'LensCare Team <onboarding@bonthus.in>',
      to: [employeeEmail],
      subject: `Welcome to the LensCare Team, ${employeeName}!`,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend SDK Error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Edge Function Internal Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
