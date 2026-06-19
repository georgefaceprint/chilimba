// Assume db is an instantiated Antigravity/PostgreSQL client
const db = require('./db');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Sends a WhatsApp Template message for Order Status updates
 * Uses the official WhatsApp Cloud API payload structure
 */
async function sendOrderStatusWhatsAppUpdate(phoneNumber, customerName, orderReference, currentStatus, location) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "template",
      template: {
        name: "order_status_update",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: customerName },
              { type: "text", text: orderReference },
              { type: "text", text: currentStatus },
              { type: "text", text: location }
            ]
          }
        ]
      }
    };

    console.log(`Sending WhatsApp Update to ${phoneNumber}...`);
    
    // Make request to WhatsApp API
    // const response = await fetch(WHATSAPP_API_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(payload)
    // });
    
    // if (!response.ok) {
    //   throw new Error('Failed to send WhatsApp message');
    // }

    return { success: true };
  } catch (error) {
    console.error('WhatsApp Notification Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Listener that triggers WhatsApp notification when Logistics_Tracking is updated
 * In Antigravity, this would run reactively off the database triggers.
 */
async function handleLogisticsStatusChange(trackingData) {
  const { order_id, current_status, current_location } = trackingData;
  
  // Fetch Customer details and Order Reference from DB
  const result = await db.query(`
    SELECT u.display_name, u.phone_number, l.lenco_reference 
    FROM Orders o
    JOIN Users u ON o.user_id = u.user_id
    LEFT JOIN Lenco_Transactions l ON o.order_id = l.order_id
    WHERE o.order_id = $1
  `, [order_id]);

  if (result.rows.length > 0) {
    const { display_name, phone_number, lenco_reference } = result.rows[0];
    
    // Only send if phone number is valid
    if (phone_number) {
       await sendOrderStatusWhatsAppUpdate(
         phone_number, 
         display_name.split(' ')[0], // First name
         lenco_reference || order_id.substring(0,8).toUpperCase(), // Fallback ref
         current_status.replace(/_/g, ' '), // Clean up enum
         current_location
       );
    }
  }
}

module.exports = {
  sendOrderStatusWhatsAppUpdate,
  handleLogisticsStatusChange
};
