import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  triggered_by?: string
  trigger_context?: Record<string, unknown>
  recipient_name?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  let emailLogId: string | null = null

  try {
    // Parse email request
    const { to, subject, html, text, triggered_by, trigger_context, recipient_name }: EmailRequest = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create initial log entry
    const { data: logData, error: logError } = await supabaseAdmin
      .from('email_delivery_logs')
      .insert({
        recipient_email: to,
        recipient_name: recipient_name || null,
        subject: subject,
        status: 'pending',
        triggered_by: triggered_by || 'unknown',
        trigger_context: trigger_context || {}
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Failed to create email log:', logError)
    } else {
      emailLogId = logData?.id
      console.log(`Created email log: ${emailLogId}`)
    }

    // Get SMTP settings from database
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'email_notifications_enabled',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_from_email',
        'smtp_from_name',
        'smtp_encryption'
      ])

    if (settingsError) {
      console.error('Failed to fetch SMTP settings:', settingsError)
      await updateEmailLog(supabaseAdmin, emailLogId, 'failed', 'Failed to load email configuration')
      return new Response(
        JSON.stringify({ error: 'Failed to load email configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse settings into object
    const config: Record<string, string> = {}
    settings?.forEach(setting => {
      config[setting.setting_key] = setting.setting_value
    })

    // Check if email notifications are enabled
    if (config.email_notifications_enabled !== 'true') {
      console.log('Email notifications are disabled')
      await updateEmailLog(supabaseAdmin, emailLogId, 'skipped', 'Email notifications disabled')
      return new Response(
        JSON.stringify({ message: 'Email notifications are disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate required settings
    if (!config.smtp_host || !config.smtp_username || !config.smtp_password || !config.smtp_from_email) {
      console.error('Missing required SMTP configuration')
      await updateEmailLog(supabaseAdmin, emailLogId, 'failed', 'SMTP configuration incomplete')
      return new Response(
        JSON.stringify({ error: 'SMTP configuration incomplete. Please configure email settings in admin dashboard.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure and normalize SMTP connection
    let port = parseInt(config.smtp_port || '587')
    let encryption = (config.smtp_encryption || 'tls').toLowerCase()

    // Normalize invalid combinations
    if (encryption === 'ssl' && port !== 465) {
      console.warn(`SMTP config mismatch: encryption=ssl but port=${port}. Forcing port=465`)
      port = 465
    }
    if (encryption !== 'ssl' && ![25, 587, 2525].includes(port)) {
      console.warn(`Unsupported SMTP port ${port} for STARTTLS/plain. Falling back to 587`)
      port = 587
      encryption = 'tls'
    }

    const useSSL = port === 465
    console.log(`Sending email to ${to} | Subject: ${subject} | SMTP: ${config.smtp_host}:${port}`)
    
    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_host,
        port,
        tls: useSSL,
        auth: {
          username: config.smtp_username,
          password: config.smtp_password,
        },
      },
    })

    // Send email
    await client.send({
      from: `${config.smtp_from_name} <${config.smtp_from_email}>`,
      to: to,
      subject: subject,
      content: text || html,
      html: html,
    })

    await client.close()

    console.log(`Email sent successfully to ${to}`)
    await updateEmailLog(supabaseAdmin, emailLogId, 'sent', null)

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', logId: emailLogId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    const message = (error && (error as any).message) ? (error as any).message : 'Failed to send email'
    await updateEmailLog(supabaseAdmin, emailLogId, 'failed', message)
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function updateEmailLog(
  supabase: any,
  logId: string | null,
  status: string,
  errorMessage: string | null
) {
  if (!logId) return

  const updateData: Record<string, unknown> = { status }
  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString()
  }
  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  const { error } = await supabase
    .from('email_delivery_logs')
    .update(updateData)
    .eq('id', logId)

  if (error) {
    console.error('Failed to update email log:', error)
  }
}
