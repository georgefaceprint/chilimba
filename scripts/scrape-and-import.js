const { db } = require('../backend/firestore');

function decodeEntities(str) {
  return str
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .trim();
}

function extractAgeFromTitle(title) {
  const regex = /(\d+\s*[-–]\s*\d+\s*(?:Months|M|Yrs|Years|yrs|years))/i;
  const match = title.match(regex);
  if (match) {
    return match[1].replace(/–/g, '-').trim();
  }
  if (title.toLowerCase().includes('newborn')) {
    return 'Newborn';
  }
  return '';
}

function extractSubCategory(classes) {
  const primarySlugs = ['baby-boys-clothing', 'baby-girls-clothing', 'kids-boys-3-14-yrs'];
  const catClasses = classes.filter(cls => cls.startsWith('product_cat-'));
  
  const subMaps = {
    'outfits': 'Outfits & Sets',
    'pajamas': 'Pajamas & Sleep Suits',
    'tops': 'Tops & T-Shirts',
    'rompers': 'Rompers & Onesies',
    'pants': 'Pants & Shorts',
    'socks': 'Socks & Accessories'
  };

  for (const cls of catClasses) {
    const slug = cls.replace('product_cat-', '');
    if (primarySlugs.includes(slug)) continue;
    
    // Check keyword maps
    for (const key in subMaps) {
      if (slug.includes(key)) return subMaps[key];
    }
    
    // Fallback to formatted title
    const clean = slug.split('-').slice(0, 2).join(' ');
    return clean.replace(/\b\w/g, c => c.toUpperCase());
  }
  return 'Clothing';
}

async function scrapePage(page) {
  const url = `https://epictotostore.co.tz/shop/page/${page}/?_shop_by_category=baby-boys-clothing%2Cbaby-girls-clothing%2Ckids-boys-3-14-yrs`;
  console.log(`Fetching page ${page}: ${url}`);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  if (!res.ok) {
    console.error(`Failed to fetch page ${page}: Status ${res.status}`);
    return [];
  }
  
  const html = await res.text();
  const parts = html.split('<li class="product');
  const products = [];
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    const classMatch = part.match(/^\s*([^"]+)"/);
    const classes = classMatch ? classMatch[1].split(/\s+/) : [];
    
    const imgMatch = part.match(/<img[^>]+src="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : '';
    if (!imageUrl) continue; // skip if no image
    
    const titleMatch = part.match(/class="woocommerce-loop-product__title"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/s);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const title = decodeEntities(rawTitle);
    if (!title) continue;
    
    const priceMatch = part.match(/woocommerce-Price-amount amount.*?Symbol">TZS<\/span>(?:&nbsp;|\s|&nbsp;)*([\d,]+)/si);
    const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : '';
    const price_tzs = priceStr ? parseInt(priceStr) : 0;
    if (!price_tzs) continue;
    
    let category = 'Kids & Babies';
    if (classes.includes('product_cat-baby-boys-clothing')) {
      category = 'Baby Boys Clothing';
    } else if (classes.includes('product_cat-baby-girls-clothing')) {
      category = 'Baby Girls Clothing';
    } else if (classes.includes('product_cat-kids-boys-3-14-yrs')) {
      category = 'Kids Boys (3-14 Yrs)';
    }
    
    const sub_category = extractSubCategory(classes);
    const age = extractAgeFromTitle(title);
    
    products.push({
      title,
      price_tzs,
      imageUrl,
      category,
      sub_category,
      age
    });
  }
  
  return products;
}

async function run() {
  console.log('--- STARTING EPIC TOTO SCRAPER & IMPORTER ---');
  let allScraped = [];
  
  // Scrape pages 1 to 4
  for (let page = 1; page <= 4; page++) {
    try {
      const pageProducts = await scrapePage(page);
      console.log(`Page ${page} parsed: found ${pageProducts.length} valid products.`);
      allScraped = allScraped.concat(pageProducts);
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
    }
    // Sleep briefly to be nice to the website
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`Total unique products scraped: ${allScraped.length}`);
  
  if (allScraped.length === 0) {
    console.log('No products scraped. Aborting import.');
    process.exit(1);
  }
  
  const tzsRate = parseFloat(process.env.TZS_TO_ZMW_RATE) || 0.0105;
  const markup = parseFloat(process.env.FOREX_MARKUP_PERCENTAGE) || 0.05;
  const agentMargin = parseFloat(process.env.AGENT_MARGIN_PERCENTAGE) || 0.10;
  
  console.log(`Using rates: Rate=${tzsRate}, Forex Markup=${markup}, Agent Margin=${agentMargin}`);
  console.log('Importing into Firestore...');
  
  let inserted = 0;
  for (const item of allScraped) {
    try {
      const priceTzsWithMargin = item.price_tzs * (1 + agentMargin);
      const basePriceZmw = priceTzsWithMargin * tzsRate;
      const finalPriceZmw = Math.ceil(basePriceZmw * (1 + markup));
      
      const newProduct = {
        title: item.title,
        description: `Premium quality ${item.category.toLowerCase()} sourced directly from EpicToto Store in Tanzania.`,
        category: item.category,
        sub_category: item.sub_category,
        price_tzs: item.price_tzs,
        price_zmw: finalPriceZmw,
        agent_margin_percentage: agentMargin,
        agent_margin_zmw: Math.ceil((item.price_tzs * agentMargin) * tzsRate * (1 + markup)),
        weight_kg: 0.4,
        origin_country: 'Tanzania',
        origin_city: 'Dar es Salaam',
        image_urls: [item.imageUrl],
        supplier_name: 'EpicToto Store',
        supplier_id: 'epictoto_store',
        trust_rating: 4.8 + (Math.random() * 0.2),
        is_local_stock: false,
        created_at: new Date().toISOString()
      };
      
      if (item.age) {
        newProduct.attributes = { age: item.age };
      }
      
      await db.collection('products').add(newProduct);
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`Inserted ${inserted}/${allScraped.length} products...`);
      }
    } catch (err) {
      console.error(`Failed to insert product "${item.title}":`, err.message);
    }
  }
  
  console.log(`\nImport complete! Successfully added ${inserted} products to Firestore.`);
  process.exit(0);
}

run();
