const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixCategories() {
  // Fetch all products with mismatched category_name vs category_slug
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category_slug, category_name');
  
  if (error) { console.log('Error fetching:', error.message); return; }

  // Define the correct name for each slug
  const slugToName = {
    'fruits': 'Fruits',
    'herbal-leaves': 'Herbal Leaves',
    'herbal-flowers': 'Herbal Flowers',
    'tea': 'Tea',
    'spices': 'Spices',
    'vegetables': 'Vegetables & Fruits'
  };

  let fixCount = 0;
  for (const product of data) {
    const expectedName = slugToName[product.category_slug];
    if (expectedName && product.category_name !== expectedName) {
      console.log(`MISMATCH: "${product.name}" has category_name="${product.category_name}" but should be "${expectedName}"`);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ category_name: expectedName })
        .eq('id', product.id);
      
      if (updateError) {
        console.log(`  ERROR fixing: ${updateError.message}`);
      } else {
        console.log(`  FIXED!`);
        fixCount++;
      }
    }
  }
  
  if (fixCount === 0) {
    console.log('No mismatches found - all category names are correct!');
  } else {
    console.log(`\nFixed ${fixCount} products!`);
  }
}

fixCategories();
