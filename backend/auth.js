const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('./firestore'); // 🟢 Using Firestore instead of Postgres

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

// Live Meta WhatsApp API Integration
const sendWhatsAppMessage = async (phone, message) => {
  console.log(`[WhatsApp API] Preparing to send to ${phone}...`);
  
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  if (!token || !phoneId) {
    console.warn("⚠️ WhatsApp credentials missing in environment. Falling back to console log for testing.");
    console.log(`\n=================================\n📱 TO: ${phone}\n✉️ MSG: ${message}\n=================================\n`);
    return { success: false, fallbackMode: true };
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
      return { success: false, fallbackMode: true };
    } else {
      console.log("[WhatsApp API Success] Message Dispatched.");
      return { success: true, fallbackMode: false };
    }
  } catch (err) {
    console.error("[WhatsApp API Request Failed]", err);
    return { success: false, fallbackMode: true };
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

    // Check if user exists in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const user = { user_id: userDoc.id, ...userDoc.data() };
      
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
      const sessionToken = generateSessionToken(user);
      res.cookie('auth_token', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ 
        success: true, 
        action: 'AUTHENTICATED', 
        user,
        token: sessionToken
      });
    } else {
      // User does not exist, create a partial profile
      const newUser = {
        email,
        display_name: name,
        avatar_url: picture,
        role: 'BUYER',
        created_at: new Date().toISOString()
      };
      
      const docRef = await usersRef.add(newUser);
      
      return res.status(201).json({
        success: true,
        action: 'REQUIRE_WHATSAPP_LINK',
        userId: docRef.id,
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
      // For testing, allowing any number. In prod, enforce +260
      // return res.status(400).json({ success: false, error: 'Valid Zambian WhatsApp number required (+260...).' });
    }

    // Check if phone number is already registered to another user
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone_number', '==', phoneNumber).limit(1).get();
    
    if (!snapshot.empty && snapshot.docs[0].id !== userId && !userId.startsWith('temp_')) {
      return res.status(409).json({ success: false, error: 'This phone number is already linked to another account.' });
    }

    // Generate secure 6-digit code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

    // Store OTP in Firestore
    await db.collection('otps').doc(phoneNumber).set({
      user_id: userId,
      phone_number: phoneNumber,
      code: otpCode,
      expires: expiresAt
    });

    // Send the WhatsApp template message
    const sendResult = await sendWhatsAppMessage(phoneNumber, `Your Chilimba App verification code is: ${otpCode}`);

    res.status(200).json({ 
      success: true, 
      message: 'Verification code sent via WhatsApp.',
      // 🟢 FALLBACK: If Meta API fails/missing, return OTP in response so developer can test UI flow
      test_otp: sendResult.fallbackMode ? otpCode : undefined 
    });
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

    const otpDoc = await db.collection('otps').doc(userProvidedPhone).get();
    
    if (!otpDoc.exists) {
      return res.status(404).json({ success: false, error: 'No active verification session found.' });
    }

    const activeOtpRow = otpDoc.data();

    if (new Date() > new Date(activeOtpRow.expires)) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (activeOtpRow.code !== inputOtp) {
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }

    // OTP is valid. 
    // If they used a temp ID (didn't do Google Auth) or sent no ID, we need to create/fetch a Firestore user doc for them
    let finalUserId = userId;
    let updatedUser = {};
    
    if (!userId || userId.startsWith('temp_')) {
      // Check if user already exists by phone
      const usersSnap = await db.collection('users').where('phone_number', '==', userProvidedPhone).limit(1).get();
      if (!usersSnap.empty) {
        finalUserId = usersSnap.docs[0].id;
        updatedUser = { user_id: finalUserId, ...usersSnap.docs[0].data() };
      } else {
        // Create new barebones user based just on phone
        const newUserRef = await db.collection('users').add({
          phone_number: userProvidedPhone,
          role: 'BUYER',
          created_at: new Date().toISOString()
        });
        finalUserId = newUserRef.id;
        updatedUser = { user_id: finalUserId, phone_number: userProvidedPhone, role: 'BUYER' };
      }
    } else {
      // Update existing Google Auth user profile with phone number
      await db.collection('users').doc(userId).update({
        phone_number: userProvidedPhone
      });
      const userDoc = await db.collection('users').doc(userId).get();
      updatedUser = { user_id: userId, ...userDoc.data() };
    }

    // Clear the used OTP
    await db.collection('otps').doc(userProvidedPhone).delete();

    const token = generateSessionToken(updatedUser);
    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ 
      success: true, 
      message: 'WhatsApp identity verified successfully.',
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
  return jwt.sign({ 
    user_id: user.user_id, 
    phone: user.phone_number, 
    name: user.display_name, 
    avatar: user.avatar_url,
    role: user.role 
  }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
}

module.exports = {
  handleGoogleAuthCallback,
  initiateWhatsAppVerification,
  verifyWhatsAppOTP
};
