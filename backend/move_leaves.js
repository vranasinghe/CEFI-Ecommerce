const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// These 3 leaf products need to move from "fruits" to "herbal-leaves"
const leafSlugs = [
  'premium-dried-guava-psidium-guajava-leaves',
  'premium-dried-soursop-annona-muricata-leaves',
  'premium-dried-jackfruit-artocarpus-heterophyllus-leaves',
];

async function moveLeaves() {
  for (const slug of leafSlugs) {
    const { data, error } = await supabase
      .from('products')
      .update({ category_slug: 'herbal-leaves', category_name: 'Herbal Leaves' })
      .eq('slug', slug)
      .select('name');

    if (error) {
      console.log(`ERROR: ${slug} -> ${error.message}`);
    } else {
      console.log(`MOVED: "${data[0]?.name}" -> Herbal Leaves`);
    }
  }
  console.log('\nDone!');
}

moveLeaves();
