import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function will be triggered by a cron job.
serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 2. Get Resend API key from secrets.
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set in project secrets.");
    }

    // 3. Create a Supabase client with service_role permissions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Find all follow-up records scheduled for today
    const today = new Date().toISOString().split('T')[0];
    const { data: scheduledFollowUps, error: followUpsError } = await supabaseAdmin
      .from('follow_ups')
      .select(`
        id,
        client_id,
        user_id,
        clients ( * ),
        profiles ( id, full_name )
      `)
      .eq('next_follow_up_date', today);

    if (followUpsError) throw followUpsError;

    if (!scheduledFollowUps || scheduledFollowUps.length === 0) {
      return new Response(JSON.stringify({ message: "No follow-ups to send today." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let emailsSent = 0;

    // 5. Process each scheduled follow-up
    for (const followUp of scheduledFollowUps) {
      const client = followUp.clients;
      if (!client || !client.email) {
        console.warn(`Skipping follow-up ${followUp.id}: client data or email is missing.`);
        continue;
      }

      // Fetch the user's email template
      const { data: template, error: templateError } = await supabaseAdmin
        .from('message_templates')
        .select('*, attachments:template_attachments(*)')
        .eq('user_id', followUp.user_id)
        .eq('type', 'email')
        .single();

      if (templateError || !template) {
        console.warn(`No email template found for user ${followUp.user_id}. Skipping.`);
        continue;
      }

      // Personalize the email content
      const subject = template.subject?.replace(/{company_name}/g, client.company_name).replace(/{contact_person}/g, client.contact_person || '') || `متابعة بخصوص ${client.company_name}`;
      const body = template.body?.replace(/{company_name}/g, client.company_name).replace(/{contact_person}/g, client.contact_person || '') || `هذه رسالة متابعة بخصوص محادثتنا السابقة.`;
      
      // 6. Send the email using Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Smart Fuel CRM <onboarding@resend.dev>', // IMPORTANT: You must verify a domain in Resend to use your own address.
          to: [client.email],
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
          cc: template.cc ? [template.cc] : undefined,
          attachments: template.attachments?.map((att: any) => ({
            filename: att.file_name,
            path: att.file_url,
          }))
        }),
      });

      if (!resendResponse.ok) {
        const errorBody = await resendResponse.json();
        console.error(`Failed to send email for follow-up ${followUp.id}:`, errorBody);
        continue; // Skip to the next follow-up
      }
      
      emailsSent++;

      // 7. Log this action as a new follow-up and clear the scheduled date
      await supabaseAdmin.rpc('add_follow_up_and_update_client', {
        p_client_id: client.id,
        p_user_id: followUp.user_id,
        p_feedback: `تم إرسال بريد إلكتروني تلقائي للمتابعة.`,
        p_status: client.status, // Keep the current status
        p_next_follow_up_date: null
      });

      // Also clear the date on the original follow-up record to be safe
      await supabaseAdmin
        .from('follow_ups')
        .update({ next_follow_up_date: null })
        .eq('id', followUp.id);
    }

    return new Response(JSON.stringify({ message: `Successfully sent ${emailsSent} of ${scheduledFollowUps.length} scheduled follow-ups.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});