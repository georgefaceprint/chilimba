const fs = require('fs');
const path = require('path');

const navTemplate = `
  <!-- BOTTOM NAVIGATION BAR (Unified) -->
  <nav class="fixed bottom-0 w-full bg-white border-t border-gray-100 z-50 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] rounded-t-2xl">
    <div class="max-w-md mx-auto flex justify-around items-center h-[65px]">
      
      <!-- Home -->
      <a href="/" class="flex flex-col items-center gap-1 {{HOME_ACTIVE_CLASS}} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="{{HOME_FILL}}" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M11.47 3.84a.75.75 0 011.06 0l8.99 8.99a.75.75 0 11-1.06 1.06L12 5.44 3.53 13.89a.75.75 0 11-1.06-1.06l8.99-8.99z"></path><path d="M12 5.44l-8.47 8.45a.75.75 0 00-.22.53v6.83c0 .96.78 1.75 1.75 1.75h13.88c.97 0 1.75-.79 1.75-1.75v-6.83a.75.75 0 00-.22-.53L12 5.44z"></path></svg>
        <span class="text-[9px] font-bold">Home</span>
        {{HOME_DOT}}
      </a>
      
      <!-- Groups -->
      <a href="/dashboard.html" class="flex flex-col items-center gap-1 {{GROUPS_ACTIVE_CLASS}} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="{{GROUPS_FILL}}" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        <span class="text-[9px] font-bold">Groups</span>
        {{GROUPS_DOT}}
      </a>
      
      <!-- Cart -->
      <a id="nav-cart-link" href="/group-cart.html" class="flex flex-col items-center gap-1 {{CART_ACTIVE_CLASS}} w-14 relative transition-colors btn-press">
        <div class="relative">
          <svg class="w-6 h-6" fill="{{CART_FILL}}" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm" id="nav-cart-badge"></span>
        </div>
        <span class="text-[9px] font-bold">Cart</span>
        {{CART_DOT}}
      </a>
      
      <!-- Agent -->
      <a href="/vendor-dashboard.html" class="flex flex-col items-center gap-1 {{VENDOR_ACTIVE_CLASS}} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="{{VENDOR_FILL}}" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        <span class="text-[9px] font-bold">Agent</span>
        {{VENDOR_DOT}}
      </a>

      <!-- Profile -->
      <a href="/kyc-setup.html?returnTo=/dashboard.html" class="flex flex-col items-center gap-1 {{PROFILE_ACTIVE_CLASS}} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="{{PROFILE_FILL}}" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        <span class="text-[9px] font-bold">Profile</span>
        {{PROFILE_DOT}}
      </a>
      
    </div>
    <script>
      async function updateGlobalCartBadge() {
        try {
          const authRes = await fetch('/api/v1/auth/me');
          if(!authRes.ok) return;
          const authData = await authRes.json();
          if(!authData.authenticated) return;
          
          let groupId = localStorage.getItem('activeGroupId');
          if (!groupId) groupId = 'PERSONAL_' + authData.user.user_id;
          
          const cartRes = await fetch('/api/v1/cart/' + groupId + '?user_id=' + authData.user.user_id);
          if(cartRes.ok) {
            const cartData = await cartRes.json();
            const badge = document.getElementById('nav-cart-badge');
            if (badge) {
              const count = (cartData.items || []).length;
              badge.innerText = count > 0 ? count : '';
              badge.style.display = count > 0 ? 'flex' : 'none';
            }
          }
        } catch(e) {}
      }
      // Update badge on load
      updateGlobalCartBadge();
      // Also listen for custom event in case items are added on the same page
      window.addEventListener('cart-updated', updateGlobalCartBadge);

      // Agent Add Product FAB & Cart hiding
      async function checkAgentFAB() {
        try {
          const authRes = await fetch('/api/v1/auth/me');
          if(!authRes.ok) return;
          const authData = await authRes.json();
          if(authData.authenticated && (authData.user.role === 'AGENT' || authData.user.role === 'SUPER_ADMIN')) {
            
            // Hide cart for agents
            const cartLink = document.getElementById('nav-cart-link');
            if (cartLink) {
               cartLink.style.display = 'none';
            }

            if(window.location.pathname.includes('vendor-dashboard.html')) return; // Don't show FAB on dashboard itself, it has its own tabs
            
            const fab = document.createElement('a');
            fab.href = '/vendor-dashboard.html?tab=listings';
            fab.className = 'fixed bottom-[85px] right-4 bg-orange-500 text-white w-14 h-14 rounded-full shadow-lg z-[60] flex items-center justify-center hover:bg-orange-600 transition-transform transform hover:scale-105 active:scale-95 border-2 border-white shadow-[0_4px_15px_rgba(249,115,22,0.4)]';
            fab.innerHTML = '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>';
            document.body.appendChild(fab);
          }
        } catch(e) {}
      }
      checkAgentFAB();
    </script>
  </nav>
`;

function getNavForPage(page) {
  let nav = navTemplate;
  const inactives = { class: 'text-gray-400 hover:text-green-700', fill: 'none', dot: '' };
  const actives = { class: 'text-green-700', fill: 'currentColor', dot: '<div class="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full"></div>' };

  nav = nav.replace('{{HOME_ACTIVE_CLASS}}', page === 'home' ? actives.class : inactives.class);
  nav = nav.replace('{{HOME_FILL}}', page === 'home' ? actives.fill : inactives.fill);
  nav = nav.replace('{{HOME_DOT}}', page === 'home' ? actives.dot : inactives.dot);

  nav = nav.replace('{{GROUPS_ACTIVE_CLASS}}', page === 'groups' ? actives.class : inactives.class);
  nav = nav.replace('{{GROUPS_FILL}}', page === 'groups' ? actives.fill : inactives.fill);
  nav = nav.replace('{{GROUPS_DOT}}', page === 'groups' ? actives.dot : inactives.dot);

  nav = nav.replace('{{CART_ACTIVE_CLASS}}', page === 'cart' ? actives.class : inactives.class);
  nav = nav.replace('{{CART_FILL}}', page === 'cart' ? actives.fill : inactives.fill);
  nav = nav.replace('{{CART_DOT}}', page === 'cart' ? actives.dot : inactives.dot);

  nav = nav.replace('{{VENDOR_ACTIVE_CLASS}}', page === 'vendor' ? actives.class : inactives.class);
  nav = nav.replace('{{VENDOR_FILL}}', page === 'vendor' ? actives.fill : inactives.fill);
  nav = nav.replace('{{VENDOR_DOT}}', page === 'vendor' ? actives.dot : inactives.dot);

  nav = nav.replace('{{PROFILE_ACTIVE_CLASS}}', page === 'profile' ? actives.class : inactives.class);
  nav = nav.replace('{{PROFILE_FILL}}', page === 'profile' ? actives.fill : inactives.fill);
  nav = nav.replace('{{PROFILE_DOT}}', page === 'profile' ? actives.dot : inactives.dot);

  return nav;
}

function processFile(filePath, activePage) {
  const fullPath = path.join(__dirname, 'public', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Regex to match the unified nav block and any trailing script tags that were previously left behind
  const navRegex = /<nav class="fixed bottom-0[^>]*>[\s\S]*?<\/nav>(?:\s*<script>[\s\S]*?<\/script>)*/i;
  
  if (navRegex.test(content)) {
    content = content.replace(navRegex, getNavForPage(activePage));
    fs.writeFileSync(fullPath, content);
    console.log("Updated " + filePath);
  } else {
    console.log("No nav found in " + filePath);
  }
}

processFile('index.html', 'home');
processFile('dashboard.html', 'groups');
processFile('group-cart.html', 'cart');
// Do NOT process vendor-dashboard.html, it has its own specialized bottom nav!
processFile('product-detail.html', 'none');
