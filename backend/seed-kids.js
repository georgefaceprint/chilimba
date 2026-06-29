const { db } = require('./firestore');

const kidsProducts = [
  {
    title: 'Ackermans Baby Girl Floral Romper',
    description: 'Soft 100% cotton floral romper for baby girls. Features easy snap buttons for quick diaper changes. Perfect for summer days.',
    price_zmw: 150.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '0-3m', color: 'Pink' },
    image_url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500&q=80',
    stock: 25,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Takealot 3-Pack Unisex Baby Bodysuits',
    description: 'Essential plain bodysuits for everyday wear. Super soft, stretchy neckline, and durable cotton blend.',
    price_zmw: 220.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '3-6m', color: 'White' },
    image_url: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=500&q=80',
    stock: 40,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Toddler Boy Denim Overalls',
    description: 'Trendy denim overalls with adjustable straps and cute pocket details. Machine washable and tough for playtime.',
    price_zmw: 285.00,
    category: 'Kids & Babies',
    sub_category: 'Toddlers (1-4y)',
    attributes: { age: '2y', color: 'Blue' },
    image_url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500&q=80',
    stock: 15,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Baby Boy Safari Print T-Shirt',
    description: 'Cute safari animal print tee made from breathable cotton. Lightweight and perfect for active babies.',
    price_zmw: 120.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '6-9m', color: 'Green' },
    image_url: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&q=80',
    stock: 30,
    vendor_id: 'takealot_sa',
    is_local_stock: true
  },
  {
    title: 'Toddler Girl Princess Tulle Dress',
    description: 'A magical party dress with layers of soft tulle and a satin bow. Perfect for birthdays and special occasions.',
    price_zmw: 350.00,
    category: 'Kids & Babies',
    sub_category: 'Toddlers (1-4y)',
    attributes: { age: '3y', color: 'Pink' },
    image_url: 'https://images.unsplash.com/photo-1605810756770-362098d63a34?w=500&q=80',
    stock: 10,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Kids Classic Winter Puffer Jacket',
    description: 'Keep them warm during winter with this thick, insulated puffer jacket. Features a soft fleece lining and a detachable hood.',
    price_zmw: 450.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '6y', color: 'Navy Blue' },
    image_url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=500&q=80',
    stock: 20,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Girls 2-Piece Summer Set (Top & Shorts)',
    description: 'Comfortable casual set for warm days. Elastic waistband shorts and a matching ruffle-sleeve top.',
    price_zmw: 195.00,
    category: 'Kids & Babies',
    sub_category: 'Toddlers (1-4y)',
    attributes: { age: '4y', color: 'Yellow' },
    image_url: 'https://images.unsplash.com/photo-1622290319146-7b63df48a635?w=500&q=80',
    stock: 18,
    vendor_id: 'ackermans_sa',
    is_local_stock: true
  },
  {
    title: 'Boys Graphic Dinosaur Hoodie',
    description: 'Cool dinosaur graphic hoodie with a soft brushed inner for extra warmth. Great for everyday wear.',
    price_zmw: 260.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '5y', color: 'Grey' },
    image_url: 'https://images.unsplash.com/photo-1601334913867-b8fbd8d7f7fa?w=500&q=80',
    stock: 22,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Newborn Knitted Winter Beanie & Mittens',
    description: 'Adorable knitted set to keep tiny heads and hands warm. Gentle on sensitive skin.',
    price_zmw: 95.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '0-3m', color: 'White' },
    image_url: 'https://images.unsplash.com/photo-1522771731536-601902882794?w=500&q=80',
    stock: 50,
    vendor_id: 'ackermans_sa',
    is_local_stock: true
  },
  {
    title: 'Kids School Shoes - Black Leather',
    description: 'Durable genuine leather school shoes with a comfortable sole and easy velcro straps.',
    price_zmw: 380.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '8y', color: 'Black' },
    image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
    stock: 45,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Baby Girl Ruffle Sleepsuit',
    description: 'Cozy sleepsuit with cute ruffle details on the shoulders. Built-in scratch mitts included.',
    price_zmw: 160.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '3-6m', color: 'Pink' },
    image_url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500&q=80',
    stock: 28,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Toddler Boy Cargo Pants',
    description: 'Tough cargo pants with plenty of pockets. Elastic waist for easy dressing.',
    price_zmw: 210.00,
    category: 'Kids & Babies',
    sub_category: 'Toddlers (1-4y)',
    attributes: { age: '3y', color: 'Khaki' },
    image_url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500&q=80',
    stock: 12,
    vendor_id: 'takealot_sa',
    is_local_stock: true
  },
  {
    title: 'Girls Floral Summer Dress',
    description: 'A light and airy summer dress with beautiful floral patterns. Perfect for weekends and church.',
    price_zmw: 230.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '7y', color: 'Multicolor' },
    image_url: 'https://images.unsplash.com/photo-1605810756770-362098d63a34?w=500&q=80',
    stock: 15,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Boys Sports Tracksuit Set',
    description: 'Matching jacket and jogger pants for active boys. Breathable fabric for sports or lounging.',
    price_zmw: 320.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '10y', color: 'Navy Blue' },
    image_url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=500&q=80',
    stock: 20,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Newborn Unisex Starter Pack (5 Items)',
    description: 'The perfect hospital bag starter pack. Includes 2 bodysuits, 1 sleepsuit, a beanie, and a bib.',
    price_zmw: 450.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '0-3m', color: 'White' },
    image_url: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=500&q=80',
    stock: 35,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Toddler Girls Rain Coat',
    description: 'Waterproof rain coat with a fun polka dot design. Keeps your little one dry during the rainy season.',
    price_zmw: 280.00,
    category: 'Kids & Babies',
    sub_category: 'Toddlers (1-4y)',
    attributes: { age: '4y', color: 'Pink' },
    image_url: 'https://images.unsplash.com/photo-1622290319146-7b63df48a635?w=500&q=80',
    stock: 14,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Kids Character Pyjamas Set',
    description: 'Fun and comfy two-piece pyjamas featuring popular cartoon characters. 100% cotton.',
    price_zmw: 190.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '6y', color: 'Blue' },
    image_url: 'https://images.unsplash.com/photo-1601334913867-b8fbd8d7f7fa?w=500&q=80',
    stock: 40,
    vendor_id: 'ackermans_sa',
    is_local_stock: true
  },
  {
    title: 'Baby Boy Chino Shorts',
    description: 'Smart-casual chino shorts perfect for family outings. Includes an adjustable waist.',
    price_zmw: 150.00,
    category: 'Kids & Babies',
    sub_category: 'Newborns (0-12m)',
    attributes: { age: '9-12m', color: 'Khaki' },
    image_url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500&q=80',
    stock: 22,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  },
  {
    title: 'Toddler Boys Sneakers',
    description: 'Comfortable everyday sneakers with easy-on velcro fastening. Light-up soles!',
    price_zmw: 295.00,
    category: 'Kids & Babies',
    sub_category: 'Toddlers (1-4y)',
    attributes: { age: '3y', color: 'White' },
    image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
    stock: 18,
    vendor_id: 'ackermans_sa',
    is_local_stock: false
  },
  {
    title: 'Girls Knitted Cardigan Sweater',
    description: 'Beautifully knitted cardigan with button-down front. Essential layer for chilly evenings.',
    price_zmw: 220.00,
    category: 'Kids & Babies',
    sub_category: 'Kids (5-12y)',
    attributes: { age: '8y', color: 'Pink' },
    image_url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=500&q=80',
    stock: 25,
    vendor_id: 'takealot_sa',
    is_local_stock: false
  }
];

async function seedKidsProducts() {
  const snap = await db.collection('products').where('category', '==', 'Kids & Babies').get();
  const deleteBatch = db.batch();
  snap.docs.forEach(doc => {
    deleteBatch.delete(doc.ref);
  });
  if (!snap.empty) {
    await deleteBatch.commit();
    console.log(`Deleted ${snap.size} old Kids products.`);
  }

  const batch = db.batch();
  for (const product of kidsProducts) {
    const docRef = db.collection('products').doc();
    batch.set(docRef, {
      ...product,
      created_at: new Date().toISOString()
    });
  }
  
  await batch.commit();
  console.log('Successfully re-seeded 20 Kids & Babies products with attributes!');
}

seedKidsProducts().catch(console.error).finally(() => process.exit(0));
