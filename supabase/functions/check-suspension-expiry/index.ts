import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for expired suspensions...");

    const now = new Date().toISOString();

    // Find all active suspensions that have expired
    const { data: expiredSuspensions, error: fetchError } = await supabase
      .from('suspensions')
      .select('id, user_id')
      .eq('status', 'active')
      .lt('suspension_end', now);

    if (fetchError) {
      console.error("Error fetching expired suspensions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSuspensions?.length || 0} expired suspensions`);

    if (expiredSuspensions && expiredSuspensions.length > 0) {
      // Update suspension records to completed
      const { error: updateSuspensionError } = await supabase
        .from('suspensions')
        .update({ status: 'completed' })
        .in('id', expiredSuspensions.map(s => s.id));

      if (updateSuspensionError) {
        console.error("Error updating suspensions:", updateSuspensionError);
        throw updateSuspensionError;
      }

      // Update profiles to remove suspension status
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          is_suspended: false,
          suspension_end_date: null
        })
        .in('id', expiredSuspensions.map(s => s.user_id));

      if (updateProfileError) {
        console.error("Error updating profiles:", updateProfileError);
        throw updateProfileError;
      }

      console.log(`Successfully completed ${expiredSuspensions.length} suspensions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiredSuspensions?.length || 0} expired suspensions`,
        count: expiredSuspensions?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-suspension-expiry:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
