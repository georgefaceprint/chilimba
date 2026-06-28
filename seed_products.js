require('dotenv').config();
const { db } = require('./backend/firestore');

const PRODUCT_DATA = [
  // COSMETICS
  { title: "Nida Danish Beauty Lotion", description: "Premium moisturizing beauty lotion from Dar es Salaam.", category: "Cosmetics", price: 15000, img: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=500&q=80" },
  { title: "Cosmo Curl Activator Cream", description: "Soft & Shine moisturizing curl activator.", category: "Cosmetics", price: 22000, img: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80" },
  { title: "Natural Skin Serum", description: "Organic skin serum wholesale pack.", category: "Cosmetics", price: 45000, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80" },
  
  // CLOTHES
  { title: "Authentic Kitenge Fabric Bundle", description: "10 yards of high quality colorful Kitenge fabric.", category: "Clothes", price: 65000, img: "/assets/img/kitenge.png" },
  { title: "Zambian Traditional Khanga", description: "Beautifully printed traditional Khanga wrapper.", category: "Clothes", price: 350, isLocal: true, img: "/assets/img/kitenge.png" },
  { title: "Wholesale Men's Safari Shirt", description: "Cotton safari shirts for retail.", category: "Clothes", price: 25000, img: "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=500&q=80" },

  // SHOES
  { title: "Classic Leather Sandals", description: "Handmade Maasai style leather sandals.", category: "Shoes", price: 18000, img: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80" },
  { title: "Canvas Sneakers Bulk", description: "Imported canvas shoes, carton of 12.", category: "Shoes", price: 150000, img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80" },

  // HANDBAGS
  { title: "Handwoven Basket Bag", description: "Traditional woven bag from local artisans.", category: "Handbags", price: 12000, img: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80" },
  { title: "Luxury Leather Tote", description: "Imported premium leather tote bag.", category: "Handbags", price: 85000, img: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80" },

  // CEREALS
  { title: "Wholesale Maize Sacks", description: "50kg sack of premium white maize.", category: "Cereals", price: 450, isLocal: true, img: "https://images.unsplash.com/photo-1574316071802-0d684efa7ab5?w=500&q=80" },
  { title: "Tanzanian Premium Rice", description: "100kg bag of aromatic Mbeya rice.", category: "Cereals", price: 120000, img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80" },

  // COOKING UTENSILS
  { title: "Stainless Steel Pot Set", description: "Heavy duty 5-piece stainless steel pots.", category: "Cooking Utensils", price: 95000, img: "/assets/img/pots.png" },
  { title: "Cast Iron Skillet Bulk", description: "Durable cast iron frying pans.", category: "Cooking Utensils", price: 45000, img: "https://images.unsplash.com/photo-1585659722983-3a6750f2fd8d?w=500&q=80" },
  { title: "Ceramic Dining Plates", description: "Carton of 24 beautiful ceramic plates.", category: "Cooking Utensils", price: 1500, isLocal: true, img: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80" },

  // HOME APPLIANCES
  { title: "Electric Blender Multi-pack", description: "Carton of 4 high-speed blenders.", category: "Home Appliances", price: 200000, img: "https://images.unsplash.com/photo-1584269600519-112d00c94b29?w=500&q=80" },
  { title: "Modern Microwave Oven", description: "Imported 20L microwave oven.", category: "Home Appliances", price: 180000, img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80" }
];

async function seedAccurateData() {
  console.log("Clearing old random mock products...");
  const snapshot = await db.collection('products').get();
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  
  console.log(`Deleted ${snapshot.docs.length} old products.`);

  console.log("Seeding perfectly matched accurate products...");
  
  const insertBatch = db.batch();
  for (let i = 0; i < PRODUCT_DATA.length; i++) {
    const p = PRODUCT_DATA[i];
    const isLocal = p.isLocal || false;
    
    // Auto convert TZS to ZMW
    let price_tzs = isLocal ? 0 : p.price;
    let price_zmw = isLocal ? p.price : (p.price / 100); 

    const docRef = db.collection('products').doc();
    insertBatch.set(docRef, {
      title: p.title,
      description: p.description,
      supplier_id: "seed_vendor_1",
      supplier_name: isLocal ? "Zambia Wholesale Hub" : "Dar es Salaam Wholesale",
      origin_country: isLocal ? "Zambia" : "Tanzania",
      origin_city: isLocal ? "Lusaka" : "Dar es Salaam",
      price_tzs: price_tzs,
      price_zmw: price_zmw,
      weight_kg: 2.0, // standard assumption
      image_urls: [p.img],
      is_local_stock: isLocal,
      trust_rating: 4.9,
      created_at: new Date().toISOString()
    });
  }

  await insertBatch.commit();
  console.log(`Successfully seeded ${PRODUCT_DATA.length} accurate items!`);
  process.exit(0);
}

seedAccurateData();
