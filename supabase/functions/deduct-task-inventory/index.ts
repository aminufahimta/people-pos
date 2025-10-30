import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { taskId } = await req.json()

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing inventory deduction for task:', taskId)

    // Get task details
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.error('Task fetch error:', taskError)
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.error('Inventory fetch error:', inventoryError)
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
        console.error(`Failed to update ${deduction.type}:`, updateError)
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
      console.error('Failed to mark inventory as deducted:', markError)
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
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
