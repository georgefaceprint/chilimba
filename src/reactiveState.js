import { AntigravityStore } from 'antigravity-core';

// Initialize connection to your reactive state database
const store = new AntigravityStore({
  endpoint: 'wss://api.your-chilimba-pwa.app/sync'
});

/**
 * Listens to Lenco Webhook updates in real-time
 * @param {string} userId - The active logged-in user
 */
export function subscribeToPaymentStatus(userId) {
  const transactionSubscription = store
    .table('Lenco_Transactions')
    // Note: If using strict SQL from earlier, this might filter via order_id or require a join on backend
    .filter({ user_id: userId, status: 'PENDING' })
    .onUpdate((updatedTransaction) => {
      if (updatedTransaction.status === 'SUCCESSFUL') {
        // Play a success sound asset
        const audio = new Audio('/assets/sounds/payment-success.mp3');
        audio.play().catch(e => console.log('Audio blocked by browser'));

        // Dynamically update UI state modal
        showPaymentSuccessModal(updatedTransaction.amount_zmw);
        
        // Unsubscribe from this specific item transaction listener
        transactionSubscription.unsubscribe();
      } else if (updatedTransaction.status === 'FAILED') {
        showPaymentFailureScreen(updatedTransaction.error_reason || 'Transaction timed out');
      }
    });
}

export function showPaymentSuccessModal(amount) {
  const modal = document.getElementById('payment-modal');
  if (!modal) return;
  modal.className = "modal status-success active";
  modal.innerHTML = `
    <div class="modal-content glass p-6 rounded-xl text-center">
      <div class="success-icon text-4xl mb-4">✅</div>
      <h3 class="text-2xl font-bold text-green-600 mb-2">Payment Received!</h3>
      <p class="text-gray-700">Your contribution of <b>K${amount}</b> has been locked into the Chilimba pool securely.</p>
    </div>
  `;
}

export function showPaymentFailureScreen(reason) {
  const modal = document.getElementById('payment-modal');
  if (!modal) return;
  modal.className = "modal status-error active";
  modal.innerHTML = `
    <div class="modal-content glass p-6 rounded-xl text-center border border-red-500">
      <div class="error-icon text-4xl mb-4">❌</div>
      <h3 class="text-2xl font-bold text-red-600 mb-2">Payment Failed</h3>
      <p class="text-gray-700">${reason}</p>
    </div>
  `;
}
