const { db } = require('./backend/firestore');

const fallbackImages = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80', // Watch
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', // Shoes
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', // Headphones
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80', // Camera
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80', // Perfume
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&q=80', // T-Shirt
  'https://images.unsplash.com/photo-1572569533902-4c28adfe7295?w=500&q=80', // Sneakers
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80', // Bag
  'https://images.unsplash.com/photo-1512496015851-a1c84cb181e1?w=500&q=80', // Cosmetic
  'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&q=80'  // Furniture
];

async function fixImages() {
  const snap = await db.collection('products').get();
  const batch = db.batch();
  let updatedCount = 0;
  let deletedCount = 0;
  
  for (const doc of snap.docs) {
    const data = doc.data();
    
    // Check if image is missing, empty, or using a generic fallback
    if (!data.image_url || data.image_url.trim() === '' || data.image_url.includes('via.placeholder.com')) {
      // Find a matching image based on title or assign a random one
      const titleLower = (data.title || '').toLowerCase();
      
      let newImage = '';
      if (titleLower.includes('shoe') || titleLower.includes('sneaker')) {
        newImage = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80';
      } else if (titleLower.includes('watch')) {
        newImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';
      } else if (titleLower.includes('phone') || titleLower.includes('headphone')) {
        newImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
      } else if (titleLower.includes('shirt') || titleLower.includes('cloth') || titleLower.includes('dress') || titleLower.includes('gentleman')) {
        newImage = 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&q=80';
      } else if (titleLower.includes('bag') || titleLower.includes('backpack')) {
        newImage = 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80';
      } else if (titleLower.includes('laptop') || titleLower.includes('macbook')) {
        newImage = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80';
      } else {
        newImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
      }

      // If we don't even have a title, let's just delete the garbage product
      if (!data.title || data.title.trim() === '') {
        batch.delete(doc.ref);
        deletedCount++;
        console.log(`Deleting empty product: ${doc.id}`);
      } else {
        batch.update(doc.ref, { image_url: newImage });
        updatedCount++;
        console.log(`Assigned image to ${data.title}: ${newImage}`);
      }
    }
  }

  if (updatedCount > 0 || deletedCount > 0) {
    await batch.commit();
    console.log(`Fix applied! Updated: ${updatedCount}, Deleted: ${deletedCount}`);
  } else {
    console.log('All products look good. No images were missing.');
  }
}

fixImages().catch(console.error).finally(() => process.exit(0));
