const fs = require('fs');
require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');

async function updateFlowerImage() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  await supabase.from('categories').update({ image_url: '/images/cat-herbal-flowers.png' }).eq('slug', 'herbal-flowers');
  
  let mockPath = 'backend/mockData.js';
  let mockContent = fs.readFileSync(mockPath, 'utf8');
  mockContent = mockContent.replace(/slug:\s*"herbal-flowers",\s*description:\s*"Dried herbal flowers used for infusions and natural remedies.",\s*image_url:\s*"[^"]+"/, 'slug: "herbal-flowers",\n    description: "Dried herbal flowers used for infusions and natural remedies.",\n    image_url: "/images/cat-herbal-flowers.png"');
  fs.writeFileSync(mockPath, mockContent);

  let dbPath = 'backend/localDB.json';
  let dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let flowerCat = dbContent.categories.find(c => c.slug === 'herbal-flowers');
  if (flowerCat) {
    flowerCat.image_url = '/images/cat-herbal-flowers.png';
    fs.writeFileSync(dbPath, JSON.stringify(dbContent, null, 2));
  }
}
updateFlowerImage().then(() => console.log('Updated db and files'));
