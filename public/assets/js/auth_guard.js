// This file is used to guard protected pages.
async function requireAuth() {
  try {
    const res = await fetch('/api/v1/auth/me');
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    if (!data.authenticated) {
      throw new Error('Not authenticated');
    }
    // Auth is valid. Return the user payload.
    return data.user;
  } catch (err) {
    // Redirect to signup if not authenticated
    window.location.href = '/signup.html';
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
