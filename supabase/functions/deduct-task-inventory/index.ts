import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const requestSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format')
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    const body = await req.json()
    
    // Validate input
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { taskId } = validation.data

    console.log(`User ${user.id} (${userRole.role}) processing inventory deduction for task:`, taskId)

    // Get task details
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.error('Task fetch error:', taskError?.message)
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check permissions: super_admin, project_manager, or assigned employee
    const isAdmin = userRole.role === 'super_admin' || userRole.role === 'project_manager'
    const isAssignedEmployee = task.assigned_to === user.id

    if (!isAdmin && !isAssignedEmployee) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - not assigned to this task' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if inventory already deducted
    if (task.inventory_deducted) {
      console.log('Inventory already deducted for this task')
      return new Response(
        JSON.stringify({ message: 'Inventory already deducted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only deduct if task is completed
    if (task.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Task must be completed to deduct inventory' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current inventory items
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .in('item_type', ['router', 'poe_adapter', 'pole', 'anchor'])

    if (inventoryError) {
      console.error('Inventory fetch error:', inventoryError?.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch inventory' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Current inventory:', inventory)

    // Deduct inventory items
    const deductions = []

    if (task.routers_used > 0) {
      const routerItem = inventory?.find(item => item.item_type === 'router')
      if (routerItem) {
        const newQuantity = Math.max(0, routerItem.quantity - task.routers_used)
        deductions.push({ id: routerItem.id, quantity: newQuantity, type: 'router', used: task.routers_used })
      }
    }

    if (task.poe_adapters_used > 0) {
      const poeItem = inventory?.find(item => item.item_type === 'poe_adapter')
      if (poeItem) {
        const newQuantity = Math.max(0, poeItem.quantity - task.poe_adapters_used)
        deductions.push({ id: poeItem.id, quantity: newQuantity, type: 'poe_adapter', used: task.poe_adapters_used })
      }
    }

    if (task.poles_used > 0) {
      const poleItem = inventory?.find(item => item.item_type === 'pole')
      if (poleItem) {
        const newQuantity = Math.max(0, poleItem.quantity - task.poles_used)
        deductions.push({ id: poleItem.id, quantity: newQuantity, type: 'pole', used: task.poles_used })
      }
    }

    if (task.anchors_used > 0) {
      const anchorItem = inventory?.find(item => item.item_type === 'anchor')
      if (anchorItem) {
        const newQuantity = Math.max(0, anchorItem.quantity - task.anchors_used)
        deductions.push({ id: anchorItem.id, quantity: newQuantity, type: 'anchor', used: task.anchors_used })
      }
    }

    console.log('Planned deductions:', deductions)

    // Update inventory quantities
    for (const deduction of deductions) {
      const { error: updateError } = await supabaseAdmin
        .from('inventory_items')
        .update({ quantity: deduction.quantity })
        .eq('id', deduction.id)

      if (updateError) {
        console.error(`Failed to update ${deduction.type}:`, updateError?.message)
      } else {
        console.log(`Updated ${deduction.type}: ${deduction.used} items deducted`)
      }
    }

    // Mark task inventory as deducted
    const { error: markError } = await supabaseAdmin
      .from('tasks')
      .update({ inventory_deducted: true })
      .eq('id', taskId)

    if (markError) {
      console.error('Failed to mark inventory as deducted:', markError?.message)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory deducted successfully',
        deductions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing inventory deduction:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process inventory deduction' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
