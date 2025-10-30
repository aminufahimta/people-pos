import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
  full_name: z.string().trim().min(1, 'Full name required').max(100, 'Name too long'),
  role: z.enum(['super_admin', 'hr_manager', 'project_manager', 'employee']).optional(),
  department: z.string().max(100, 'Department name too long').optional(),
  position: z.string().max(100, 'Position name too long').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  base_salary: z.number().positive('Salary must be positive').optional(),
  daily_rate: z.number().positive('Daily rate must be positive').optional()
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

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get the requesting user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has super_admin or hr_manager role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'hr_manager'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Only super admins and HR managers can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get and validate user data from request
    const body = await req.json()
    const validation = createUserSchema.safeParse(body)
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, full_name, role, department, position, phone, base_salary, daily_rate } = validation.data

    // Validate role permissions
    if (roleData.role === 'hr_manager' && role && role !== 'employee') {
      return new Response(
        JSON.stringify({ error: 'HR managers can only create employee accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (createError || !newUser.user) {
      console.error('User creation error:', createError?.message)
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile with additional fields
    if (department || position || phone) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          department: department || null,
          position: position || null,
          phone: phone || null,
        })
        .eq('id', newUser.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
      }
    }

    // Auto-approve accounts created by super admins
    if (roleData.role === 'super_admin') {
      const { error: approveError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', newUser.user.id)

      if (approveError) {
        console.error('Auto-approve error:', approveError)
      }
    }

    // Set user role
    if (role && role !== 'employee') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUser.user.id)

      if (roleError) {
        console.error('Role update error:', roleError)
      }
    }

    // Create salary info if provided
    if (base_salary && daily_rate) {
      const { error: salaryError } = await supabaseAdmin
        .from('salary_info')
        .insert({
          user_id: newUser.user.id,
          base_salary,
          daily_rate,
          current_salary: base_salary,
        })

      if (salaryError) {
        console.error('Salary creation error:', salaryError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
