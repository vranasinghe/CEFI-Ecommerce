const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(process.env.SUPABASE_URL, key);

async function check() {
  const { data, error } = await supabase.from('products').select('id, name, category_slug, slug').order('name');
  if (error) { console.log('Error:', error.message); return; }
  console.log(JSON.stringify(data.map(p => ({ id: p.id, name: p.name, cat: p.category_slug, slug: p.slug })), null, 2));
}
check();


