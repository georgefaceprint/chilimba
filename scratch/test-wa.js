// We define the function here to avoid dragging in Firebase/DB dependencies from auth.js
// since we just want to test the raw API call.
const sendWhatsAppMessage = async (phone, message) => {
  console.log(`[WhatsApp API] Preparing to send to ${phone}...`);
  
  // HARDCODED FOR TEST
  const token = "EAAQZAXsJvUOQBRZCBjsFDNB66JWVEf1IGHfILQe07Odf0gD477CUJxvOH0ZBK84ka2WEA61atOt8eef7StvXrxMInpM9ne7R4FQJ622HVtnqwOH9odXjMCPZCTLeJeVwA1sfi5y25m563tVWuDOJiW6UpDgZB3QjQYGpVrbSuz3vQtPP18NPpckbayMdFiTZBuir0Qw7ncbT6Imb8PGxSlscWI66t6ocMlpICf75gvE4MF8ZCQruNPiobBAh3RTZA7Ft47da6LFu4mhyFrSMj2v8jh0f";
  const phoneId = "586850261177352";
  
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
      console.error("[WhatsApp Error]", JSON.stringify(data, null, 2));
      return { success: false, error: data.error };
    }
    
    console.log("[WhatsApp Success]", JSON.stringify(data, null, 2));
    return { success: true, data };
  } catch (error) {
    console.error("[WhatsApp Catch Error]", error.message);
    return { success: false, error: error.message };
  }
};

(async () => {
  const msg = `✅ *Test Successful!*\n\nYour WhatsApp integration for Chilimba is configured and officially working.\n\nTime: ${new Date().toLocaleTimeString()}`;
  await sendWhatsAppMessage('+255682774718', msg);
})();
