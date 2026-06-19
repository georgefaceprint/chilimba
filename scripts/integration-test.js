const axios = require('axios');

const BASE_URL = 'https://your-chilimba-pwa.app';
const TEST_WEBHOOK_SECRET = 'lenco_secure_webhook_secret_key';

async function runEndToEndIntegrationTest() {
  console.log('🏁 Starting Chilimba Cross-Border Integration Test...\n');

  // Simulated IDs generated out of seed database rows
  const mockOrderId = 'f3b14a2c-d6b3-4611-b0e2-892147fbcde3';
  const mockLencoRef = 'CHIL-TEST-' + Math.floor(Math.random() * 100000);

  try {
    // STEP 1: Simulate the Lenco Mobile Money payment callback hitting your webhook
    console.log(`[Step 1] Simulating successful Lenco payment for ref: ${mockLencoRef}...`);
    const webhookPayload = {
      event: 'transaction.success',
      data: {
        reference: mockLencoRef,
        amount: 1450.00,
        currency: 'ZMW',
        status: 'SUCCESSFUL',
        meta: { order_id: mockOrderId }
      }
    };

    const webhookRes = await axios.post(`${BASE_URL}/payments/lenco-callback`, webhookPayload, {
      headers: { 'X-Lenco-Signature': TEST_WEBHOOK_SECRET }
    });
    console.log('👉 Webhook Response Received:', webhookRes.data.message);


    // STEP 2: Verify order has been initialized in Logistics Tracking as 'PAYMENT_RECEIVED'
    console.log('\n[Step 2] Fetching active customer tracking record status...');
    const trackingRes = await axios.get(`${BASE_URL}/tracking/order/${mockOrderId}`);
    console.log('👉 Real-Time Database Tracking Status:', trackingRes.data.current_status); // Expected: PAYMENT_RECEIVED


    // STEP 3: Simulate international supplier updating item dispatch state
    console.log('\n[Step 3] Simulating Tanzanian Supplier marking goods as packed and ready...');
    const supplierRes = await axios.put(`${BASE_URL}/tracking/dispatch`, {
      order_id: mockOrderId,
      status: 'READY_FOR_DISPATCH',
      location: 'Dar es Salaam Central Warehouse'
    }, {
      headers: { 'Authorization': 'Bearer MOCK_SUPPLIER_JWT_TOKEN' }
    });
    console.log('👉 Supplier Response:', supplierRes.data.message);


    // STEP 4: Simulate cross-border transit update via shipping runner
    console.log('\n[Step 4] Simulating Freight Runner clearing customs at Tunduma Border...');
    const runnerRes = await axios.put(`${BASE_URL}/tracking/border`, {
      order_id: mockOrderId,
      status: 'LOADED_FOR_TRANSIT',
      location: 'Tunduma Border Post Post-Clearance'
    }, {
      headers: { 'Authorization': 'Bearer MOCK_RUNNER_JWT_TOKEN' }
    });
    console.log('👉 Transit Runner Response:', runnerRes.data.message);


    // STEP 5: Simulate container arriving at the final town hub depot
    console.log('\n[Step 5] Simulating arrival at local hub depot...');
    const depotArrivalRes = await axios.put(`${BASE_URL}/tracking/depot-arrival`, {
      order_id: mockOrderId,
      status: 'ARRIVED_AT_DEPOT',
      depot_town: 'KASUMBALESA'
    }, {
      headers: { 'Authorization': 'Bearer MOCK_SUPER_ADMIN_JWT_TOKEN' }
    });
    console.log('👉 Depot Notification Response:', depotArrivalRes.data.message);
    const printedOtp = depotArrivalRes.data.generated_otp; 
    console.log(`✨ Secure customer pickup OTP broadcasted via WhatsApp: [ ${printedOtp} ]`);


    // STEP 6: Depot manager scans and clears the order
    console.log('\n[Step 6] Simulating user arriving at Kasumbalesa Depot and providing OTP...');
    const checkoutRes = await axios.put(`${BASE_URL}/tracking/release`, {
      otp_code: printedOtp
    }, {
      headers: { 'Authorization': 'Bearer MOCK_DEPOT_MANAGER_JWT_TOKEN' }
    });
    console.log('👉 Depot Release Confirmation:', checkoutRes.data.message); // Expected: CLOSED
    console.log('\n🎉 End-to-end integration test run successfully completed.');

  } catch (error) {
    console.error('\n❌ Integration pipeline failure detected:', error.response ? error.response.data : error.message);
  }
}

runEndToEndIntegrationTest();
