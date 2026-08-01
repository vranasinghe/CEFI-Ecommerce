const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client connected successfully.');
  } catch (err) {
    console.warn('⚠️ Could not connect to Supabase:', err.message);
  }
} else {
  console.log('ℹ️ Operating in fallback mode with local mock dataset.');
}

module.exports = supabase;
