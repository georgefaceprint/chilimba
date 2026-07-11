// pwa-install.js
// Custom PWA Install Prompt for Android & iOS mobile devices

(function() {
  // 1. Check if running in Standalone (Installed) Mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isStandalone) {
    console.log('📱 Chilimba is running in standalone mode. Skipping install prompt.');
    return;
  }

  // 2. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✓ PWA Service Worker registered:', reg.scope))
        .catch(err => console.error('✗ Service Worker registration failed:', err));
    });
  }

  let deferredPrompt = null;

  // 3. Listen for Android/Chrome Install Prompt Event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📥 beforeinstallprompt event captured.');
    
    // Auto-show banner on mobile
    if (isMobileDevice()) {
      showInstallBanner('native');
    }
  });

  // 4. Handle iOS Safari Detection
  window.addEventListener('load', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone && isMobileDevice()) {
      // Delay slightly for smooth landing
      setTimeout(() => {
        showInstallBanner('ios');
      }, 2000);
    }
  });

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  }

  function showInstallBanner(type) {
    // Prevent duplicate banners
    if (document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 85px;
      left: 16px;
      right: 16px;
      background: linear-gradient(135deg, #14532d 0%, #15803d 100%);
      color: white;
      padding: 16px;
      border-radius: 24px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 450px;
      margin: 0 auto;
    `;

    // Inject CSS Animation Keyframes
    if (!document.getElementById('pwa-banner-style')) {
      const style = document.createElement('style');
      style.id = 'pwa-banner-style';
      style.innerHTML = `
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(120%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: start;';

    const info = document.createElement('div');
    info.style.cssText = 'display: flex; gap: 12px; align-items: center;';

    const icon = document.createElement('div');
    icon.style.cssText = 'width: 42px; height: 42px; background: #ea580c; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0;';
    icon.innerText = 'C';

    const text = document.createElement('div');
    text.style.cssText = 'display: flex; flex-direction: column;';
    text.innerHTML = `
      <span style="font-weight: 800; font-size: 14px; letter-spacing: -0.2px;">Install Chilimba App</span>
      <span style="font-size: 11px; color: #bbf7d0; font-weight: 500;">Save data, track dispatches, and buy together!</span>
    `;

    info.appendChild(icon);
    info.appendChild(text);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'background: none; border: none; color: #bbf7d0; font-size: 16px; cursor: pointer; padding: 4px; font-weight: bold;';
    closeBtn.onclick = dismissBanner;

    header.appendChild(info);
    header.appendChild(closeBtn);
    banner.appendChild(header);

    if (type === 'native') {
      const ctaBtn = document.createElement('button');
      ctaBtn.innerText = 'Add to Home Screen';
      ctaBtn.style.cssText = 'background: #ea580c; color: white; border: none; padding: 12px; border-radius: 14px; font-weight: 800; font-size: 13px; cursor: pointer; width: 100%; text-align: center; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);';
      ctaBtn.onclick = async () => {
        if (!deferredPrompt) return;
        dismissBanner();
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA install prompt outcome: ${outcome}`);
        deferredPrompt = null;
      };
      banner.appendChild(ctaBtn);
    } else if (type === 'ios') {
      const instructions = document.createElement('div');
      instructions.style.cssText = 'background: rgba(255,255,255,0.08); padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; line-height: 1.4; border: 1px solid rgba(255,255,255,0.05); color: #f0fdf4;';
      instructions.innerHTML = `
        To install: Tap the <strong style="color: #fdba74;">Share</strong> button <span style="background: white; color: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 12px; display: inline-block; vertical-align: middle; margin: 0 2px;">📤</span> at bottom, then scroll down and select <strong style="color: #fdba74;">Add to Home Screen</strong> <span style="background: white; color: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 12px; display: inline-block; vertical-align: middle; margin: 0 2px;">➕</span>.
      `;
      banner.appendChild(instructions);
    }

    document.body.appendChild(banner);
  }

  function dismissBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.animation = 'fadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      setTimeout(() => banner.remove(), 300);
    }
  }
})();
