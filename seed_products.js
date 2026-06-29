const { db } = require('./backend/firestore');

const TZS_TO_ZMW_RATE = 145; // 1 ZMW = 145 TZS

const seedProducts = [
  // --- Electronics ---
  {
    title: 'Samsung 55" 4K Smart TV',
    category: 'Electronics',
    sub_category: 'Televisions',
    price_tzs: 1450000,
    weight_kg: 15.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Electronics Hub'
  },
  {
    title: 'Hisense 100L Chest Freezer',
    category: 'Home Appliances',
    sub_category: 'Refrigerators & Freezers',
    price_tzs: 435000,
    weight_kg: 25.0,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Appliances'
  },
  {
    title: 'iPhone 13 Pro Max - 256GB',
    category: 'Electronics',
    sub_category: 'Mobile Phones',
    price_tzs: 2900000,
    weight_kg: 0.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Mobile'
  },
  {
    title: 'MacBook Air M1 2020',
    category: 'Electronics',
    sub_category: 'Laptops',
    price_tzs: 2500000,
    weight_kg: 1.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Computers'
  },
  {
    title: 'JBL Flip 5 Portable Speaker',
    category: 'Electronics',
    sub_category: 'Audio',
    price_tzs: 290000,
    weight_kg: 0.8,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Audio'
  },
  {
    title: 'Sony PlayStation 5 Console',
    category: 'Electronics',
    sub_category: 'Gaming',
    price_tzs: 1800000,
    weight_kg: 4.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Gaming'
  },
  {
    title: 'Canon EOS Rebel T7 DSLR Camera',
    category: 'Electronics',
    sub_category: 'Cameras',
    price_tzs: 1160000,
    weight_kg: 1.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Camera'
  },
  {
    title: 'Dell XPS 13 Laptop',
    category: 'Electronics',
    sub_category: 'Laptops',
    price_tzs: 3190000,
    weight_kg: 1.3,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Computers'
  },
  // --- Home Appliances ---
  {
    title: 'LG 9kg Front Load Washing Machine',
    category: 'Home Appliances',
    sub_category: 'Washing Machines',
    price_tzs: 1450000,
    weight_kg: 60.0,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Appliances'
  },
  {
    title: 'Philips Air Fryer XL',
    category: 'Home Appliances',
    sub_category: 'Kitchen Appliances',
    price_tzs: 450000,
    weight_kg: 5.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Kitchen'
  },
  {
    title: 'NutriBullet Pro Blender',
    category: 'Home Appliances',
    sub_category: 'Kitchen Appliances',
    price_tzs: 250000,
    weight_kg: 3.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Kitchen'
  },
  {
    title: 'Dyson V11 Cordless Vacuum',
    category: 'Home Appliances',
    sub_category: 'Cleaning',
    price_tzs: 1800000,
    weight_kg: 3.0,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Appliances'
  },
  {
    title: 'Nespresso Essenza Mini',
    category: 'Home Appliances',
    sub_category: 'Coffee Makers',
    price_tzs: 362500,
    weight_kg: 2.3,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Kitchen'
  },
  {
    title: 'Black & Decker Iron',
    category: 'Home Appliances',
    sub_category: 'Garment Care',
    price_tzs: 85000,
    weight_kg: 1.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1544002660-f655dc422d3d?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Appliances'
  },
  {
    title: 'Panasonic Inverter Microwave',
    category: 'Home Appliances',
    sub_category: 'Microwaves',
    price_tzs: 435000,
    weight_kg: 12.0,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Kitchen'
  },
  {
    title: 'Midea Water Dispenser',
    category: 'Home Appliances',
    sub_category: 'Water Dispensers',
    price_tzs: 290000,
    weight_kg: 15.0,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1622473590773-f588134b6ce7?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Appliances'
  },
  // --- Fashion ---
  {
    title: 'Men\'s Leather Oxford Shoes',
    category: 'Fashion',
    sub_category: 'Men\'s Shoes',
    price_tzs: 145000,
    weight_kg: 1.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1614252339460-e1763595f96e?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Men'
  },
  {
    title: 'Women\'s Ankara Print Dress',
    category: 'Fashion',
    sub_category: 'Women\'s Clothing',
    price_tzs: 87000,
    weight_kg: 0.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1515347619152-16b735231792?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Women'
  },
  {
    title: 'Nike Air Max Sneakers',
    category: 'Fashion',
    sub_category: 'Men\'s Shoes',
    price_tzs: 290000,
    weight_kg: 0.9,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Shoes'
  },
  {
    title: 'Classic Aviator Sunglasses',
    category: 'Fashion',
    sub_category: 'Accessories',
    price_tzs: 43500,
    weight_kg: 0.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Accessories'
  },
  {
    title: 'Genuine Leather Handbag',
    category: 'Fashion',
    sub_category: 'Bags & Purses',
    price_tzs: 174000,
    weight_kg: 0.8,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Accessories'
  },
  {
    title: 'Men\'s Chronograph Watch',
    category: 'Fashion',
    sub_category: 'Watches',
    price_tzs: 217500,
    weight_kg: 0.3,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Watches'
  },
  {
    title: 'Unisex Denim Jacket',
    category: 'Fashion',
    sub_category: 'Men\'s Clothing',
    price_tzs: 116000,
    weight_kg: 0.7,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Apparel'
  },
  {
    title: 'Cotton T-Shirt 3-Pack',
    category: 'Fashion',
    sub_category: 'Men\'s Clothing',
    price_tzs: 58000,
    weight_kg: 0.6,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Apparel'
  },
  // --- Beauty & Health ---
  {
    title: 'Shea Butter Body Lotion 500ml',
    category: 'Beauty',
    sub_category: 'Body Care',
    price_tzs: 29000,
    weight_kg: 0.6,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Beauty'
  },
  {
    title: 'MAC Ruby Woo Lipstick',
    category: 'Beauty',
    sub_category: 'Makeup',
    price_tzs: 58000,
    weight_kg: 0.1,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Cosmetics'
  },
  {
    title: 'Chanel No.5 Perfume 100ml',
    category: 'Beauty',
    sub_category: 'Fragrances',
    price_tzs: 435000,
    weight_kg: 0.4,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1594035910387-fea477274976?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Fragrance'
  },
  {
    title: 'Vitamin C Face Serum',
    category: 'Beauty',
    sub_category: 'Skincare',
    price_tzs: 43500,
    weight_kg: 0.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Skincare'
  },
  {
    title: 'Braun Electric Shaver',
    category: 'Beauty',
    sub_category: 'Men\'s Grooming',
    price_tzs: 174000,
    weight_kg: 0.5,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1593998066526-65fcab3021a2?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Grooming'
  },
  {
    title: 'Organic Argan Oil 100ml',
    category: 'Beauty',
    sub_category: 'Hair Care',
    price_tzs: 36250,
    weight_kg: 0.2,
    origin_city: 'Dar es Salaam',
    origin_country: 'Tanzania',
    image_urls: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80'],
    supplier_name: 'DarShopping Skincare'
  }
];

async function run() {
  console.log('Starting product database update for subcategories...');

  try {
    // 1. Delete all existing products to cleanly re-seed with subcategories
    const snapshot = await db.collection('products').get();
    let deleteCount = 0;
    
    for (const doc of snapshot.docs) {
      await db.collection('products').doc(doc.id).delete();
      deleteCount++;
    }
    console.log(`Deleted ${deleteCount} existing products.`);

    // 2. Insert 30 new products with subcategories
    let insertCount = 0;
    for (const product of seedProducts) {
      const newProduct = {
        title: product.title,
        description: 'Premium quality product sourced directly from Dar Shopping vendors in Tanzania.',
        category: product.category,
        sub_category: product.sub_category,
        price_tzs: product.price_tzs,
        price_zmw: Math.round(product.price_tzs / TZS_TO_ZMW_RATE),
        weight_kg: product.weight_kg,
        origin_city: product.origin_city,
        origin_country: product.origin_country,
        image_urls: product.image_urls,
        supplier_name: product.supplier_name,
        supplier_id: 'darshopping_v1',
        created_at: new Date().toISOString()
      };
      
      await db.collection('products').add(newProduct);
      insertCount++;
    }
    
    console.log(`Successfully seeded ${insertCount} products with subcategories!`);
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

run();
