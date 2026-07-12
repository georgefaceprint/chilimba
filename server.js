require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

// Import Controllers and Middleware
const authController = require('./backend/auth');
const { sendWhatsAppMessage } = require('./backend/auth');
const paymentsController = require('./backend/payments');
const { authorizeRoute, ROLES } = require('./backend/rbac');
const db = require('./backend/db');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
// SPA catch-all moved to the bottom
app.use(cors({ origin: ['https://chilimba-pwa.vercel.app','https://chilimba-kv32tixjo-georgefaceprints-projects.vercel.app'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- ROUTES ---

// 1. Authentication Routes
app.post('/api/v1/auth/google/callback', authController.handleGoogleAuthCallback);
app.post('/api/v1/auth/whatsapp/initiate', authController.initiateWhatsAppVerification);
app.post('/api/v1/auth/whatsapp/verify', authController.verifyWhatsAppOTP);

app.get('/api/v1/auth/me', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Fetch latest user data for KYC status
    const db = require('./backend/firestore').db;
    const userDoc = await db.collection('users').doc(decoded.user_id).get();
    let latestUser = decoded;
    if (userDoc.exists) {
      latestUser = { ...decoded, ...userDoc.data() };
    }
    
    res.json({ authenticated: true, user: latestUser });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

app.post('/api/v1/user/update-kyc', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const { name, surname, whatsapp, country, province, town, role } = req.body;
    
    const db = require('./backend/firestore').db;
    const updateData = { kyc_complete: true };
    
    if (name) updateData.first_name = name;
    if (surname) updateData.last_name = surname;
    if (name && surname) updateData.display_name = `${name} ${surname}`;
    if (whatsapp) updateData.phone_number = whatsapp;
    if (country) updateData.country = country;
    if (province) updateData.province = province;
    if (town) updateData.town = town;
    if (role) updateData.role = role;
    
    await db.collection('users').doc(decoded.user_id).update(updateData);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[KYC Update Error]', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// Agent Passcode Login (for field agents like runners, scanners)
app.post('/api/v1/auth/passcode-login', async (req, res) => {
  try {
    const { phone, passcode } = req.body;
    if (!phone || !passcode) return res.status(400).json({ success: false, error: 'Phone and passcode required.' });

    const { db } = require('./backend/firestore');
    const crypto = require('crypto');

    // Find user by phone number
    const snap = await db.collection('users').where('phone_number', '==', phone).limit(1).get();
    if (snap.empty) return res.status(401).json({ success: false, error: 'Invalid phone or passcode.' });

    const userDoc = snap.docs[0];
    const user = userDoc.data();

    // Verify passcode hash
    const salt = 'chilimba_agent_salt_2026';
    const inputHash = crypto.createHash('sha256').update(salt + passcode).digest('hex');

    if (inputHash !== user.passcode_hash) {
      return res.status(401).json({ success: false, error: 'Invalid phone or passcode.' });
    }

    // Issue JWT cookie
    const tokenPayload = {
      user_id: userDoc.id,
      name: user.display_name || user.name || 'Agent',
      email: user.email || '',
      role: user.role || 'AGENT',
      phone_number: user.phone_number,
      avatar: user.avatar || '',
      kyc_complete: user.kyc_complete || true
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
    res.cookie('auth_token', token, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 30 * 24 * 60 * 60 * 1000 });

    res.json({ success: true, user: tokenPayload });
  } catch (err) {
    console.error('[Passcode Login Error]', err);
    res.status(500).json({ success: false, error: 'Login failed.' });
  }
});

// Set / Update Passcode (any authenticated user)
app.post('/api/v1/auth/set-passcode', async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ success: false, error: 'Not authenticated.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    const { passcode } = req.body;
    if (!passcode || passcode.length !== 5 || !/^\d{5}$/.test(passcode)) {
      return res.status(400).json({ success: false, error: 'Passcode must be exactly 5 digits.' });
    }

    const crypto = require('crypto');
    const { db } = require('./backend/firestore');
    const salt = 'chilimba_agent_salt_2026';
    const passcodeHash = crypto.createHash('sha256').update(salt + passcode).digest('hex');

    await db.collection('users').doc(decoded.user_id).update({
      passcode_hash: passcodeHash,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'Passcode saved.' });
  } catch (err) {
    console.error('[Set Passcode Error]', err);
    res.status(500).json({ success: false, error: 'Failed to save passcode.' });
  }
});

// 2. Payment Routes
app.post('/api/v1/payments/initiate', paymentsController.initiateMobileMoneyPayment);
app.post('/api/v1/payments/lenco-callback', paymentsController.handleLencoCallback);
app.post('/payments/lenco-callback', paymentsController.handleLencoCallback); // Fallback for the integration test script

// 3. Catalog Routes
app.get('/api/v1/products', async (req, res) => {
  try {
    const products = await require('./backend/firestore').query('products');
    
    const productsWithTiers = products.map(p => {
      if (!p.price_tiers || p.price_tiers.length === 0) {
        const basePrice = parseFloat(p.price_zmw);
        p.price_tiers = [
          { min_qty: 1, price_zmw: basePrice },
          { min_qty: 3, price_zmw: Math.round(basePrice * 0.9) },
          { min_qty: 6, price_zmw: Math.round(basePrice * 0.8) }
        ];
      }
      return p;
    });
    
    res.json({ success: true, products: productsWithTiers });
  } catch (error) {
    console.error('[Products API] Firestore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Tracking/Logistics Routes 
app.post('/api/v1/upload', async (req, res) => {
  try {
    const { name, base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ error: 'No file data provided' });
    }
    
    // Clean base64 string
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create uploads folder in public
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Create unique filename
      const ext = path.extname(name) || '.jpg';
      const filename = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      
      fs.writeFileSync(filePath, buffer);
      return res.json({ success: true, url: `/uploads/${filename}` });
    } catch (fsErr) {
      console.warn('Local filesystem write failed, using base64 fallback:', fsErr.message);
      // Fallback: use the base64 data URL itself
      return res.json({ success: true, url: base64 });
    }
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/products/upload', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price_tzs, 
      price_zmw_input, 
      weight_kg, 
      origin_city, 
      origin_country, 
      image_url, 
      supplier_name, 
      supplier_id,
      category,
      sub_category,
      sub_sub_category,
      attributes
    } = req.body;
    
    let finalPriceZmw = 0;
    let agentMargin = 0;
    
    if (origin_country === 'Zambia') {
      // Local stock: No forex, no markup, direct ZMW input
      finalPriceZmw = parseFloat(price_zmw_input);
    } else {
      // International stock (Tanzania, SA): Forex calculation: TZS -> ZMW
      const tzsRate = parseFloat(process.env.TZS_TO_ZMW_RATE) || 0.0105;
      const markup = parseFloat(process.env.FOREX_MARKUP_PERCENTAGE) || 0.05; // 5%
      agentMargin = parseFloat(process.env.AGENT_MARGIN_PERCENTAGE) || 0.10; // 10% agent margin
      
      const priceTzsWithMargin = price_tzs * (1 + agentMargin);
      const basePriceZmw = priceTzsWithMargin * tzsRate;
      finalPriceZmw = basePriceZmw * (1 + markup);
    }
    
    const newProduct = {
      title,
      description,
      category: category || 'General',
      sub_category: sub_category || 'All',
      sub_sub_category: sub_sub_category || 'All',
      price_tzs: origin_country === 'Zambia' ? 0 : price_tzs,
      price_zmw: Math.ceil(finalPriceZmw),
      agent_margin_percentage: origin_country === 'Zambia' ? 0 : agentMargin,
      agent_margin_zmw: origin_country === 'Zambia' ? 0 : Math.ceil((price_tzs * agentMargin) * (parseFloat(process.env.TZS_TO_ZMW_RATE) || 0.0105) * (1 + (parseFloat(process.env.FOREX_MARKUP_PERCENTAGE) || 0.05))),
      weight_kg: parseFloat(weight_kg) || 0,
      origin_country: origin_country || 'Tanzania',
      origin_city,
      image_urls: image_url ? [image_url] : [],
      supplier_name,
      supplier_id,
      attributes: attributes || null,
      trust_rating: 4.8 + (Math.random() * 0.2), // Random 4.8 - 5.0 for demo
      is_local_stock: origin_country === 'Zambia',
      created_at: new Date().toISOString()
    };
    
    const { db } = require('./backend/firestore');
    const docRef = await db.collection('products').add(newProduct);
    
    res.json({ success: true, product_id: docRef.id });
  } catch (error) {
    console.error('[Products Upload API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Favorites Routes
app.get('/api/v1/favorites', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const { db } = require('./backend/firestore');
    
    const userDoc = await db.collection('users').doc(decoded.user_id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const favorites = userData.favorites || [];
    res.json({ success: true, favorites });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/favorites/toggle', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }
    
    const { db } = require('./backend/firestore');
    const userRef = db.collection('users').doc(decoded.user_id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    let favorites = userData.favorites || [];
    let favorited = false;
    
    if (favorites.includes(product_id)) {
      favorites = favorites.filter(id => id !== product_id);
    } else {
      favorites.push(product_id);
      favorited = true;
    }
    
    await userRef.update({ favorites });
    res.json({ success: true, favorited, favorites });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Product Editing Route
app.post('/api/v1/products/edit', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    const { db } = require('./backend/firestore');
    const userDoc = await db.collection('users').doc(decoded.user_id).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    
    const userData = userDoc.data();
    if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'AGENT') {
      return res.status(403).json({ success: false, error: 'Access forbidden. Admin role required.' });
    }
    
    const { 
      product_id,
      title,
      description,
      price_tzs,
      price_zmw_input,
      weight_kg,
      origin_city,
      origin_country,
      image_url,
      category,
      sub_category,
      sub_sub_category,
      attributes
    } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ success: false, error: 'Product ID is required for editing' });
    }
    
    const productRef = db.collection('products').doc(product_id);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Re-calculate margins and exchange rates
    let finalPriceZmw = 0;
    let agentMargin = 0;
    
    if (origin_country === 'Zambia') {
      finalPriceZmw = parseFloat(price_zmw_input);
    } else {
      const tzsRate = parseFloat(process.env.TZS_TO_ZMW_RATE) || 0.0105;
      const markup = parseFloat(process.env.FOREX_MARKUP_PERCENTAGE) || 0.05;
      agentMargin = parseFloat(process.env.AGENT_MARGIN_PERCENTAGE) || 0.10;
      
      const priceTzsWithMargin = price_tzs * (1 + agentMargin);
      const basePriceZmw = priceTzsWithMargin * tzsRate;
      finalPriceZmw = basePriceZmw * (1 + markup);
    }
    
    const updates = {
      title,
      description,
      category: category || 'General',
      sub_category: sub_category || 'All',
      sub_sub_category: sub_sub_category || 'All',
      price_tzs: origin_country === 'Zambia' ? 0 : parseFloat(price_tzs),
      price_zmw: Math.ceil(finalPriceZmw),
      agent_margin_percentage: origin_country === 'Zambia' ? 0 : agentMargin,
      agent_margin_zmw: origin_country === 'Zambia' ? 0 : Math.ceil((price_tzs * agentMargin) * (parseFloat(process.env.TZS_TO_ZMW_RATE) || 0.0105) * (1 + (parseFloat(process.env.FOREX_MARKUP_PERCENTAGE) || 0.05))),
      weight_kg: parseFloat(weight_kg) || 0,
      origin_country: origin_country || 'Tanzania',
      origin_city,
      supplier_name: req.body.supplier_name || productDoc.data().supplier_name || 'Generic Supplier',
      is_local_stock: origin_country === 'Zambia',
      updated_at: new Date().toISOString()
    };
    
    if (image_url) {
      updates.image_urls = [image_url];
    }
    if (attributes) {
      updates.attributes = attributes;
    }
    
    await productRef.update(updates);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('[Products Edit API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 5. Logistics Tracking & QR Scanner Routes
app.post('/api/v1/tracking/scan', async (req, res) => {
  try {
    const { order_id, location, scanned_by } = req.body;
    const { db } = require('./backend/firestore');
    
    // Default flow: SOURCED_IN_TZ -> ARRIVED_AT_BORDER -> IN_TRANSIT_ZAMBIA -> READY_FOR_PICKUP -> COLLECTED
    const orderRef = db.collection('logistics_tracking').doc(order_id);
    const doc = await orderRef.get();
    
    let current_status = 'SOURCED_IN_TZ';
    let next_status = 'ARRIVED_AT_BORDER';
    
    if (doc.exists) {
      current_status = doc.data().current_status;
      if (current_status === 'SOURCED_IN_TZ') next_status = 'ARRIVED_AT_BORDER';
      else if (current_status === 'ARRIVED_AT_BORDER') next_status = 'IN_TRANSIT_ZAMBIA';
      else if (current_status === 'IN_TRANSIT_ZAMBIA') next_status = 'READY_FOR_PICKUP';
      else if (current_status === 'READY_FOR_PICKUP') next_status = 'COLLECTED';
      else next_status = current_status; // already collected
    }
    
    await orderRef.set({
      order_id,
      current_status: next_status,
      last_location: location,
      last_scanned_by: scanned_by,
      updated_at: new Date().toISOString()
    }, { merge: true });
    
    res.json({ success: true, new_status: next_status });
  } catch (error) {
    console.error('[QR Scan API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/tracking/order/:id', async (req, res) => {
  try {
    const { db } = require('./backend/firestore');
    const doc = await db.collection('logistics_tracking').doc(req.params.id).get();
    if (!doc.exists) return res.json({ current_status: 'UNKNOWN' });
    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Multi-Tenancy / Micro-Group Routes (Phase 4)
app.get('/api/v1/groups/check-name', async (req, res) => {
  try {
    const { name } = req.query;
    const { db } = require('./backend/firestore');
    // Check if any group has this name
    const snapshot = await db.collection('groups').where('name', '==', name).limit(1).get();
    res.json({ available: snapshot.empty });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/groups/create', async (req, res) => {
  try {
    const { name, admin_id } = req.body;
    const { db } = require('./backend/firestore');
    
    // Double check availability
    const snapshot = await db.collection('groups').where('name', '==', name).limit(1).get();
    if (!snapshot.empty) return res.status(400).json({ error: 'Name already taken' });
    
    // Generate 6-char invite code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newGroup = {
      name,
      admin_id,
      invite_code,
      status: 'PENDING_FIRST_ORDER',
      member_count: 1, // Admin is member 1
      max_members: 20,
      created_at: new Date().toISOString()
    };
    
    const docRef = await db.collection('groups').add(newGroup);
    
    // Add to user_groups mapping
    await db.collection('user_groups').add({
      user_id: admin_id,
      group_id: docRef.id,
      role: 'ADMIN',
      joined_at: new Date().toISOString()
    });
    
    res.json({ success: true, group_id: docRef.id, invite_code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/groups/join', async (req, res) => {
  try {
    const { user_id, invite_code } = req.body;
    const { db } = require('./backend/firestore');
    
    const snapshot = await db.collection('groups').where('invite_code', '==', invite_code).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Invalid invite code' });
    
    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();
    
    if (groupData.member_count >= groupData.max_members) {
      return res.status(400).json({ error: 'This Chilimba is full!' });
    }
    
    // Check if already in group
    const userGroupSnap = await db.collection('user_groups')
      .where('user_id', '==', user_id)
      .where('group_id', '==', groupDoc.id)
      .get();
      
    if (!userGroupSnap.empty) return res.status(400).json({ error: 'You are already in this group' });
    
    // Add user to group
    await db.collection('user_groups').add({
      user_id,
      group_id: groupDoc.id,
      role: 'MEMBER',
      joined_at: new Date().toISOString()
    });
    
    // Increment member count
    await groupDoc.ref.update({
      member_count: groupData.member_count + 1
    });
    
    res.json({ success: true, group_id: groupDoc.id, group_name: groupData.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/groups/my-groups', async (req, res) => {
  try {
    const { user_id } = req.query;
    const { db } = require('./backend/firestore');
    
    const mappingSnap = await db.collection('user_groups').where('user_id', '==', user_id).get();
    const groupPromises = mappingSnap.docs.map(async (doc) => {
      const data = doc.data();
      const groupDoc = await db.collection('groups').doc(data.group_id).get();
      return { ...groupDoc.data(), id: groupDoc.id, my_role: data.role };
    });
    
    const groups = await Promise.all(groupPromises);
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/groups/public-info', async (req, res) => {
  try {
    const { invite_code } = req.query;
    if (!invite_code) return res.status(400).json({ error: 'Invite code required' });
    
    const { db } = require('./backend/firestore');
    const snapshot = await db.collection('groups').where('invite_code', '==', invite_code).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Group not found' });
    
    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();
    
    // Get shared cart items for this group
    const cartSnapshot = await db.collection('groups').doc(groupDoc.id).collection('cart').get();
    const items = cartSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        title: data.title,
        price_zmw: data.price_zmw,
        quantity: data.quantity,
        image_url: data.image_url
      };
    });
    
    res.json({
      success: true,
      group_id: groupDoc.id,
      name: groupData.name,
      member_count: groupData.member_count,
      max_members: groupData.max_members,
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all groups with optional search query
app.get('/api/v1/groups/list', async (req, res) => {
  try {
    const { query } = req.query;
    const { db } = require('./backend/firestore');
    
    let groupsRef = db.collection('groups');
    let snapshot;
    
    if (query) {
      snapshot = await groupsRef.where('name', '>=', query).where('name', '<=', query + '\uf8ff').get();
    } else {
      snapshot = await groupsRef.orderBy('created_at', 'desc').limit(20).get();
    }
    
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Request to join a group
app.post('/api/v1/groups/request-join', async (req, res) => {
  try {
    const { user_id, user_name, user_phone, group_id } = req.body;
    if (!user_id || !group_id) {
      return res.status(400).json({ success: false, error: 'User ID and Group ID are required' });
    }
    
    const { db } = require('./backend/firestore');
    
    const groupDoc = await db.collection('groups').doc(group_id).get();
    if (!groupDoc.exists) return res.status(404).json({ success: false, error: 'Group not found' });
    
    const userGroupSnap = await db.collection('user_groups')
      .where('user_id', '==', user_id)
      .where('group_id', '==', group_id)
      .get();
    if (!userGroupSnap.empty) {
      return res.status(400).json({ success: false, error: 'You are already a member of this group' });
    }
    
    const pendingSnap = await db.collection('group_join_requests')
      .where('user_id', '==', user_id)
      .where('group_id', '==', group_id)
      .where('status', '==', 'PENDING')
      .get();
    if (!pendingSnap.empty) {
      return res.status(400).json({ success: false, error: 'You already have a pending request for this group' });
    }
    
    const newRequest = {
      group_id,
      group_name: groupDoc.data().name,
      user_id,
      user_name: user_name || 'Guest User',
      user_phone: user_phone || '',
      status: 'PENDING',
      requested_at: new Date().toISOString()
    };
    
    const docRef = await db.collection('group_join_requests').add(newRequest);
    res.json({ success: true, request_id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pending join requests for a group (For Admin)
app.get('/api/v1/groups/join-requests/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.query;
    const { db } = require('./backend/firestore');
    
    const userGroupSnap = await db.collection('user_groups')
      .where('user_id', '==', user_id)
      .where('group_id', '==', group_id)
      .where('role', '==', 'ADMIN')
      .get();
      
    if (userGroupSnap.empty) {
      return res.status(403).json({ success: false, error: 'Access denied. Group Admin permission required.' });
    }
    
    const requestsSnap = await db.collection('group_join_requests')
      .where('group_id', '==', group_id)
      .where('status', '==', 'PENDING')
      .get();
      
    const requests = requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve/Reject join request
app.post('/api/v1/groups/approve-join', async (req, res) => {
  try {
    const { request_id, admin_id, action } = req.body;
    if (!request_id || !admin_id || !action) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    
    const { db } = require('./backend/firestore');
    
    const requestRef = db.collection('group_join_requests').doc(request_id);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) return res.status(404).json({ success: false, error: 'Join request not found' });
    
    const requestData = requestDoc.data();
    if (requestData.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Join request already processed' });
    }
    
    const userGroupSnap = await db.collection('user_groups')
      .where('user_id', '==', admin_id)
      .where('group_id', '==', requestData.group_id)
      .where('role', '==', 'ADMIN')
      .get();
    if (userGroupSnap.empty) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin role required.' });
    }
    
    if (action === 'APPROVE') {
      const groupRef = db.collection('groups').doc(requestData.group_id);
      const groupDoc = await groupRef.get();
      if (!groupDoc.exists) return res.status(404).json({ success: false, error: 'Group not found' });
      
      const groupData = groupDoc.data();
      if (groupData.member_count >= groupData.max_members) {
        return res.status(400).json({ success: false, error: 'Group is already full' });
      }
      
      await db.collection('user_groups').add({
        user_id: requestData.user_id,
        group_id: requestData.group_id,
        role: 'MEMBER',
        joined_at: new Date().toISOString()
      });
      
      await groupRef.update({
        member_count: groupData.member_count + 1
      });
      
      await requestRef.update({ status: 'APPROVED' });
      res.json({ success: true, message: 'User approved to join group successfully!' });
    } else {
      await requestRef.update({ status: 'REJECTED' });
      res.json({ success: true, message: 'User join request rejected' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 7. Wallet Routes
app.get('/api/v1/wallet/balance', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const { db } = require('./backend/firestore');
    const userDoc = await db.collection('users').doc(user_id).get();
    res.json({ balance: userDoc.exists ? (userDoc.data().wallet_balance || 0) : 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/wallet/topup', async (req, res) => {
  try {
    const { user_id, amount, phone_number } = req.body;
    const amountNum = parseFloat(amount);
    if (!user_id || isNaN(amountNum)) return res.status(400).json({ error: 'Missing or invalid parameters' });
    const { db } = require('./backend/firestore');
    const userRef = db.collection('users').doc(user_id);
    const userDoc = await userRef.get();

    // MOCK: In production this would trigger Lenco STK Push. Here we just instantly top up.
    const currentBalance = userDoc.exists ? (userDoc.data().wallet_balance || 0) : 0;

    if (!userDoc.exists) {
      await userRef.set({ wallet_balance: amountNum }, { merge: true });
    } else {
      await userRef.update({ wallet_balance: currentBalance + amountNum });
    }

    res.json({ success: true, new_balance: currentBalance + amountNum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Cart / Micro-Savings Routes
app.post('/api/v1/cart/add', async (req, res) => {
  try {
    const { group_id, user_id, product_id, title, price_zmw, quantity, image_url } = req.body;
    const { db } = require('./backend/firestore');
    
    let cartRef;
    
    if (group_id.startsWith('PERSONAL_')) {
      cartRef = db.collection('users').doc(user_id).collection('cart');
    } else {
      const groupDoc = await db.collection('groups').doc(group_id).get();
      if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
      cartRef = db.collection('groups').doc(group_id).collection('cart');
    }
    
    const existingItem = await cartRef.where('product_id', '==', product_id).where('user_id', '==', user_id).limit(1).get();
    
    if (!existingItem.empty) {
      // Update quantity
      const itemDoc = existingItem.docs[0];
      await itemDoc.ref.update({
        quantity: itemDoc.data().quantity + quantity
      });
    } else {
      // Add new
      await cartRef.add({
        user_id,
        product_id,
        title,
        price_zmw,
        quantity,
        image_url,
        added_at: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/cart/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.query;
    const { db } = require('./backend/firestore');
    
    let snapshot;
    if (group_id.startsWith('PERSONAL_') && user_id) {
       snapshot = await db.collection('users').doc(user_id).collection('cart').get();
    } else {
       snapshot = await db.collection('groups').doc(group_id).collection('cart').get();
    }
    
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Dynamic price recalculation for group carts (Loop A)
    if (!group_id.startsWith('PERSONAL_')) {
      // 1. Group items by product_id and count total quantities
      const quantities = {};
      items.forEach(item => {
        quantities[item.product_id] = (quantities[item.product_id] || 0) + item.quantity;
      });

      // 2. Fetch products and apply pricing tiers
      const productPromises = Object.keys(quantities).map(async (pid) => {
        const doc = await db.collection('products').doc(pid).get();
        if (doc.exists) {
          const p = doc.data();
          const basePrice = parseFloat(p.price_zmw);
          // Fallback tiers
          const tiers = p.price_tiers && p.price_tiers.length > 0 ? p.price_tiers : [
            { min_qty: 1, price_zmw: basePrice },
            { min_qty: 3, price_zmw: Math.round(basePrice * 0.9) },
            { min_qty: 6, price_zmw: Math.round(basePrice * 0.8) }
          ];
          return { id: pid, tiers, basePrice, weight_kg: p.weight_kg, is_local_stock: p.is_local_stock, custom_logistics: p.custom_logistics };
        }
        return null;
      });
      
      const productsData = await Promise.all(productPromises);
      const productMap = {};
      productsData.forEach(p => {
        if (p) productMap[p.id] = p;
      });

      // 3. Update price_zmw of each cart item dynamically based on total group quantity
      items.forEach(item => {
        const prodInfo = productMap[item.product_id];
        if (prodInfo) {
          const totalQty = quantities[item.product_id];
          const basePrice = prodInfo.basePrice;
          
          let activePrice = basePrice;
          let bestTier = null;
          
          prodInfo.tiers.forEach(tier => {
            if (totalQty >= tier.min_qty) {
              if (!bestTier || tier.min_qty > bestTier.min_qty) {
                bestTier = tier;
              }
            }
          });
          
          if (bestTier) {
            activePrice = bestTier.price_zmw;
          }
          
          item.original_price_zmw = basePrice;
          item.price_zmw = activePrice;
          item.discount_unlocked = activePrice < basePrice;
          item.savings_per_unit_zmw = basePrice - activePrice;
          
          item.weight_kg = prodInfo.weight_kg;
          item.is_local_stock = prodInfo.is_local_stock;
          item.custom_logistics = prodInfo.custom_logistics;
        } else {
          item.original_price_zmw = item.price_zmw;
          item.discount_unlocked = false;
          item.savings_per_unit_zmw = 0;
        }
      });
    } else {
      // Fetch product details for personal cart too to expose weight, local stock, and custom logistics
      const productPromises = items.map(async (item) => {
        const doc = await db.collection('products').doc(item.product_id).get();
        if (doc.exists) {
          const p = doc.data();
          return { id: item.product_id, weight_kg: p.weight_kg, is_local_stock: p.is_local_stock, custom_logistics: p.custom_logistics };
        }
        return null;
      });
      const productsData = await Promise.all(productPromises);
      const productMap = {};
      productsData.forEach(p => {
        if (p) productMap[p.id] = p;
      });

      items.forEach(item => {
        const prodInfo = productMap[item.product_id];
        if (prodInfo) {
          item.weight_kg = prodInfo.weight_kg;
          item.is_local_stock = prodInfo.is_local_stock;
          item.custom_logistics = prodInfo.custom_logistics;
        }
        item.original_price_zmw = item.price_zmw;
        item.discount_unlocked = false;
        item.savings_per_unit_zmw = 0;
      });
    }
    
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/cart/remove', async (req, res) => {
  try {
    const { group_id, user_id, cart_item_id } = req.body;
    const { db } = require('./backend/firestore');
    
    let cartRef;
    if (group_id.startsWith('PERSONAL_')) {
      cartRef = db.collection('users').doc(user_id).collection('cart');
    } else {
      cartRef = db.collection('groups').doc(group_id).collection('cart');
    }
    
    await cartRef.doc(cart_item_id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/cart/update-qty', async (req, res) => {
  try {
    const { group_id, user_id, cart_item_id, quantity } = req.body;
    const { db } = require('./backend/firestore');
    
    let cartRef;
    if (group_id.startsWith('PERSONAL_')) {
      cartRef = db.collection('users').doc(user_id).collection('cart');
    } else {
      cartRef = db.collection('groups').doc(group_id).collection('cart');
    }
    
    if (quantity <= 0) {
      await cartRef.doc(cart_item_id).delete();
    } else {
      await cartRef.doc(cart_item_id).update({ quantity: parseInt(quantity) });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/cart/checkout', async (req, res) => {
  try {
    const { group_id, user_id, use_wallet, total_amount } = req.body;
    const { db } = require('./backend/firestore');
    
    // Handle Wallet Payment
    if (use_wallet && total_amount) {
       const userRef = db.collection('users').doc(user_id);
       const userDoc = await userRef.get();
       if (userDoc.exists && (userDoc.data().wallet_balance || 0) >= total_amount) {
           await userRef.update({
               wallet_balance: userDoc.data().wallet_balance - total_amount
           });
       } else {
           return res.status(400).json({ error: 'Insufficient wallet balance. Please top up.' });
       }
    }

    const { db: firestoreDb } = require('./backend/firestore');

    // ── STEP 1: Snapshot cart items BEFORE clearing ──────────────────────
    let cartItems = [];
    try {
      if (group_id.startsWith('PERSONAL_')) {
        const cartSnap = await firestoreDb.collection('users').doc(user_id).collection('cart').get();
        cartItems = cartSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        const cartSnap = await firestoreDb.collection('groups').doc(group_id).collection('cart').get();
        cartItems = cartSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch(e) { console.error('[Cart Snapshot Error]', e.message); }

    // ── STEP 2: Save order to Firestore history ───────────────────────────
    let savedOrderId = null;
    try {
      const orderRef = await firestoreDb.collection('orders').add({
        user_id,
        group_id,
        items: cartItems,
        total_amount: total_amount || 0,
        status: use_wallet ? 'PAID' : 'PENDING',
        payment_method: use_wallet ? 'wallet' : 'mobile_money',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      savedOrderId = orderRef.id;
    } catch(e) {
      console.error('[Order Save Error]', e.message);
    }

    // ── STEP 3: Clear cart and update group status ────────────────────────
    if (group_id.startsWith('PERSONAL_')) {
      // Clear personal cart
      try {
        const cartRef = firestoreDb.collection('users').doc(user_id).collection('cart');
        const snapshot = await cartRef.get();
        const batch = firestoreDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } catch(e) { console.error('[Cart Clear Error]', e.message); }
    } else {
      // Update group status to ORDER_PLACED
      try {
        const groupDoc = await firestoreDb.collection('groups').doc(group_id).get();
        if (groupDoc.exists) {
          await groupDoc.ref.update({
            status: 'ORDER_PLACED',
            order_id: savedOrderId,
            updated_at: new Date().toISOString()
          });
        }
      } catch(e) { console.error('[Group Status Error]', e.message); }
    }

    // Send WhatsApp receipt
    try {
      const { db: fsDb } = require('./backend/firestore');
      const userDoc = await fsDb.collection('users').doc(user_id).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const phone = userData.phone_number;
      const name = userData.display_name || userData.first_name || 'Customer';
      const orderRef = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const isGroup = !group_id.startsWith('PERSONAL_');
      const receipt = [
        `✅ *Chilimba Order Confirmed!*`,
        ``,
        `Hi ${name}, your order has been placed.`,
        ``,
        `📦 *Reference:* ${orderRef}`,
        `💰 *Amount:* K${parseFloat(total_amount || 0).toLocaleString()}`,
        `💳 *Payment:* ${use_wallet ? 'Chilimba Wallet' : 'Mobile Money'}`,
        `🚚 *Type:* ${isGroup ? 'Group Order' : 'Personal Order'}`,
        ``,
        `Track your order at: ${process.env.APP_BASE_URL || 'https://chilimba-pwa.vercel.app'}/orders.html`,
        ``,
        `Thank you for shopping with Chilimba! 🛒`
      ].join('\n');
      if (phone) await sendWhatsAppMessage(phone, receipt);
    } catch(e) {
      console.error('[WhatsApp Receipt Error]', e.message);
    }

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET order history for a user
app.get('/api/v1/orders', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const { db } = require('./backend/firestore');
    const snap = await db.collection('orders')
      .where('user_id', '==', decoded.user_id)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ orders });
  } catch(err) {
    console.error('[Orders Fetch Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper for completing group orders
async function checkAndCompleteGroupOrder(group_id) {
  const { db } = require('./backend/firestore');
  const contribsSnap = await db.collection('group_contributions').where('group_id', '==', group_id).get();
  
  let allPaid = true;
  contribsSnap.docs.forEach(doc => {
    if (doc.data().status !== 'PAID') {
      allPaid = false;
    }
  });

  if (allPaid && !contribsSnap.empty) {
    // 1. Update group status to ORDER_PLACED
    const groupRef = db.collection('groups').doc(group_id);
    await groupRef.update({
      status: 'ORDER_PLACED',
      updated_at: new Date().toISOString()
    });

    // 2. Clear the cart
    const cartRef = db.collection('groups').doc(group_id).collection('cart');
    const cartSnap = await cartRef.get();
    const batch = db.batch();
    cartSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

app.post('/api/v1/cart/lock', async (req, res) => {
  try {
    const { group_id, user_id } = req.body;
    const { db } = require('./backend/firestore');
    
    // Verify group exists
    const groupDoc = await db.collection('groups').doc(group_id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const groupData = groupDoc.data();
    
    // Verify requester is admin
    if (groupData.admin_id !== user_id) {
      return res.status(403).json({ error: 'Only the group admin can lock the cart.' });
    }

    // Get all items in cart
    const cartSnapshot = await db.collection('groups').doc(group_id).collection('cart').get();
    const items = cartSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (items.length === 0) return res.status(400).json({ error: 'Cart is empty!' });

    // Sum quantities by product_id
    const quantities = {};
    items.forEach(item => {
      quantities[item.product_id] = (quantities[item.product_id] || 0) + item.quantity;
    });

    // Fetch products to retrieve price_tiers and base weight
    const productPromises = Object.keys(quantities).map(async (pid) => {
      const doc = await db.collection('products').doc(pid).get();
      if (doc.exists) {
        const p = doc.data();
        const basePrice = parseFloat(p.price_zmw);
        const tiers = p.price_tiers && p.price_tiers.length > 0 ? p.price_tiers : [
          { min_qty: 1, price_zmw: basePrice },
          { min_qty: 3, price_zmw: Math.round(basePrice * 0.9) },
          { min_qty: 6, price_zmw: Math.round(basePrice * 0.8) }
        ];
        return { id: pid, tiers, basePrice, weight_kg: p.weight_kg || 0.5, is_local_stock: p.is_local_stock || false };
      }
      return null;
    });
    
    const productsData = await Promise.all(productPromises);
    const productMap = {};
    productsData.forEach(p => {
      if (p) productMap[p.id] = p;
    });

    // Calculate total weight and total goods cost
    let totalWeight = 0;
    let intlWeight = 0;
    let totalGoods = 0;
    
    // Calculate final price and sum weight for each item
    const itemPrices = {};
    items.forEach(item => {
      const prodInfo = productMap[item.product_id];
      if (prodInfo) {
        const totalQty = quantities[item.product_id];
        const basePrice = prodInfo.basePrice;
        let activePrice = basePrice;
        let bestTier = null;
        
        prodInfo.tiers.forEach(tier => {
          if (totalQty >= tier.min_qty) {
            if (!bestTier || tier.min_qty > bestTier.min_qty) {
              bestTier = tier;
            }
          }
        });
        
        if (bestTier) {
          activePrice = bestTier.price_zmw;
        }
        
        itemPrices[item.id] = activePrice;
        
        const itemWeight = (prodInfo.weight_kg || 0.5) * item.quantity;
        totalWeight += itemWeight;
        if (!prodInfo.is_local_stock) {
          intlWeight += itemWeight;
        }
        totalGoods += activePrice * item.quantity;
      }
    });

    // Calculate logistics (standard rates)
    const INTL_FREIGHT_RATE = 20; // ZMW per KG
    const localFreightRate = 20;  // Standard Lusaka Central Depot rate
    
    const intlFreight = intlWeight * INTL_FREIGHT_RATE;
    const localFreight = totalWeight * localFreightRate;
    const totalLogistics = intlFreight + localFreight;

    // Get all group members from user_groups mapping
    const membersSnap = await db.collection('user_groups').where('group_id', '==', group_id).get();
    const members = membersSnap.docs.map(doc => doc.data());

    // Calculate logistics share divided equally
    const logisticsShare = Number((totalLogistics / members.length).toFixed(2));

    // Clear existing contributions if any
    const existingContribs = await db.collection('group_contributions').where('group_id', '==', group_id).get();
    const deleteBatch = db.batch();
    existingContribs.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();

    // Create contribution records
    const contributionBatch = db.batch();
    for (const member of members) {
      let memberGoodsTotal = 0;
      items.forEach(item => {
        if (item.user_id === member.user_id) {
          const activePrice = itemPrices[item.id] || item.price_zmw;
          memberGoodsTotal += activePrice * item.quantity;
        }
      });

      const memberShareTotal = Number((memberGoodsTotal + logisticsShare).toFixed(2));

      // Fetch user profile name
      const userDoc = await db.collection('users').doc(member.user_id).get();
      const userName = userDoc.exists ? (userDoc.data().display_name || userDoc.data().name || member.user_id) : member.user_id;

      const contribRef = db.collection('group_contributions').doc();
      contributionBatch.set(contribRef, {
        group_id,
        user_id: member.user_id,
        user_name: userName,
        goods_amount_zmw: memberGoodsTotal,
        logistics_amount_zmw: logisticsShare,
        share_amount_zmw: memberShareTotal,
        payment_method: '',
        transaction_reference: '',
        status: 'PENDING',
        updated_at: new Date().toISOString()
      });
    }

    // Update group status to WAITING_FOR_CONTRIBUTIONS
    contributionBatch.update(groupDoc.ref, {
      status: 'WAITING_FOR_CONTRIBUTIONS',
      updated_at: new Date().toISOString()
    });

    await contributionBatch.commit();
    res.json({ success: true, message: 'Cart locked and split ledger initialized.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/groups/contributions/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    const { db } = require('./backend/firestore');
    
    // Get group info
    const groupDoc = await db.collection('groups').doc(group_id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const groupData = groupDoc.data();

    // Get admin phone number
    const adminDoc = await db.collection('users').doc(groupData.admin_id).get();
    const adminPhone = adminDoc.exists ? (adminDoc.data().phone_number || adminDoc.data().phone || '+260...') : '+260...';
    
    const snapshot = await db.collection('group_contributions').where('group_id', '==', group_id).get();
    const contributions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ 
      success: true,
      status: groupData.status,
      admin_id: groupData.admin_id,
      admin_phone: adminPhone,
      contributions 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/cart/contribute', async (req, res) => {
  try {
    const { group_id, user_id, payment_method, transaction_reference } = req.body;
    const { db } = require('./backend/firestore');

    const snapshot = await db.collection('group_contributions')
      .where('group_id', '==', group_id)
      .where('user_id', '==', user_id)
      .limit(1)
      .get();
      
    if (snapshot.empty) return res.status(404).json({ error: 'Contribution record not found.' });
    const contribDoc = snapshot.docs[0];
    const contribData = contribDoc.data();

    if (contribData.status === 'PAID') {
      return res.status(400).json({ error: 'You have already paid!' });
    }

    if (payment_method === 'WALLET') {
      const userRef = db.collection('users').doc(user_id);
      const userDoc = await userRef.get();
      const currentBalance = userDoc.exists ? (userDoc.data().wallet_balance || 0) : 0;
      
      if (currentBalance < contribData.share_amount_zmw) {
        return res.status(400).json({ error: 'Insufficient wallet balance. Please top up.' });
      }

      const batch = db.batch();
      batch.update(userRef, { wallet_balance: currentBalance - contribData.share_amount_zmw });
      batch.update(contribDoc.ref, { 
        status: 'PAID',
        payment_method: 'WALLET',
        updated_at: new Date().toISOString()
      });
      await batch.commit();
      
      await checkAndCompleteGroupOrder(group_id);
      
      return res.json({ success: true, status: 'PAID' });
    } else if (payment_method === 'MOBILE_MONEY_OFFLINE') {
      if (!transaction_reference) return res.status(400).json({ error: 'Transaction reference is required.' });
      
      await contribDoc.ref.update({
        status: 'SUBMITTED',
        payment_method: 'MOBILE_MONEY_OFFLINE',
        transaction_reference,
        updated_at: new Date().toISOString()
      });
      
      return res.json({ success: true, status: 'SUBMITTED' });
    } else if (payment_method === 'LENCO_MOBILE_MONEY') {
      const ref = transaction_reference || 'LENCO-CONTR-' + Math.floor(Math.random() * 100000);
      
      await contribDoc.ref.update({
        status: 'PENDING',
        payment_method: 'LENCO_MOBILE_MONEY',
        transaction_reference: ref,
        updated_at: new Date().toISOString()
      });
      
      return res.json({ success: true, status: 'PENDING', reference: ref });
    } else {
      return res.status(400).json({ error: 'Invalid payment method.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/groups/approve-contribution', async (req, res) => {
  try {
    const { group_id, contribution_id, admin_id } = req.body;
    const { db } = require('./backend/firestore');

    const groupDoc = await db.collection('groups').doc(group_id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    if (groupDoc.data().admin_id !== admin_id) {
      return res.status(403).json({ error: 'Only the group admin can approve contributions.' });
    }

    const contribRef = db.collection('group_contributions').doc(contribution_id);
    await contribRef.update({
      status: 'PAID',
      updated_at: new Date().toISOString()
    });

    await checkAndCompleteGroupOrder(group_id);

    res.json({ success: true, message: 'Contribution approved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/groups/messages/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    const { db } = require('./backend/firestore');
    
    const messagesSnap = await db.collection('group_messages')
      .where('group_id', '==', group_id)
      .get();
      
    const messages = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort in memory to avoid composite index requirement
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/groups/messages/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id, user_name, message_type, content } = req.body;
    const { db } = require('./backend/firestore');

    if (!user_id || !user_name || !content || !message_type) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const docRef = await db.collection('group_messages').add({
      group_id,
      user_id,
      user_name,
      message_type,
      content,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, message_id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/join', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'join.html'));
});

app.get('/flyer', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'flyer.html'));
});

// Catch-all for SPA
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Chilimba Backend Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;
