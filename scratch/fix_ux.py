import os
import re
import glob

html_files = glob.glob('/Users/afriwalletg/Downloads/new anttograv/Chilimba/public/*.html')

nav_template = """  <nav class="fixed bottom-0 w-full bg-white border-t border-gray-100 z-50 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] rounded-t-2xl">
    <div class="max-w-md mx-auto flex justify-around items-center h-[65px]">
      <a href="/" class="flex flex-col items-center gap-1 {home_classes} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M11.47 3.84a.75.75 0 011.06 0l8.99 8.99a.75.75 0 11-1.06 1.06L12 5.44 3.53 13.89a.75.75 0 11-1.06-1.06l8.99-8.99z"></path><path d="M12 5.44l-8.47 8.45a.75.75 0 00-.22.53v6.83c0 .96.78 1.75 1.75 1.75h13.88c.97 0 1.75-.79 1.75-1.75v-6.83a.75.75 0 00-.22-.53L12 5.44z"></path></svg>
        <span class="text-[9px] font-bold">Home</span>
        {home_dot}
      </a>
      <a href="/dashboard.html" class="flex flex-col items-center gap-1 {groups_classes} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        <span class="text-[9px] font-bold">Groups</span>
        {groups_dot}
      </a>
      <a href="/group-cart.html" class="flex flex-col items-center gap-1 {cart_classes} w-14 relative transition-colors btn-press">
        <div class="relative">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          <span id="cart-badge-nav" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full hidden">0</span>
        </div>
        <span class="text-[9px] font-bold">Cart</span>
        {cart_dot}
      </a>
      <a href="/orders.html" class="flex flex-col items-center gap-1 {orders_classes} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
        <span class="text-[9px] font-bold">Orders</span>
        {orders_dot}
      </a>
      <a href="/kyc-setup.html?returnTo=/orders.html" class="flex flex-col items-center gap-1 {profile_classes} w-14 relative transition-colors btn-press">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        <span class="text-[9px] font-bold">Profile</span>
        {profile_dot}
      </a>
    </div>
  </nav>"""

active_class = "text-green-700"
inactive_class = "text-gray-400 hover:text-green-700"
dot_html = '<div class="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full"></div>'

# Note: we use single quotes for JS but double quotes for Python strings containing them
fallback_svg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23d1d5db' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E"
old_onerror = "this.onerror=null; this.src='/assets/img/logo.png';"
new_onerror = f"this.onerror=null; this.src='{fallback_svg}';"

for file_path in html_files:
    filename = os.path.basename(file_path)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace broken image fallbacks
    content = content.replace(old_onerror, new_onerror)
    content = content.replace('onerror="this.src=\'/assets/img/logo.png\'"', f'onerror="{new_onerror}"')
    
    # 2. Update navigation
    if '<nav class="fixed bottom-0' in content:
        # Determine active tab
        home_classes = active_class if filename == 'index.html' else inactive_class
        home_dot = dot_html if filename == 'index.html' else ''
        
        groups_classes = active_class if filename == 'dashboard.html' else inactive_class
        groups_dot = dot_html if filename == 'dashboard.html' else ''
        
        cart_classes = active_class if filename == 'group-cart.html' else inactive_class
        cart_dot = dot_html if filename == 'group-cart.html' else ''
        
        orders_classes = active_class if filename == 'orders.html' else inactive_class
        orders_dot = dot_html if filename == 'orders.html' else ''
        
        # We don't have a specific profile.html right now except kyc-setup, so just leave inactive
        profile_classes = inactive_class
        profile_dot = ''
        
        # Don't touch runner-portal or vendor-dashboard or admin-portal which have specific navs
        if filename not in ['runner-portal.html', 'vendor-dashboard.html', 'admin-portal.html', 'how-it-works.html']:
            nav_content = nav_template.format(
                home_classes=home_classes, home_dot=home_dot,
                groups_classes=groups_classes, groups_dot=groups_dot,
                cart_classes=cart_classes, cart_dot=cart_dot,
                orders_classes=orders_classes, orders_dot=orders_dot,
                profile_classes=profile_classes, profile_dot=profile_dot
            )
            # Regex to replace existing nav
            content = re.sub(r'<nav class="fixed bottom-0.*?</nav>', nav_content, content, flags=re.DOTALL)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("UX fixes applied successfully.")
