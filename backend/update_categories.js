require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCategories() {
  const updates = [
    { slug: 'herbal', image_url: '/images/cat-herbal.png' },
    { slug: 'tea', image_url: '/images/cat-tea.png' },
    { slug: 'spices', image_url: '/images/cat-spices.png' },
    { slug: 'vegetables', image_url: '/images/cat-vegetables.png' },
    { slug: 'fruits', image_url: '/images/cat-fruits.png' }
  ];

  for (const update of updates) {
    const { data, error } = await supabase
      .from('categories')
      .update({ image_url: update.image_url })
      .eq('slug', update.slug);
      
    if (error) {
      console.error(`Error updating ${update.slug}:`, error.message);
    } else {
      console.log(`Successfully updated ${update.slug}`);
    }
  }
  
  console.log("Done!");
}

updateCategories();
