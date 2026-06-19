const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db'); 

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

// Live Meta WhatsApp API Integration
const sendWhatsAppMessage = async (phone, message) => {
  console.log(`[WhatsApp API] Sending to ${phone}...`);
  
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  if (!token || !phoneId) {
    console.warn("WhatsApp credentials missing in environment. Skipping message push.");
    return;
  }
  
  // Format phone number (Meta requires no '+' symbol)
  const formattedPhone = phone.replace('+', '').replace(/\s+/g, '').trim();
  
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message }
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error("[WhatsApp API Error]", data);
    } else {
      console.log("[WhatsApp API Success] Message Dispatched.");
    }
  } catch (err) {
    console.error("[WhatsApp API Request Failed]", err);
  }
};

/**
 * 1. Google OAuth Callback Handler
 * Handles the Google Sign-In redirect, extracting user info.
 */
async function handleGoogleAuthCallback(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    // Verify the Google ID token securely
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    const userResult = await db.query('SELECT * FROM Users WHERE email = $1', [email]);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (!user.phone_number) {
        // User exists but hasn't linked WhatsApp yet
        return res.status(200).json({ 
          success: true, 
          action: 'REQUIRE_WHATSAPP_LINK',
          userId: user.user_id,
          message: 'Please link your WhatsApp number to continue.' 
        });
      }
      
      // User is fully authenticated
      const token = generateSessionToken(user);
      res.cookie('auth_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ 
        success: true, 
        action: 'AUTHENTICATED', 
        user,
        token
      });
    } else {
      // User does not exist, create a partial profile
      const insertResult = await db.query(
        'INSERT INTO Users (email, display_name, avatar_url) VALUES ($1, $2, $3) RETURNING user_id',
        [email, name, picture]
      );
      
      const newUserId = insertResult.rows[0].user_id;
      
      return res.status(201).json({
        success: true,
        action: 'REQUIRE_WHATSAPP_LINK',
        userId: newUserId,
        message: 'Account created. Please link your WhatsApp number to complete registration.'
      });
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
}

/**
 * 2. Initiate WhatsApp Number Verification
 * Generates OTP and sends it via WhatsApp.
 */
async function initiateWhatsAppVerification(req, res) {
  try {
    const { userId, phoneNumber } = req.body;
    
    if (!phoneNumber || !phoneNumber.startsWith('+260')) {
      return res.status(400).json({ success: false, error: 'Valid Zambian WhatsApp number required (+260...).' });
    }

    // Check if phone number is already registered to another user
    const phoneCheck = await db.query('SELECT user_id FROM Users WHERE phone_number = $1', [phoneNumber]);
    if (phoneCheck.rows.length > 0 && phoneCheck.rows[0].user_id !== userId) {
      return res.status(409).json({ success: false, error: 'This phone number is already linked to another account.' });
    }

    // Generate secure 6-digit code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database (Assuming an `otps` table exists or using a Redis cache)
    await db.query(
      `INSERT INTO otps (user_id, phone_number, code, expires) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id) DO UPDATE 
       SET phone_number = EXCLUDED.phone_number, code = EXCLUDED.code, expires = EXCLUDED.expires`,
      [userId, phoneNumber, otpCode, expiresAt]
    );

    // Send the WhatsApp template message
    await sendWhatsAppMessage(phoneNumber, `Your Chilimba App verification code is: ${otpCode}`);

    res.status(200).json({ success: true, message: 'Verification code sent via WhatsApp.' });
  } catch (error) {
    console.error('WhatsApp OTP Initiation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification code.' });
  }
}

/**
 * 3. Verify WhatsApp OTP and Link Account
 * Validates the OTP and updates the User's phone_number.
 */
async function verifyWhatsAppOTP(req, res) {
  try {
    const { userId, inputOtp, userProvidedPhone } = req.body;

    const otpResult = await db.query('SELECT code, expires FROM otps WHERE user_id = $1 AND phone_number = $2', [userId, userProvidedPhone]);
    
    if (otpResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No active verification session found.' });
    }

    const activeOtpRow = otpResult.rows[0];

    if (new Date() > activeOtpRow.expires) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (activeOtpRow.code !== inputOtp) {
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }

    // OTP is valid. Link the phone number to the user profile
    await db.query('UPDATE Users SET phone_number = $1 WHERE user_id = $2', [userProvidedPhone, userId]);
    
    // Clear the used OTP
    await db.query('DELETE FROM otps WHERE user_id = $1', [userId]);

    // Fetch full updated user to issue final token
    const userResult = await db.query('SELECT * FROM Users WHERE user_id = $1', [userId]);
    const updatedUser = userResult.rows[0];

    const token = generateSessionToken(updatedUser);
    res.cookie('auth_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ 
      success: true, 
      message: 'WhatsApp identity verified and linked successfully.',
      user: updatedUser,
      token
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP.' });
  }
}

// Real token generator
function generateSessionToken(user) {
  return jwt.sign({ user_id: user.user_id, phone: user.phone_number, name: user.display_name, avatar: user.avatar_url }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
}

module.exports = {
  handleGoogleAuthCallback,
  initiateWhatsAppVerification,
  verifyWhatsAppOTP
};
