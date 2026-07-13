import re

with open('public/kyc-setup.html', 'r') as f:
    html = f.read()

# 1. Firebase Head Scripts
firebase_scripts = """
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

    const firebaseConfig = {
      apiKey: "AIzaSyDyYTgZjok86T5o0Bc-vFS9Bk-P5j6kn50",
      authDomain: "musolemutesi29-lab.firebaseapp.com",
      projectId: "musolemutesi29-lab",
      storageBucket: "musolemutesi29-lab.firebasestorage.app",
      messagingSenderId: "714011063581",
      appId: "1:714011063581:web:894d4fdbb9d96181daddf4",
      measurementId: "G-NL3Y974KZ6"
    };

    const app = initializeApp(firebaseConfig);
    window.firebaseAuth = getAuth(app);
    window.RecaptchaVerifier = RecaptchaVerifier;
    window.signInWithPhoneNumber = signInWithPhoneNumber;
  </script>
"""
if "firebase-app.js" not in html:
    html = html.replace('</head>', firebase_scripts + '</head>')

# 2. Add SMS Verification Card right after PASSCODE SETUP CARD
sms_card = """
    <!-- ── SMS VERIFICATION CARD ────────────────────── -->
    <div id="sms-setup-card" class="w-full max-w-sm mt-5 bg-white rounded-3xl shadow-xl p-6 relative overflow-hidden hidden">
      <div class="relative z-10 text-center">
        <h2 class="font-black text-gray-900 text-lg">Verify Phone Number</h2>
        <p class="text-sm text-gray-500 font-medium mb-4" id="sms-prompt">We sent an SMS with a 6-digit code.</p>
        
        <input type="text" id="sms-code-input" placeholder="000000" maxlength="6" class="w-full text-center tracking-[0.5em] bg-gray-50 border-2 border-gray-200 p-3 rounded-xl font-black text-2xl focus:border-green-500 focus:bg-white outline-none mb-4">
        
        <button id="btn-verify-sms" onclick="verifySmsCode()" class="w-full bg-green-700 text-white py-3.5 rounded-xl font-black text-lg shadow-md hover:bg-green-800 transition-colors btn-press">
          Verify & Complete
        </button>
        <div id="recaptcha-container" class="mt-4 flex justify-center"></div>
      </div>
    </div>
"""
if "sms-setup-card" not in html:
    html = html.replace('<!-- ── PASSCODE SETUP CARD', sms_card + '\n    <!-- ── PASSCODE SETUP CARD')


# 3. Replace submitKyc
new_submit_kyc = """
    function submitKyc(e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('kyc-name').value.trim(),
        surname: document.getElementById('kyc-surname').value.trim(),
        whatsapp: formatPhoneNumber(document.getElementById('kyc-whatsapp').value.trim()),
        country: document.getElementById('kyc-country').value,
        province: document.getElementById('kyc-province').value,
        town: document.getElementById('kyc-town').value
      };
      
      // Save locally and show passcode screen
      localStorage.setItem('temp_kyc', JSON.stringify(payload));
      
      document.getElementById('kyc-form').parentElement.classList.add('hidden');
      const passCard = document.querySelector('.max-w-sm.bg-white:not(.hidden)');
      if (passCard) passCard.classList.remove('mt-5');
    }
"""
html = re.sub(r'async function submitKyc\(e\).*?function skipKyc\(\)', new_submit_kyc + '\n    function skipKyc()', html, flags=re.DOTALL)


# 4. Replace savePasscode
new_save_passcode = """
    let confirmationResult = null;
    let storedPasscode = '';

    async function savePasscode(code) {
      storedPasscode = code;
      const kycData = JSON.parse(localStorage.getItem('temp_kyc'));
      const phoneNumber = kycData.whatsapp;

      // Hide Passcode Card, Show SMS Card
      const passCards = document.querySelectorAll('.max-w-sm.bg-white:not(.hidden)');
      passCards[passCards.length - 1].classList.add('hidden');
      
      document.getElementById('sms-setup-card').classList.remove('hidden');
      document.getElementById('sms-setup-card').classList.remove('mt-5');
      document.getElementById('sms-prompt').innerText = `We are sending an SMS to ${phoneNumber}...`;

      try {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new window.RecaptchaVerifier(window.firebaseAuth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response) => { }
          });
        }

        confirmationResult = await window.signInWithPhoneNumber(window.firebaseAuth, phoneNumber, window.recaptchaVerifier);
        document.getElementById('sms-prompt').innerText = `Code sent to ${phoneNumber}. Enter it below.`;
      } catch (error) {
        console.error("SMS sending failed", error);
        alert("Failed to send SMS: " + error.message);
        document.getElementById('sms-prompt').innerText = `Failed to send SMS.`;
      }
    }

    async function verifySmsCode() {
      const code = document.getElementById('sms-code-input').value;
      if (!code || code.length < 6) return alert("Enter the 6-digit code");
      if (!confirmationResult) return alert("Please wait for SMS");

      document.getElementById('btn-verify-sms').innerText = "Verifying...";
      
      try {
        const result = await confirmationResult.confirm(code);
        const user = result.user;
        const idToken = await user.getIdToken();
        
        const kycData = JSON.parse(localStorage.getItem('temp_kyc'));

        // Send to backend
        const res = await fetch('/api/v1/auth/verify-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseIdToken: idToken,
            passcode: storedPasscode,
            profileData: {
              firstName: kycData.name,
              surname: kycData.surname,
              country: kycData.country,
              province: kycData.province,
              town: kycData.town
            }
          })
        });

        const data = await res.json();
        if (data.success) {
          window.location.href = '/dashboard.html';
        } else {
          alert('Backend Error: ' + data.error);
          document.getElementById('btn-verify-sms').innerText = "Verify & Complete";
        }
      } catch (error) {
        console.error("Verification failed", error);
        alert("Invalid code: " + error.message);
        document.getElementById('btn-verify-sms').innerText = "Verify & Complete";
      }
    }
"""
html = re.sub(r'async function savePasscode\(code\).*?\}\s*</script>', new_save_passcode + '\n  </script>', html, flags=re.DOTALL)

with open('public/kyc-setup.html', 'w') as f:
    f.write(html)
