import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const bootstrapSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  full_name: z.string().trim().max(100, 'Name too long').optional()
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Check if any users exist
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('Error checking existing users:', checkError)
    }

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Admin account already exists. Bootstrap is only allowed for first setup.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get and validate credentials from request
    const body = await req.json()
    const validation = bootstrapSchema.safeParse(body)
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, full_name } = validation.data

    // Create the super admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || 'Super Admin'
      }
    })

    if (createError || !newUser.user) {
      console.error('Admin creation error:', createError?.message)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set role to super_admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'super_admin' })
      .eq('user_id', newUser.user.id)

    if (roleError) {
      console.error('Role update error:', roleError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Super admin account created successfully',
        user_id: newUser.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error bootstrapping admin:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to bootstrap admin account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
