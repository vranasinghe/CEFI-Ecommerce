import { createClient } from '@supabase/supabase-js';

// These are the public (anon) credentials – safe to expose in the browser
const supabaseUrl = 'https://kyrvbjglnsddfejsttum.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5cnZiamdsbnNkZGZlanN0dHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NTIyMDIsImV4cCI6MjEwMTIyODIwMn0.1PzpiJYLEysCwh4R29Ep_YzM9n2EcfdGKHDeEvH_l8Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
