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

    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing attendance for date: ${today}`);

    // Get settings: deduction percentage and working days per month
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['absence_deduction_percentage', 'working_days_per_month']);

    if (settingsError) {
      console.error('Error fetching system settings:', settingsError);
      throw settingsError;
    }

    const deductionPercentage = Number(
      settings?.find((s: any) => s.setting_key === 'absence_deduction_percentage')?.setting_value ?? '100'
    );
    const workingDays = Number(
      settings?.find((s: any) => s.setting_key === 'working_days_per_month')?.setting_value ?? '22'
    );
    console.log(`Using deduction percentage: ${deductionPercentage}% | working days: ${workingDays}`);

    // Get all employees
    const { data: employees, error: employeesError } = await supabaseClient
      .from('profiles')
      .select('id');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    console.log(`Found ${employees.length} employees to process`);

    let processedCount = 0;
    let absentCount = 0;

    for (const employee of employees) {
      // Check if employee has attendance record for today
      const { data: attendance, error: attendanceError } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('user_id', employee.id)
        .eq('date', today)
        .maybeSingle();

      if (attendanceError) {
        console.error(`Error checking attendance for user ${employee.id}:`, attendanceError);
        continue;
      }

      // If no attendance record or marked as absent, apply deduction
      if (!attendance || attendance.status === 'absent') {
        // Get employee's salary info
        const { data: salaryInfo, error: salaryError } = await supabaseClient
          .from('salary_info')
          .select('*')
          .eq('user_id', employee.id)
          .single();

        if (salaryError || !salaryInfo) {
          console.error(`Error fetching salary for user ${employee.id}:`, salaryError);
          continue;
        }

        let dailyRate = Number(salaryInfo.daily_rate);
        const baseSalary = Number(salaryInfo.base_salary);

        if (!dailyRate || dailyRate <= 0) {
          dailyRate = workingDays > 0 ? Number((baseSalary / workingDays).toFixed(2)) : 0;
          console.log(`Daily rate missing for ${employee.id}. Recalculated as ₦${dailyRate} using workingDays=${workingDays}`);
          // Persist recalculated daily rate for future runs
          const { error: dailyRateUpdateError } = await supabaseClient
            .from('salary_info')
            .update({ daily_rate: dailyRate })
            .eq('user_id', employee.id);
          if (dailyRateUpdateError) {
            console.warn(`Failed to persist recalculated daily rate for ${employee.id}:`, dailyRateUpdateError);
          }
        }

        const deductionAmount = Number(((dailyRate * deductionPercentage) / 100).toFixed(2));
        const newTotalDeductions = Number((Number(salaryInfo.total_deductions) + deductionAmount).toFixed(2));
        let newCurrentSalary = Number((baseSalary - newTotalDeductions).toFixed(2));
        if (newCurrentSalary < 0) newCurrentSalary = 0;

        // Update salary with deduction
        const { error: updateError } = await supabaseClient
          .from('salary_info')
          .update({
            total_deductions: newTotalDeductions,
            current_salary: newCurrentSalary,
          })
          .eq('user_id', employee.id);

        if (updateError) {
          console.error(`Error updating salary for user ${employee.id}:`, updateError);
          continue;
        }

        // Create or update attendance record
        if (!attendance) {
          const { error: insertError } = await supabaseClient
            .from('attendance')
            .insert({
              user_id: employee.id,
              date: today,
              status: 'absent',
              deduction_amount: deductionAmount,
            });

          if (insertError) {
            console.error(`Error creating attendance record for user ${employee.id}:`, insertError);
            continue;
          }
        } else {
          const { error: updateAttendanceError } = await supabaseClient
            .from('attendance')
            .update({
              deduction_amount: deductionAmount,
            })
            .eq('id', attendance.id);

          if (updateAttendanceError) {
            console.error(`Error updating attendance for user ${employee.id}:`, updateAttendanceError);
            continue;
          }
        }

        absentCount++;
        console.log(`Applied deduction of ₦${deductionAmount} (${deductionPercentage}% of ₦${dailyRate}) for absent employee ${employee.id}`);
      }

      processedCount++;
    }

    console.log(`Processing complete. Processed: ${processedCount}, Absent: ${absentCount}`);

    // Update last run time
    const now = new Date().toISOString();
    await supabaseClient
      .from('system_settings')
      .upsert({
        setting_key: 'cron_last_run',
        setting_value: now,
        description: 'Last time the daily attendance cron job ran'
      }, {
        onConflict: 'setting_key'
      });

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        absent: absentCount,
        message: `Successfully processed ${processedCount} employees, ${absentCount} marked absent with deductions`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing daily attendance:', error);
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
