require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Import Controllers and Middleware
const authController = require('./backend/auth');
const paymentsController = require('./backend/payments');
const { authorizeRoute, ROLES } = require('./backend/rbac');
const db = require('./backend/db');

const app = express();
app.use(express.static('public'));

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// --- ROUTES ---

// 1. Authentication Routes
app.post('/api/v1/auth/google/callback', authController.handleGoogleAuthCallback);
app.post('/api/v1/auth/whatsapp/initiate', authController.initiateWhatsAppVerification);
app.post('/api/v1/auth/whatsapp/verify', authController.verifyWhatsAppOTP);

app.get('/api/v1/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// 2. Payment Routes
app.post('/api/v1/payments/initiate', paymentsController.initiateMobileMoneyPayment);
app.post('/api/v1/payments/lenco-callback', paymentsController.handleLencoCallback);
app.post('/payments/lenco-callback', paymentsController.handleLencoCallback); // Fallback for the integration test script

// 3. Catalog Routes
app.get('/api/v1/products', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        product_id,
        supplier_name,
        origin_country,
        title,
        description,
        price_zmw,
        image_urls,
        weight_kg
      FROM Products
      ORDER BY title ASC
    `);
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('[Products API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Tracking/Logistics Routes 
// (Hooking up endpoints mapped from the integration script to our DB)

app.get('/tracking/order/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT current_status FROM Logistics_Tracking WHERE order_id = $1', [req.params.id]);
    res.json(result.rows[0] || { current_status: 'UNKNOWN' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tracking/dispatch', async (req, res) => {
  try {
    // Note: Add authorizeRoute([ROLES.SUPPLIER, ROLES.SUPER_ADMIN]) in production
    await db.query(`UPDATE Logistics_Tracking SET current_status = 'READY_FOR_DISPATCH', current_location = $2 WHERE order_id = $1`, 
      [req.body.order_id, req.body.location]
    );
    res.json({ message: 'Dispatch status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tracking/border', async (req, res) => {
  try {
    await db.query(`UPDATE Logistics_Tracking SET current_status = 'LOADED_FOR_TRANSIT', current_location = $2 WHERE order_id = $1`, 
      [req.body.order_id, req.body.location]
    );
    res.json({ message: 'Border transit status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tracking/depot-arrival', async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate random 6-digit OTP
    await db.query(`UPDATE Logistics_Tracking SET current_status = 'ARRIVED_AT_DEPOT', depot_town = $2, depot_pickup_otp = $3 WHERE order_id = $1`, 
      [req.body.order_id, req.body.depot_town, otp]
    );
    res.json({ message: 'Depot arrival logged successfully', generated_otp: otp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tracking/release', async (req, res) => {
  try {
    await db.query(`UPDATE Logistics_Tracking SET current_status = 'CLOSED' WHERE depot_pickup_otp = $1`, 
      [req.body.otp_code]
    );
    res.json({ message: 'Order verified, collected and closed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
