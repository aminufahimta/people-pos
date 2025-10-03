import { supabase } from "@/integrations/supabase/client";

export const updateAuthEmail = async (userId: string, newEmail: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('update-auth-email', {
      body: {
        userId,
        newEmail,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update auth email' };
  }
};
