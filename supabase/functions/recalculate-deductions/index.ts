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

    console.log('Starting recalculation of all historical deductions...');

    // Get the current deduction percentage setting
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'absence_deduction_percentage')
      .single();

    if (settingsError) {
      console.error('Error fetching deduction percentage:', settingsError);
      throw settingsError;
    }

    const deductionPercentage = Number(settings?.setting_value ?? '100');
    console.log(`Using deduction percentage: ${deductionPercentage}%`);

    // Get all attendance records with deductions
    const { data: attendanceRecords, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select('id, user_id, deduction_amount')
      .gt('deduction_amount', 0);

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      throw attendanceError;
    }

    console.log(`Found ${attendanceRecords?.length || 0} attendance records with deductions`);

    // First, reset all salary totals
    const { data: allSalaries, error: salariesError } = await supabaseClient
      .from('salary_info')
      .select('id, user_id, base_salary');

    if (salariesError) {
      console.error('Error fetching salary records:', salariesError);
      throw salariesError;
    }

    // Reset all to base salary
    for (const salary of allSalaries || []) {
      await supabaseClient
        .from('salary_info')
        .update({
          total_deductions: 0,
          current_salary: salary.base_salary,
        })
        .eq('id', salary.id);
    }

    console.log('Reset all salary deductions to zero');

    let updatedCount = 0;
    const userDeductions = new Map<string, number>();

    // Recalculate each attendance deduction
    for (const attendance of attendanceRecords || []) {
      // Get employee's salary info
      const { data: salaryInfo, error: salaryError } = await supabaseClient
        .from('salary_info')
        .select('*')
        .eq('user_id', attendance.user_id)
        .single();

      if (salaryError || !salaryInfo) {
        console.error(`Error fetching salary for user ${attendance.user_id}:`, salaryError);
        continue;
      }

      const baseSalary = Number(salaryInfo.base_salary);
      
      // Calculate new deduction as percentage of base salary
      const newDeductionAmount = Number(((baseSalary * deductionPercentage) / 100).toFixed(2));

      // Update attendance record with new deduction
      const { error: updateAttendanceError } = await supabaseClient
        .from('attendance')
        .update({
          deduction_amount: newDeductionAmount,
        })
        .eq('id', attendance.id);

      if (updateAttendanceError) {
        console.error(`Error updating attendance ${attendance.id}:`, updateAttendanceError);
        continue;
      }

      // Accumulate deductions per user
      const currentTotal = userDeductions.get(attendance.user_id) || 0;
      userDeductions.set(attendance.user_id, currentTotal + newDeductionAmount);

      updatedCount++;
    }

    console.log(`Updated ${updatedCount} attendance records`);

    // Update salary_info with accumulated deductions
    let salaryUpdatedCount = 0;
    for (const [userId, totalDeduction] of userDeductions.entries()) {
      const { data: salaryInfo, error: salaryError } = await supabaseClient
        .from('salary_info')
        .select('base_salary')
        .eq('user_id', userId)
        .single();

      if (salaryError || !salaryInfo) {
        console.error(`Error fetching salary for user ${userId}:`, salaryError);
        continue;
      }

      const baseSalary = Number(salaryInfo.base_salary);
      let newCurrentSalary = Number((baseSalary - totalDeduction).toFixed(2));
      if (newCurrentSalary < 0) newCurrentSalary = 0;

      const { error: updateError } = await supabaseClient
        .from('salary_info')
        .update({
          total_deductions: totalDeduction,
          current_salary: newCurrentSalary,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error(`Error updating salary for user ${userId}:`, updateError);
        continue;
      }

      salaryUpdatedCount++;
      console.log(`Updated salary for user ${userId}: ₦${totalDeduction} total deductions, ₦${newCurrentSalary} current salary`);
    }

    console.log(`Recalculation complete. Updated ${updatedCount} attendance records and ${salaryUpdatedCount} salary records`);

    return new Response(
      JSON.stringify({
        success: true,
        attendanceUpdated: updatedCount,
        salariesUpdated: salaryUpdatedCount,
        message: `Successfully recalculated ${updatedCount} deductions across ${salaryUpdatedCount} employees`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error recalculating deductions:', error);
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
