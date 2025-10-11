import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    console.log(`Starting monthly salary reset for ${currentYear}-${currentMonth}`);

    // Reset all salaries to base salary and clear deductions
    const { data: salaryRecords, error: fetchError } = await supabaseClient
      .from('salary_info')
      .select('id, user_id, base_salary');

    if (fetchError) {
      console.error('Error fetching salary records:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${salaryRecords.length} salary records to reset`);

    let resetCount = 0;

    for (const record of salaryRecords) {
      const { error: updateError } = await supabaseClient
        .from('salary_info')
        .update({
          current_salary: record.base_salary,
          total_deductions: 0,
        })
        .eq('id', record.id);

      if (updateError) {
        console.error(`Error resetting salary for user ${record.user_id}:`, updateError);
        continue;
      }

      resetCount++;
      console.log(`Reset salary for user ${record.user_id} to base salary: ₦${record.base_salary}`);
    }

    console.log(`Monthly salary reset complete. Reset ${resetCount} out of ${salaryRecords.length} records`);

    // Update last run time
    const now = new Date().toISOString();
    await supabaseClient
      .from('system_settings')
      .upsert({
        setting_key: 'monthly_reset_last_run',
        setting_value: now,
        description: 'Last time the monthly salary reset ran'
      }, {
        onConflict: 'setting_key'
      });

    return new Response(
      JSON.stringify({
        success: true,
        reset: resetCount,
        total: salaryRecords.length,
        message: `Successfully reset ${resetCount} employee salaries for the new month`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error resetting monthly salaries:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
