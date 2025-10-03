import { supabase } from "@/integrations/supabase/client";

export const bootstrapSuperAdmin = async (email: string, password: string, fullName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
      body: {
        email,
        password,
        full_name: fullName,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create admin account' };
  }
};
