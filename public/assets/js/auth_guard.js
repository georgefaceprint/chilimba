// This file is used to guard protected pages.
async function requireAuth() {
  try {
    const res = await fetch('/api/v1/auth/me');
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    if (!data.authenticated) {
      throw new Error('Not authenticated');
    }
    
    // Strict Onboarding Gate
    if (data.user.account_status === 'PENDING_ONBOARDING') {
      if (!window.location.pathname.includes('kyc-setup.html')) {
        window.location.href = '/kyc-setup.html?onboarding=true';
        return new Promise(() => {}); // Stop execution
      }
    }
    
    // Auth is valid. Return the user payload.
    return data.user;
  } catch (err) {
    console.warn('Authentication guard check failed:', err.message);
    // Redirect to signup if not authenticated
    if (!window.location.pathname.includes('signup.html')) {
      window.location.href = '/signup.html';
    }
    return null;
  }
}

window.logoutUser = async function() {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    window.location.href = '/signup.html';
  } catch (err) {
    console.error('Logout failed', err);
  }
};
