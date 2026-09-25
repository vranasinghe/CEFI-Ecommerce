const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseKey = serviceKey || process.env.SUPABASE_ANON_KEY;

// RLS only allows the browser to READ the catalogue (fix_supabase_security.sql).
// Admin writes and image uploads therefore need the service-role key; on the
// anon key they are rejected by RLS.
if (supabaseUrl && !serviceKey && process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set — backend is using the anon key. ' +
    'Product/image writes will be rejected by Row Level Security.');
}

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-supabase-project.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client connected successfully.');
  } catch (err) {
    console.warn('⚠️ Could not connect to Supabase:', err.message);
  }
} else {
  console.log('ℹ️ Operating in fallback mode with local mock dataset.');
}

module.exports = supabase;
