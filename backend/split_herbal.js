const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function splitHerbal() {
  // 1. Update Supabase
  if (supabaseUrl && supabaseKey) {
    console.log("Updating Supabase...");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Update existing Herbal to Herbal Leaves
    let { data, error } = await supabase
      .from('categories')
      .update({ name: 'Herbal Leaves', slug: 'herbal-leaves' })
      .eq('slug', 'herbal')
      .select();
      
    if (error) console.error("Error updating Herbal:", error.message);
    else console.log("Updated Herbal to Herbal Leaves in Supabase");
    
    // Check if Herbal Flowers exists
    const { data: flowerCheck } = await supabase.from('categories').select('*').eq('slug', 'herbal-flowers').single();
    if (!flowerCheck) {
      const { error: insertError } = await supabase
        .from('categories')
        .insert([{ 
          name: 'Herbal Flowers', 
          slug: 'herbal-flowers',
          image_url: '/icon-truck.png' // Use same icon for now, actually /images/cat-herbal.png
        }]);
      if (insertError) console.error("Error inserting Herbal Flowers:", insertError.message);
      else console.log("Inserted Herbal Flowers into Supabase");
    } else {
      console.log("Herbal Flowers already exists in Supabase");
    }
    
    // Update products that had category_slug 'herbal' (denormalized data?)
    await supabase.from('products').update({ category_slug: 'herbal-leaves', category_name: 'Herbal Leaves' }).eq('category_slug', 'herbal');
  }

  // 2. Update localDB.json
  const localDbPath = path.join(__dirname, 'localDB.json');
  if (fs.existsSync(localDbPath)) {
    console.log("Updating localDB.json...");
    let db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    
    // Replace herbal category
    let herbalIdx = db.categories.findIndex(c => c.slug === 'herbal');
    if (herbalIdx !== -1) {
      db.categories[herbalIdx].name = 'Herbal Leaves';
      db.categories[herbalIdx].slug = 'herbal-leaves';
      
      db.categories.splice(herbalIdx + 1, 0, {
        id: "cat-1b",
        name: "Herbal Flowers",
        slug: "herbal-flowers",
        description: "Dried herbal flowers used for infusions and natural remedies.",
        image_url: "/images/cat-herbal.png",
        itemCount: 0
      });
    }
    
    // Update products
    db.products.forEach(p => {
      if (p.category_slug === 'herbal') {
        p.category_slug = 'herbal-leaves';
        p.category_name = 'Herbal Leaves';
      }
    });
    
    fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2));
  }

  // 3. Update mockData.js
  const mockPath = path.join(__dirname, 'mockData.js');
  if (fs.existsSync(mockPath)) {
    console.log("Updating mockData.js...");
    let content = fs.readFileSync(mockPath, 'utf8');
    
    content = content.replace(
      /slug:\s*"herbal"/g,
      'slug: "herbal-leaves"'
    );
    content = content.replace(
      /name:\s*"Herbal"/g,
      'name: "Herbal Leaves"'
    );
    content = content.replace(
      /category_slug:\s*"herbal"/g,
      'category_slug: "herbal-leaves"'
    );
    content = content.replace(
      /category_name:\s*"Herbal"/g,
      'category_name: "Herbal Leaves"'
    );

    // We also need to add Herbal Flowers category.
    if (!content.includes('slug: "herbal-flowers"')) {
      content = content.replace(
        /(slug:\s*"herbal-leaves".*?\n.*?},)/s,
        `$1\n  {\n    id: "cat-1b",\n    name: "Herbal Flowers",\n    slug: "herbal-flowers",\n    description: "Dried herbal flowers used for infusions and natural remedies.",\n    image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",\n    itemCount: 0\n  },`
      );
    }
    
    fs.writeFileSync(mockPath, content);
  }

  // Update update_categories.js
  const updPath = path.join(__dirname, 'update_categories.js');
  if (fs.existsSync(updPath)) {
      let updContent = fs.readFileSync(updPath, 'utf8');
      updContent = updContent.replace(/slug:\s*'herbal'/, "slug: 'herbal-leaves'");
      fs.writeFileSync(updPath, updContent);
  }

  console.log("Done!");
}

splitHerbal();
