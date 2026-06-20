const { createClient } = require('@supabase/supabase-js');

const env = require('./env');

let supabaseAdmin = null;

const hasSupabaseConfig = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

const getSupabaseAdmin = () => {
  if (!hasSupabaseConfig) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.'
    );
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
};

module.exports = {
  hasSupabaseConfig,
  getSupabaseAdmin,
};
