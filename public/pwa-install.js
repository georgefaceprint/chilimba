// pwa-install.js
// Custom PWA Install Prompt for Android & iOS mobile devices

(function() {

  // ── SPLASH SCREEN (always runs — browser & installed PWA) ──────────
  window.addEventListener('DOMContentLoaded', () => {
    const splash = document.createElement('div');
    splash.id = 'pwa-splash-screen';
    splash.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: #ffffff;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: opacity 0.5s ease-out;
    `;
    
    const style = document.createElement('style');
    style.innerHTML = `
      @-webkit-keyframes splashPulse {
        0% { -webkit-transform: scale(0.85); opacity: 0.7; }
        50% { -webkit-transform: scale(1.05); opacity: 1; }
        100% { -webkit-transform: scale(1); opacity: 1; }
      }
      @keyframes splashPulse {
        0% { transform: scale(0.85); opacity: 0.7; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @-webkit-keyframes splashSpinner {
        to { -webkit-transform: rotate(360deg); }
      }
      @keyframes splashSpinner {
        to { transform: rotate(360deg); }
      }
      .splash-logo {
        -webkit-animation: splashPulse 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite alternate;
        animation: splashPulse 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite alternate;
        width: 140px;
        height: 140px;
        object-fit: contain;
      }
      .splash-loader {
        width: 22px;
        height: 22px;
        border: 2.5px solid #f3f3f3;
        border-top: 2.5px solid #15803d;
        border-radius: 50%;
        -webkit-animation: splashSpinner 0.8s linear infinite;
        animation: splashSpinner 0.8s linear infinite;
        margin-top: 24px;
        opacity: 0;
        transition: opacity 1s ease-out;
      }
    `;
    document.head.appendChild(style);

    const logo = document.createElement('img');
    logo.src = '/assets/img/logo.png';
    logo.className = 'splash-logo';
    logo.onerror = () => {
      logo.style.display = 'none';
      const fallback = document.createElement('div');
      fallback.style.cssText = 'font-size: 28px; font-weight: 900; color: #15803d; letter-spacing: -1px;';
      fallback.innerText = 'CHILIMBA';
      splash.insertBefore(fallback, tagline);
    };

    const tagline = document.createElement('div');
    tagline.style.cssText = 'font-size: 13px; font-weight: 700; color: #166534; margin-top: 16px; font-style: italic; letter-spacing: -0.1px; text-align: center; font-family: system-ui, sans-serif; opacity: 0; transition: opacity 1s ease-out;';
    tagline.innerText = "Iseni mukwate fyonse!";

    const loader = document.createElement('div');
    loader.className = 'splash-loader';
    loader.style.marginTop = '16px';

    splash.appendChild(logo);
    splash.appendChild(tagline);
    splash.appendChild(loader);
    document.body.appendChild(splash);

    // Fade in tagline and loader after 1.5 seconds
    setTimeout(() => {
      tagline.style.opacity = '1';
      loader.style.opacity = '1';
    }, 1500);

    // Hide after 6 seconds
    setTimeout(() => {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 500);
    }, 6000);
  });

  // 1. Check if running in Standalone (Installed) Mode
  // Install prompt only shown in browser — not needed when already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // 2. Always register Service Worker (needed for offline & caching)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✓ PWA Service Worker registered:', reg.scope))
        .catch(err => console.error('✗ Service Worker registration failed:', err));
    });
  }

  // Skip install prompt if already running as installed PWA
  if (isStandalone) {
    console.log('📱 Chilimba is running in standalone mode. Skipping install prompt.');
    return;
  }

  let deferredPrompt = null;

  // 3. Listen for Install Prompt Event (Android / Chrome Desktop)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📥 beforeinstallprompt event captured.');
    
    // Show banner on all compatible browsers (desktop or mobile)
    showInstallBanner('native');
  });

  // 4. Handle iOS Safari Detection
  window.addEventListener('load', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone) {
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
    icon.style.cssText = 'width: 42px; height: 42px; background: #ffffff; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0;';
    icon.innerHTML = `<img src="/assets/img/logo.png" style="width: 100%; height: 100%; object-fit: contain; p-0.5">`;

    const text = document.createElement('div');
    text.style.cssText = 'display: flex; flex-direction: column;';
    text.innerHTML = `
      <span style="font-weight: 800; font-size: 14px; letter-spacing: -0.2px;">Chilimba</span>
      <span style="font-size: 11px; color: #bbf7d0; font-weight: 700; font-style: italic;">Iseni mukwate fyonse!</span>
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
