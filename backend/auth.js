const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('./firestore'); 
const { getAuth } = require('firebase-admin/auth'); // Needed to verify Firebase Client tokens

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

// Live Meta WhatsApp API Integration (KEPT FOR RECEIPTS/NOTIFICATIONS)
const sendWhatsAppMessage = async (phone, message) => {
  console.log(`[WhatsApp API] Preparing to send to ${phone}...`);
  
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  if (!token || !phoneId) {
    console.warn("⚠️ WhatsApp credentials missing in environment. Falling back to console log for testing.");
    console.log(`\n=================================\n📱 TO: ${phone}\n✉️ MSG: ${message}\n=================================\n`);
    return { success: false, fallbackMode: true };
  }
  
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
      return { success: false, fallbackMode: true, errorDetails: data };
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
 */
async function handleGoogleAuthCallback(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: google_id } = payload;

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('google_id', '==', google_id).limit(1).get();
    
    let user;
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      user = { user_id: userDoc.id, ...userDoc.data() };
    } else {
      // Fallback: check by email if google_id isn't linked yet
      const emailSnap = await usersRef.where('email', '==', email).limit(1).get();
      if (!emailSnap.empty) {
        const userDoc = emailSnap.docs[0];
        await usersRef.doc(userDoc.id).update({ google_id });
        user = { user_id: userDoc.id, ...userDoc.data(), google_id };
      } else {
        // Create new user
        const newUser = {
          google_id,
          email: email || '',
          display_name: name || 'User',
          avatar_url: picture || '',
          role: 'BUYER',
          account_status: 'PENDING_ONBOARDING',
          is_phone_verified: false,
          created_at: new Date().toISOString()
        };
        const docRef = await usersRef.add(newUser);
        user = { user_id: docRef.id, ...newUser };
      }
    }

    if (user.account_status !== 'ACTIVE' || !user.is_phone_verified) {
      const sessionToken = generateSessionToken(user);
      res.cookie('auth_token', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ 
        success: true, 
        action: 'REQUIRE_ONBOARDING',
        userId: user.user_id,
        message: 'Please link your phone number and set a passcode to continue.',
        token: sessionToken
      });
    }
    
    // User is fully authenticated and ACTIVE
    const sessionToken = generateSessionToken(user);
    res.cookie('auth_token', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(200).json({ 
      success: true, 
      action: 'AUTHENTICATED', 
      user,
      token: sessionToken
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Authentication failed.' });
  }
}

/**
 * 2. Verify Phone & Set Passcode (Onboarding Step 2)
 */
async function verifyPhoneAndSetPasscode(req, res) {
  try {
    const { firebaseIdToken, passcode, profileData } = req.body;
    // We get userId from the secure cookie we just set during Google Login
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized: missing auth cookie' });
    
    const decodedSession = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const userId = decodedSession.user_id;

    if (!firebaseIdToken || !passcode || passcode.length < 5) {
      return res.status(400).json({ success: false, error: 'Missing token or invalid passcode' });
    }

    // Verify Firebase ID Token to confirm phone number
    const decodedFirebaseToken = await getAuth().verifyIdToken(firebaseIdToken);
    const phoneNumber = decodedFirebaseToken.phone_number;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number not found in Firebase token' });
    }

    // Hash the Passcode using sha256 to match legacy
    const saltStr = 'chilimba_agent_salt_2026';
    const passcodeHash = crypto.createHash('sha256').update(saltStr + passcode).digest('hex');

    // Update the user
    const updatePayload = {
      phone_number: phoneNumber,
      passcode_hash: passcodeHash,
      is_phone_verified: true,
      account_status: 'ACTIVE'
    };

    if (profileData) {
      updatePayload.first_name = profileData.firstName || '';
      updatePayload.surname = profileData.surname || '';
      updatePayload.country = profileData.country || '';
      updatePayload.province = profileData.province || '';
      updatePayload.town = profileData.town || '';
    }

    await db.collection('users').doc(userId).update(updatePayload);

    const userDoc = await db.collection('users').doc(userId).get();
    const updatedUser = { user_id: userId, ...userDoc.data() };

    // Issue updated session token
    const newSessionToken = generateSessionToken(updatedUser);
    res.cookie('auth_token', newSessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({
      success: true,
      message: 'Phone verified and passcode set successfully.',
      user: updatedUser,
      token: newSessionToken
    });

  } catch (error) {
    console.error('Verify Phone Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify phone or set passcode.' });
  }
}

/**
 * 3. Passcode Sign In (Fast Login)
 */
async function loginWithPasscode(req, res) {
  try {
    const passcode = req.body.passcode;
    const phoneNumber = req.body.phoneNumber || req.body.phone;
    
    if (!phoneNumber || !passcode) {
      return res.status(400).json({ success: false, error: 'Phone number and passcode required' });
    }

    // Format phone just in case (ensure starts with +)
    let formattedPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone_number', '==', formattedPhone).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No account found with this phone number.' });
    }

    const userDoc = snapshot.docs[0];
    const user = { user_id: userDoc.id, ...userDoc.data() };

    if (!user.passcode_hash) {
      return res.status(400).json({ success: false, error: 'Please sign in with Google to set up your passcode first.' });
    }

    // Compare passcode using sha256
    const saltStr = 'chilimba_agent_salt_2026';
    const inputHash = crypto.createHash('sha256').update(saltStr + passcode).digest('hex');
    const isMatch = (inputHash === user.passcode_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect passcode.' });
    }

    if (user.account_status !== 'ACTIVE') {
       return res.status(403).json({ success: false, error: 'Account is pending onboarding. Please sign in with Google to complete setup.' });
    }

    // Success!
    const sessionToken = generateSessionToken(user);
    res.cookie('auth_token', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    res.status(200).json({ 
      success: true, 
      action: 'AUTHENTICATED', 
      user,
      token: sessionToken
    });

  } catch (error) {
    console.error('Passcode Login Error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
}

// Real token generator
function generateSessionToken(user) {
  return jwt.sign({ 
    user_id: user.user_id, 
    phone: user.phone_number, 
    name: user.display_name, 
    avatar: user.avatar_url,
    role: user.role,
    account_status: user.account_status 
  }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
}

const requireAuth = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = { uid: decoded.user_id, ...decoded };
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

const setNewPasscode = async (req, res) => {
  try {
    const { passcode } = req.body;
    if (!passcode || passcode.length < 5) {
      return res.status(400).json({ success: false, error: 'Passcode must be at least 5 digits.' });
    }
    const saltStr = 'chilimba_agent_salt_2026';
    const passcodeHash = crypto.createHash('sha256').update(saltStr + passcode).digest('hex');
    
    await db.collection('users').doc(req.user.uid).update({
      passcode_hash: passcodeHash
    });
    
    res.json({ success: true, message: 'Passcode updated successfully.' });
  } catch (error) {
    console.error('Set Passcode Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update passcode.' });
  }
};

module.exports = {
  requireAuth,
  handleGoogleAuthCallback,
  verifyPhoneAndSetPasscode,
  loginWithPasscode,
  setNewPasscode,
  sendWhatsAppMessage
};
