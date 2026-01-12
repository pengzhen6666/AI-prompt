import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: async (url, options) => {
      const response = await fetch(url, options);
      if (response.status === 403) {
        console.warn("403 Forbidden detected, automatic logout triggered.");
        // Use setTimeout to avoid potential recursion or issues during the current fetch cycle
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 0);
      }
      return response;
    },
  },
});
