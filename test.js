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
    let activeUser = null;

    function switchTab(tabId) {
      // Hide all views
      ['overview', 'listings', 'inventory', 'orders', 'wallet'].forEach(id => {
        const view = document.getElementById('view-' + id);
        if (view) view.classList.add('hidden');
      });

      // Reset all nav buttons to inactive
      ['overview', 'listings', 'inventory', 'orders', 'wallet'].forEach(id => {
        const nav = document.getElementById('nav-' + id);
        if (nav) {
          nav.classList.remove('text-green-700');
          nav.classList.add('text-gray-400');
          const svg = nav.querySelector('svg');
          if (id === 'listings') {
            svg.setAttribute('fill', 'none');
            const dot = document.getElementById('nav-listings-dot');
            if (dot) dot.classList.add('hidden');
          }
        }
        
        const deskNav = document.getElementById('desk-nav-' + id);
        if (deskNav) {
          deskNav.classList.remove('text-green-700', 'bg-green-50');
          deskNav.classList.add('text-gray-500');
          deskNav.classList.remove('hover:text-green-700', 'hover:bg-gray-50');
          deskNav.classList.add('hover:text-green-700', 'hover:bg-gray-50');
        }
      });

      // Show selected view
      const selectedView = document.getElementById('view-' + tabId);
      if (selectedView) selectedView.classList.remove('hidden');

      // Set selected nav to active
      const selectedNav = document.getElementById('nav-' + tabId);
      if (selectedNav) {
        selectedNav.classList.remove('text-gray-400');
        selectedNav.classList.add('text-green-700');
        const svg = selectedNav.querySelector('svg');
        if (tabId === 'listings') {
          svg.setAttribute('fill', 'currentColor');
          const dot = document.getElementById('nav-listings-dot');
          if (dot) dot.classList.remove('hidden');
        }
      }
      
      const selectedDeskNav = document.getElementById('desk-nav-' + tabId);
      if (selectedDeskNav) {
        selectedDeskNav.classList.remove('text-gray-500', 'hover:text-green-700', 'hover:bg-gray-50');
        selectedDeskNav.classList.add('text-green-700', 'bg-green-50');
      }
      
      if (tabId === 'orders') {
        loadVendorOrders();
      }
      if (tabId === 'inventory') {
        loadInventoryForShop();
      }
    }

    function switchActiveShop() {
      const select = document.getElementById('active-shop-select');
      const shopName = select.options[select.selectedIndex].text;
      document.getElementById('lbl-active-shop').innerText = shopName;
      
      const ordersView = document.getElementById('view-orders');
      if (ordersView && !ordersView.classList.contains('hidden')) {
        loadVendorOrders();
      }
      
      const invView = document.getElementById('view-inventory');
      if (invView && !invView.classList.contains('hidden')) {
        loadInventoryForShop();
      }
    }

    function dispatchOrder(btnElement) {
      btnElement.innerText = "Dispatching...";
      btnElement.disabled = true;
      btnElement.classList.remove('bg-orange-500', 'hover:bg-orange-600');
      btnElement.classList.add('bg-gray-400');
      
      setTimeout(() => {
        btnElement.innerText = "✓ Dispatched to Hub";
        btnElement.classList.remove('bg-gray-400');
        btnElement.classList.add('bg-green-600');
        const parentCard = btnElement.closest('.bg-white');
        parentCard.style.opacity = '0.5';
      }, 1000);
    }

    // Modal Logic
    function openAuthModal() {
      const m = document.getElementById('auth-modal');
      m.classList.remove('hidden'); m.classList.add('flex');
      setTimeout(() => document.getElementById('auth-content').classList.remove('scale-95'), 10);
    }
    function closeAuthModal() {
      document.getElementById('auth-content').classList.add('scale-95');
      setTimeout(() => {
        const m = document.getElementById('auth-modal');
        m.classList.add('hidden'); m.classList.remove('flex');
      }, 200);
    }

    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
      document.getElementById(id).classList.remove('flex');
    }

    function openPasscodeModal() {
      document.getElementById('passcode-modal').classList.remove('hidden');
      document.getElementById('passcode-modal').classList.add('flex');
    }

    async function submitNewPasscode() {
      const pc = document.getElementById('new-passcode-input').value;
      if (!pc || pc.length < 5) return alert('Passcode must be at least 5 digits');
      
      try {
        const res = await fetch(`/api/v1/auth/change-passcode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: pc })
        });
        const data = await res.json();
        if (data.success) {
          alert('Passcode successfully set! You can use it to log in next time.');
          closeModal('passcode-modal');
          document.getElementById('new-passcode-input').value = '';
        } else {
          alert('Error: ' + data.error);
        }
      } catch(e) {
        alert('Network error.');
      }
    }

    function openNewShopModal() {
      const m = document.getElementById('new-shop-modal');
      m.classList.remove('hidden'); m.classList.add('flex');
      setTimeout(() => document.getElementById('new-shop-content').classList.remove('scale-95'), 10);
    }
    function closeNewShopModal() {
      document.getElementById('new-shop-content').classList.add('scale-95');
      setTimeout(() => {
        const m = document.getElementById('new-shop-modal');
        m.classList.add('hidden'); m.classList.remove('flex');
      }, 200);
    }

    async function saveNewShop() {
      const name = document.getElementById('ns-name').value;
      if(!name) return alert("Shop name required");
      
      const btn = document.querySelector('#new-shop-modal button.bg-green-800');
      const oldText = btn.innerText;
      btn.innerText = 'Saving...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/v1/user/add-shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shop_name: name })
        });
        const data = await res.json();
        
        if (data.success && data.shop) {
          const select = document.getElementById('active-shop-select');
          const newOption = new Option(data.shop.name, data.shop.id);
          select.add(newOption);
          select.value = newOption.value;
          switchActiveShop();
          closeNewShopModal();
          document.getElementById('ns-name').value = '';
        } else {
          alert('Failed to save shop: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error while saving shop.');
      } finally {
        btn.innerText = oldText;
        btn.disabled = false;
      }
    }

    // --- CATEGORY TAXONOMY DATABASE ---
    let TAXONOMY = {};

    async function loadTaxonomy() {
      try {
        const res = await fetch('/api/v1/categories');
        if (res.ok) {
          const data = await res.json();
          TAXONOMY = data.categories || {};
        }
      } catch (err) {
        console.error('Failed to load taxonomy', err);
      }
      initCategorySelects();
    }

    function initCategorySelects() {
      const pCat = document.getElementById('p-category');
      if (pCat) {
        pCat.innerHTML = '<option value="">Select Category</option>';
        Object.keys(TAXONOMY).forEach(cat => {
          pCat.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        pCat.innerHTML += `<option value="Other">Other (Custom)</option>`;
        
        handleCategoryChange();
      }
    }

    function handleCategoryChange() {
      const cat = document.getElementById('p-category').value;
      const subCatSelect = document.getElementById('p-sub-category');
      const subSubCatSelect = document.getElementById('p-sub-sub-category');
      
      const customCat = document.getElementById('p-category-custom');
      const customSubCat = document.getElementById('p-sub-category-custom');
      const customSubSubCat = document.getElementById('p-sub-sub-category-custom');

      if (!subCatSelect || !subSubCatSelect) return;

      // Reset
      subCatSelect.innerHTML = '<option value="">Select Sub-category</option>';
      subSubCatSelect.innerHTML = '<option value="">Select Sub-sub-category</option>';
      
      if (cat === 'Other') {
        customCat.classList.remove('hidden');
        customSubCat.classList.remove('hidden');
        customSubSubCat.classList.remove('hidden');
        
        subCatSelect.classList.add('hidden');
        subSubCatSelect.classList.add('hidden');
      } else {
        customCat.classList.add('hidden');
        customSubCat.classList.add('hidden');
        customSubSubCat.classList.add('hidden');
        
        subCatSelect.classList.remove('hidden');
        subSubCatSelect.classList.remove('hidden');
        
        if (cat && TAXONOMY[cat]) {
          Object.keys(TAXONOMY[cat]).forEach(sub => {
            subCatSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
          });
          subCatSelect.innerHTML += `<option value="Other">Other (Custom)</option>`;
        }
      }
      
      // Show fashion attributes dynamically if Category is Fashion
      const fashionPanel = document.getElementById('fashion-attributes-panel');
      if (fashionPanel) {
        if (cat === 'Fashion') {
          fashionPanel.classList.remove('hidden');
        } else {
          fashionPanel.classList.add('hidden');
        }
      }
      
      handleSubCategoryChange();
    }

    function handleSubCategoryChange() {
      const cat = document.getElementById('p-category').value;
      const sub = document.getElementById('p-sub-category').value;
      const subSubCatSelect = document.getElementById('p-sub-sub-category');
      const customSubCat = document.getElementById('p-sub-category-custom');
      const customSubSubCat = document.getElementById('p-sub-sub-category-custom');

      if (!subSubCatSelect) return;

      subSubCatSelect.innerHTML = '<option value="">Select Sub-sub-category</option>';

      if (sub === 'Other') {
        customSubCat.classList.remove('hidden');
        customSubSubCat.classList.remove('hidden');
        subSubCatSelect.classList.add('hidden');
      } else {
        if (cat !== 'Other') {
          customSubCat.classList.add('hidden');
          customSubSubCat.classList.add('hidden');
          subSubCatSelect.classList.remove('hidden');
          
          if (cat && sub && TAXONOMY[cat] && TAXONOMY[cat][sub]) {
            TAXONOMY[cat][sub].forEach(subsub => {
              subSubCatSelect.innerHTML += `<option value="${subsub}">${subsub}</option>`;
            });
            subSubCatSelect.innerHTML += `<option value="Other">Other (Custom)</option>`;
          }
        }
      }
      
      handleSubSubCategoryChange();
    }

    function handleSubSubCategoryChange() {
      const subsub = document.getElementById('p-sub-sub-category').value;
      const customSubSubCat = document.getElementById('p-sub-sub-category-custom');
      
      if (!customSubSubCat) return;

      if (subsub === 'Other') {
        customSubSubCat.classList.remove('hidden');
      } else {
        const cat = document.getElementById('p-category').value;
        const sub = document.getElementById('p-sub-category').value;
        if (cat !== 'Other' && sub !== 'Other') {
          customSubSubCat.classList.add('hidden');
        }
      }
    }

    // Auto-suggest Category logic
    function suggestCategory() {
      const input = document.getElementById('p-category-search').value.toLowerCase().trim();
      const suggestionsDiv = document.getElementById('category-search-suggestions');
      
      if (!input) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.add('hidden');
        return;
      }
      
      let matches = [];
      
      Object.keys(TAXONOMY).forEach(cat => {
        Object.keys(TAXONOMY[cat]).forEach(sub => {
          TAXONOMY[cat][sub].forEach(subsub => {
            if (subsub.toLowerCase().includes(input) || sub.toLowerCase().includes(input) || cat.toLowerCase().includes(input)) {
              if (matches.length < 5) {
                matches.push({ cat, sub, subsub });
              }
            }
          });
        });
      });
      
      if (matches.length > 0) {
        suggestionsDiv.classList.remove('hidden');
        suggestionsDiv.innerHTML = '';
        matches.forEach(m => {
          const div = document.createElement('div');
          div.className = 'p-2 text-xs font-bold text-gray-700 hover:bg-green-50 rounded-lg cursor-pointer transition-colors';
          div.innerText = `${m.cat} > ${m.sub} > ${m.subsub}`;
          div.onclick = () => {
            selectSuggestedCategory(m.cat, m.sub, m.subsub);
          };
          suggestionsDiv.appendChild(div);
        });
      } else {
        suggestionsDiv.innerHTML = '<div class="p-2 text-xs text-gray-400 font-bold">No match. Pick manually below.</div>';
        suggestionsDiv.classList.remove('hidden');
      }
    }

    function selectSuggestedCategory(cat, sub, subsub) {
      document.getElementById('p-category').value = cat;
      handleCategoryChange();
      
      document.getElementById('p-sub-category').value = sub;
      handleSubCategoryChange();
      
      document.getElementById('p-sub-sub-category').value = subsub;
      handleSubSubCategoryChange();
      
      // Clear suggestion box
      document.getElementById('p-category-search').value = '';
      const suggestionsDiv = document.getElementById('category-search-suggestions');
      suggestionsDiv.innerHTML = '';
      suggestionsDiv.classList.add('hidden');
    }

    // Image Upload Modal Logic
    let selectedFile = null;

    let productImageUrls = [];
    let currentImageUploadIndex = 0;

    function renderImageGrid() {
      const container = document.getElementById('image-grid-container');
      if (!container) return;
      container.innerHTML = '';
      
      for (let i = 0; i < 4; i++) {
        const url = productImageUrls[i];
        if (url) {
          container.innerHTML += `
            <div class="border-2 border-gray-200 bg-white rounded-2xl p-2 text-center relative overflow-hidden group aspect-square flex items-center justify-center">
              <img src="${url}" class="w-full h-full object-contain">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <button type="button" onclick="openUploadModal(${i})" class="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-bold shadow-md">Change</button>
                <button type="button" onclick="removeImage(${i})" class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">Remove</button>
              </div>
            </div>
          `;
        } else if (i === productImageUrls.length) {
          container.innerHTML += `
            <div onclick="openUploadModal(${i})" class="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl p-4 text-center cursor-pointer hover:bg-green-50/50 hover:border-green-500 transition-all flex flex-col items-center justify-center aspect-square group">
              <div class="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <p class="text-[10px] font-black text-gray-700">Add Image</p>
            </div>
          `;
        } else {
          container.innerHTML += `
            <div class="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-2xl aspect-square flex items-center justify-center opacity-50">
            </div>
          `;
        }
      }
    }

    function removeImage(index) {
      productImageUrls.splice(index, 1);
      renderImageGrid();
    }

    function openUploadModal(index = 0) {
      isEditingMode = false;
      currentImageUploadIndex = index;
      const m = document.getElementById('image-upload-modal');
      m.classList.remove('hidden'); m.classList.add('flex');
      setTimeout(() => document.getElementById('image-upload-content').classList.remove('scale-95'), 10);
    }

    function closeUploadModal() {
      document.getElementById('image-upload-content').classList.add('scale-95');
      setTimeout(() => {
        const m = document.getElementById('image-upload-modal');
        m.classList.add('hidden'); m.classList.remove('flex');
      }, 200);
      selectedFile = null;
      document.getElementById('drop-zone-text').innerText = 'Choose File or Drop Here';
      document.getElementById('btn-upload-submit').classList.add('hidden');
    }

    function triggerFileInput() {
      document.getElementById('modal-file-input').click();
    }

    function handleDragOver(e) {
      e.preventDefault();
      document.getElementById('modal-drop-zone').classList.add('border-green-500', 'bg-green-50/50');
    }

    function handleDragLeave(e) {
      e.preventDefault();
      document.getElementById('modal-drop-zone').classList.remove('border-green-500', 'bg-green-50/50');
    }

    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('modal-drop-zone').classList.remove('border-green-500', 'bg-green-50/50');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    }

    function handleFileSelect(e) {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    }

    function processFile(file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      selectedFile = file;
      document.getElementById('drop-zone-text').innerText = `Selected: ${file.name}`;
      document.getElementById('btn-upload-submit').classList.remove('hidden');
    }

    function usePresetImage(url) {
      if (isEditingMode) {
        if (currentImageUploadIndex >= editImageUrls.length) {
          editImageUrls.push(url);
        } else {
          editImageUrls[currentImageUploadIndex] = url;
        }
        renderEditImageGrid();
      } else {
        if (currentImageUploadIndex >= productImageUrls.length) {
          productImageUrls.push(url);
        } else {
          productImageUrls[currentImageUploadIndex] = url;
        }
        renderImageGrid();
      }
      closeUploadModal();
    }

    function performUpload() {
      if (!selectedFile) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = async function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          document.getElementById('uploading-spinner').classList.remove('hidden');
          document.getElementById('btn-upload-submit').disabled = true;
          
          try {
            const res = await fetch('/api/v1/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: selectedFile.name, base64: compressedBase64 })
            });
          
          if (!res.ok) {
            let errorText = await res.text();
            try {
              const jsonError = JSON.parse(errorText);
              errorText = jsonError.error || errorText;
            } catch(e) { } // Not JSON
            throw new Error(errorText || res.statusText);
          }
          
          const data = await res.json();
          if (data.success) {
            usePresetImage(data.url);
          } else {
            throw new Error(data.error || 'Unknown server error');
          }
        } catch (err) {
          console.error('Upload Error:', err);
          alert('Upload failed: ' + err.message);
        } finally {
          document.getElementById('uploading-spinner').classList.add('hidden');
          document.getElementById('btn-upload-submit').disabled = false;
        }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(selectedFile);
    }

    // Confirmation Modal Logic
    let pendingPayload = null;

    function openConfirmModal() {
      const m = document.getElementById('confirm-modal');
      m.classList.remove('hidden'); m.classList.add('flex');
      setTimeout(() => document.getElementById('confirm-content').classList.remove('scale-95'), 10);
    }

    function closeConfirmModal() {
      document.getElementById('confirm-content').classList.add('scale-95');
      setTimeout(() => {
        const m = document.getElementById('confirm-modal');
        m.classList.add('hidden'); m.classList.remove('flex');
      }, 200);
    }

    function updatePriceLabel() {
      const originSelect = document.getElementById('p-origin-country');
      const priceLabel = document.getElementById('lbl-price');
      if (originSelect && priceLabel) {
        priceLabel.innerText = originSelect.value === 'Zambia' ? 'Price (ZMW)' : 'Price (TZS)';
      }
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
      productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopSelect = document.getElementById('active-shop-select');
        const supplierId = shopSelect.value;
        const supplierName = shopSelect.options[shopSelect.selectedIndex].text;
        
        const title = document.getElementById('p-title').value;
        const description = document.getElementById('p-description').value;
        
        let category = document.getElementById('p-category').value;
        let subCategory = document.getElementById('p-sub-category').value;
        let subSubCategory = document.getElementById('p-sub-sub-category').value;

        if (category === 'Other') {
          category = document.getElementById('p-category-custom').value.trim() || 'Other';
          subCategory = document.getElementById('p-sub-category-custom').value.trim() || 'Other';
          subSubCategory = document.getElementById('p-sub-sub-category-custom').value.trim() || 'Other';
        } else {
          if (subCategory === 'Other') {
            subCategory = document.getElementById('p-sub-category-custom').value.trim() || 'Other';
            subSubCategory = document.getElementById('p-sub-sub-category-custom').value.trim() || 'Other';
          } else if (subSubCategory === 'Other') {
            subSubCategory = document.getElementById('p-sub-sub-category-custom').value.trim() || 'Other';
          }
        }

        const originCountry = document.getElementById('p-origin-country').value;
        const originCity = document.getElementById('p-origin-city').value;
        const priceValue = parseFloat(document.getElementById('p-price').value);
        const weight = parseFloat(document.getElementById('p-weight').value);
        
        if (isNaN(priceValue) || isNaN(weight)) {
          return alert('Please enter a valid Price and Weight.');
        }
        if (productImageUrls.length === 0) {
          productImageUrls.push('/assets/img/logo.png');
        }
        
        const attributes = {};
        if (category === 'Fashion') {
          const sizes = document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(Boolean);
          const colors = document.getElementById('p-colors').value.split(',').map(c => c.trim()).filter(Boolean);
          if (sizes.length > 0) attributes.sizes = sizes;
          if (colors.length > 0) attributes.colors = colors;
        }

        const payload = {
          title,
          description,
          category,
          sub_category: subCategory,
          sub_sub_category: subSubCategory,
          origin_country: originCountry,
          origin_city: originCity,
          weight_kg: weight,
          image_url: productImageUrls[0],
          image_urls: productImageUrls,
          supplier_id: supplierId,
          supplier_name: supplierName,
          attributes: Object.keys(attributes).length > 0 ? attributes : null
        };
        
        if (originCountry === 'Zambia') {
          payload.price_zmw_input = priceValue;
          payload.price_tzs = 0;
        } else {
          payload.price_tzs = priceValue;
          payload.price_zmw_input = 0;
        }
        
        pendingPayload = payload;
        
        // Populate confirmation details
        document.getElementById('conf-image').src = payload.image_urls[0];
        document.getElementById('conf-title').innerText = payload.title;
        document.getElementById('conf-category').innerText = `${payload.category} > ${payload.sub_category} > ${payload.sub_sub_category}`;
        document.getElementById('conf-price').innerText = originCountry === 'Zambia' ? `K${priceValue}` : `TZS ${priceValue}`;
        document.getElementById('conf-weight').innerText = `${payload.weight_kg} kg`;
        document.getElementById('conf-origin').innerText = `${payload.origin_city}, ${payload.origin_country}`;
        
        openConfirmModal();
      });
    }

    async function publishConfirmedListing() {
      if (!pendingPayload) return;
      
      const btnSubmit = document.getElementById('btn-submit');
      const originalText = btnSubmit.innerText;
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Publishing...';
      
      closeConfirmModal();
      
      try {
        const response = await fetch('/api/v1/products/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pendingPayload)
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          alert('Listing published successfully! Final price has been converted with agent margin & forex markup.');
          productForm.reset();
          
          // Reset image preview state
          document.getElementById('p-image-url').value = '';
          document.getElementById('upload-preview-state').classList.add('hidden');
          document.getElementById('upload-placeholder-state').classList.remove('hidden');
          
          updatePriceLabel();
        } else {
          throw new Error(data.error || 'Failed to upload listing');
        }
      } catch (error) {
        alert('Error publishing listing: ' + error.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = originalText;
        pendingPayload = null;
      }
    }

    document.addEventListener('DOMContentLoaded', async () => {
      loadTaxonomy();
      renderImageGrid();
      try {
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            if (data.user.role === 'AGENT' || data.user.role === 'SUPER_ADMIN') {
              loginSuccess(data.user);
            } else {
              showNonAgentPrompt(data.user);
            }
          }
        }
      } catch (err) {
        console.error('Auth check failed', err);
      }
    });

    function showNonAgentPrompt(user) {
      const loginPrompt = document.getElementById('login-prompt');
      if (loginPrompt) {
        loginPrompt.innerHTML = `
          <div class="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 class="text-2xl font-black text-gray-900 mb-2">Agent Access Required</h2>
          <p class="text-gray-500 font-medium mb-6 text-sm">
            Hi <strong>${user.display_name || user.name || 'Member'}</strong>, you are currently logged in as a <strong>${user.role}</strong>. 
            Only verified Sourcing Agents can access this dashboard to list products and dispatch orders.
          </p>
          <div class="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-8 text-left">
            <h4 class="font-extrabold text-orange-800 text-sm mb-1">💼 Why become a Chilimba Agent?</h4>
            <ul class="text-xs text-orange-700 font-bold space-y-1.5">
              <li>• Register your shop and list products for Tanzanian sourcing</li>
              <li>• Manage cross-border shipments and split transit logistics</li>
              <li>• Earn commissions and margin markups on group purchases</li>
            </ul>
          </div>
          <button onclick="applyForAgentRole()" class="w-full bg-green-800 text-white py-4 rounded-xl font-black text-lg hover:bg-green-900 transition-colors shadow-lg btn-press mb-4">Apply to Join as Agent</button>
          <button onclick="window.location.href='/dashboard.html'" class="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors btn-press">Go to Customer Dashboard</button>
        `;
      }
    }

    async function applyForAgentRole() {
      if (confirm("Would you like to submit an application to register as a Sourcing Agent?")) {
        try {
          const res = await fetch('/api/v1/user/update-kyc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'AGENT'
            })
          });
          if (res.ok) {
            alert("🎉 Application approved! Your account has been promoted to AGENT. Refreshing page...");
            window.location.reload();
          } else {
            alert("Failed to submit application.");
          }
        } catch (e) {
          alert("Error submitting agent application.");
        }
      }
    }

    // Mock Login for Demo -> Real Login
    function loginSuccess(user) {
      document.getElementById('login-prompt').classList.add('hidden');
      document.getElementById('dashboard-content').classList.remove('hidden');
      document.getElementById('agent-tools').classList.remove('hidden');
      document.getElementById('agent-tools').classList.add('flex');
      
      const bottomNav = document.getElementById('agent-bottom-nav');
      if (bottomNav) {
        bottomNav.classList.remove('hidden');
        bottomNav.classList.add('flex');
      }
      
      document.getElementById('btn-login').classList.add('hidden');
      document.getElementById('user-profile').classList.remove('hidden');
      document.getElementById('user-profile').classList.add('flex');

      if (user && user.name) {
        document.getElementById('profile-name').innerText = user.name;
      }
      if (user && user.avatar) {
        document.getElementById('profile-img').src = user.avatar;
      }
      
      const select = document.getElementById('active-shop-select');
      select.innerHTML = '';
      if (user && user.shops && user.shops.length > 0) {
        user.shops.forEach(shop => {
          select.add(new Option(shop.name, shop.id));
        });
      } else {
        select.add(new Option('My First Shop', 'default_shop'));
      }
      switchActiveShop();
    }

    function goToWizardStep(step) {
      if (step === 2) {
        if (!document.getElementById('p-title').value || !document.getElementById('p-description').value) {
          return alert('Please fill in the Product Title and Description first.');
        }
      }

      document.getElementById('wizard-step-1').classList.add('hidden');
      document.getElementById('wizard-step-2').classList.add('hidden');
      document.getElementById('wizard-step-3').classList.add('hidden');
      
      document.getElementById('wizard-step-' + step).classList.remove('hidden');

      const bar = document.getElementById('wizard-progress-bar');
      if (step === 1) bar.style.width = '15%';
      if (step === 2) bar.style.width = '50%';
      if (step === 3) bar.style.width = '100%';

      ['step-1', 'step-2', 'step-3'].forEach((s, idx) => {
        const circle = document.getElementById(s + '-circle');
        const text = document.getElementById(s + '-text');
        
        if (idx + 1 <= step) {
          circle.classList.remove('bg-gray-200', 'text-gray-400');
          circle.classList.add('bg-green-600', 'text-white');
          text.classList.remove('text-gray-400');
          text.classList.add('text-green-700');
        } else {
          circle.classList.add('bg-gray-200', 'text-gray-400');
          circle.classList.remove('bg-green-600', 'text-white');
          text.classList.add('text-gray-400');
          text.classList.remove('text-green-700');
        }
      });
    }
    
    // ==========================================
    // ORDER MANAGEMENT (OMS) LOGIC
    // ==========================================
    async function loadVendorOrders() {
      const container = document.getElementById('orders-list');
      if (!container) return;
      
      const shopSelect = document.getElementById('active-shop-select');
      const shopId = shopSelect?.value;
      if (!shopId) return;
      
      container.innerHTML = '<div class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent mx-auto"></div></div>';
      
      try {
        const res = await fetch(`/api/v1/vendor/orders?vendor_id=${encodeURIComponent(shopId)}`);
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        
        if (data.orders.length === 0) {
          container.innerHTML = `
            <div class="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
              <p class="text-gray-500 font-medium text-sm">No pending orders found.</p>
            </div>`;
          return;
        }
        
        let html = '';
        data.orders.forEach(order => {
          // Status badge
          let statusBadge = '';
          if (order.status === 'PAID') statusBadge = '<span class="bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">To Fulfill</span>';
          else if (order.status === 'PROCESSING') statusBadge = '<span class="bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Processing</span>';
          else if (order.status === 'SHIPPED') statusBadge = '<span class="bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Shipped</span>';
          else statusBadge = `<span class="bg-gray-100 text-gray-800 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">${order.status}</span>`;

          // Items
          let itemsHtml = '';
          order.items.forEach(item => {
            const img = (item.product && item.product.image_urls && item.product.image_urls[0]) || '/assets/img/logo.png';
            itemsHtml += `
              <div class="flex gap-3 mb-2">
                <div class="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 border border-gray-100 p-1">
                  <img src="${img}" class="w-full h-full object-contain" onerror="this.src='/assets/img/logo.png'">
                </div>
                <div>
                  <h4 class="font-bold text-sm text-gray-900 leading-tight">${item.product?.title || 'Product'}</h4>
                  <p class="text-xs text-gray-500 font-medium mt-1">Qty: ${item.quantity}</p>
                </div>
              </div>
            `;
          });
          
          let actionBtn = '';
          if (order.status === 'PAID') {
            actionBtn = `<button onclick="updateOrderStatus('${order.id}', 'PROCESSING')" class="w-full bg-blue-500 text-white font-black py-3 rounded-xl shadow hover:bg-blue-600 transition-colors btn-press text-sm">Start Processing</button>`;
          } else if (order.status === 'PROCESSING') {
            actionBtn = `<button onclick="updateOrderStatus('${order.id}', 'SHIPPED')" class="w-full bg-orange-500 text-white font-black py-3 rounded-xl shadow hover:bg-orange-600 transition-colors btn-press text-sm">Mark as Ready for Pickup (Shipped)</button>`;
          }

          html += `
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                <div>
                  ${statusBadge}
                  <span class="text-xs text-gray-500 font-bold ml-2">#${order.id.slice(-6).toUpperCase()}</span>
                </div>
                <span class="text-[10px] font-bold text-gray-400">${new Date(order.created_at).toLocaleDateString()}</span>
              </div>
              ${itemsHtml}
              <div class="mt-4">
                ${actionBtn}
              </div>
            </div>
          `;
        });
        container.innerHTML = html;
        
      } catch (err) {
        container.innerHTML = `<div class="text-red-500 text-center p-4">Error loading orders: ${err.message}</div>`;
      }
    }
    
    async function updateOrderStatus(orderId, newStatus) {
      try {
        const res = await fetch('/api/v1/orders/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, new_status: newStatus })
        });
        if (!res.ok) throw new Error('Failed to update status');
        loadVendorOrders(); // refresh
      } catch (err) {
        alert(err.message);
      }
    }

    // ==========================================
    // INVENTORY MANAGEMENT LOGIC
    // ==========================================
    let currentInventory = [];
    
    async function loadInventoryForShop() {
      const invSelect = document.getElementById('inventory-shop-select');
      const activeSelect = document.getElementById('active-shop-select');
      // Use inventory select if visible/populated, fallback to active-shop-select
      const shopId = (invSelect && invSelect.value) ? invSelect.value : (activeSelect ? activeSelect.value : null);
      const listContainer = document.getElementById('inventory-list');
      const loader = document.getElementById('inventory-loading');
      
      if (!shopId) return;
      
      listContainer.innerHTML = '';
      loader.classList.remove('hidden');
      loader.classList.add('flex');
      
      try {
        const res = await fetch('/api/v1/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        
        // Agents manage the global catalog, so we load all products for now
        currentInventory = data.products;
        
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        
        if (currentInventory.length === 0) {
          listContainer.innerHTML = `
            <div class="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
              <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-gray-300">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              </div>
              <p class="text-gray-500 font-medium text-sm">No products found in this shop.</p>
              <button onclick="switchTab('listings'); document.getElementById('shop-select').value='${shopId}'" class="mt-4 text-green-700 font-bold text-sm bg-green-50 px-4 py-2 rounded-lg">Add First Listing</button>
            </div>
          `;
          return;
        }
        
        currentInventory.forEach(p => {
          const imgUrl = p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : '/assets/img/logo.png';
          listContainer.innerHTML += `
            <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
              <div class="w-20 h-20 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 p-1">
                <img src="${imgUrl}" class="max-w-full max-h-full object-contain mix-blend-multiply" alt="product">
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 text-sm truncate mb-1">${p.title}</h3>
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-black text-green-700 text-sm">K${parseFloat(p.price_zmw).toLocaleString()}</span>
                  ${p.price_tzs ? `<span class="text-xs text-gray-400">TSh ${parseFloat(p.price_tzs).toLocaleString()}</span>` : ''}
                </div>
                <div class="flex items-center gap-2">
                  <span class="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${p.category}</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <button onclick="openEditModal('${p.id}')" class="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center hover:bg-green-100 transition-colors btn-press flex-shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="toggleStock('${p.id}', ${p.in_stock !== false})" class="w-10 h-10 ${p.in_stock !== false ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-red-50 text-red-700 hover:bg-red-100'} rounded-xl flex items-center justify-center transition-colors btn-press flex-shrink-0" title="${p.in_stock !== false ? 'Mark Out of Stock' : 'Mark In Stock'}">
                  ${p.in_stock !== false ? 
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' : 
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>'
                  }
                </button>
              </div>
            </div>
          `;
        });
        
      } catch (err) {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        listContainer.innerHTML = `<p class="text-red-500 text-sm p-4 bg-red-50 rounded-xl">Error loading inventory. Please try again.</p>`;
        console.error(err);
      }
    }
    
    function populateInventoryShopSelect() {
      const invSelect = document.getElementById('inventory-shop-select');
      if (!invSelect || !window.cachedShops) return;
      
      let html = '<option value="" disabled selected>Select a Shop</option>';
      window.cachedShops.forEach(shop => {
        html += `<option value="${shop.id}">${shop.name}</option>`;
      });
      invSelect.innerHTML = html;
    }
    
    async function toggleStock(productId, currentlyInStock) {
      try {
        const newStockState = !currentlyInStock;
        const res = await fetch(`/api/v1/products/toggle-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, in_stock: newStockState })
        });
        const data = await res.json();
        if (data.success) {
          const shopId = document.getElementById('active-shop-select').value;
          loadInventoryForShop(shopId);
        } else {
          alert('Failed to update stock status: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error(err);
        alert('Error updating stock status');
      }
    }

    let editImageUrls = [];

    function renderEditImageGrid() {
      const container = document.getElementById('edit-image-grid-container');
      if (!container) return;
      container.innerHTML = '';
      
      for (let i = 0; i < 4; i++) {
        const url = editImageUrls[i];
        if (url) {
          container.innerHTML += `
            <div class="border border-gray-200 bg-white rounded-xl p-1 text-center relative overflow-hidden group aspect-square flex items-center justify-center">
              <img src="${url}" class="w-full h-full object-contain">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                <button type="button" onclick="openEditUploadModal(${i})" class="bg-white text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold shadow-md">Change</button>
                <button type="button" onclick="removeEditImage(${i})" class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-md">Remove</button>
              </div>
            </div>
          `;
        } else if (i === editImageUrls.length) {
          container.innerHTML += `
            <div onclick="openEditUploadModal(${i})" class="border border-dashed border-gray-300 bg-gray-50 rounded-xl p-2 text-center cursor-pointer hover:bg-green-50 hover:border-green-500 transition-all flex flex-col items-center justify-center aspect-square group">
              <div class="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <p class="text-[8px] font-black text-gray-700">Add</p>
            </div>
          `;
        } else {
          container.innerHTML += `
            <div class="border border-dashed border-gray-200 bg-gray-50/50 rounded-xl aspect-square flex items-center justify-center opacity-50"></div>
          `;
        }
      }
      document.getElementById('edit-image-urls').value = JSON.stringify(editImageUrls);
    }

    function removeEditImage(index) {
      editImageUrls.splice(index, 1);
      renderEditImageGrid();
    }

    let isEditingMode = false;

    function openEditUploadModal(index = 0) {
      isEditingMode = true;
      currentImageUploadIndex = index;
      const m = document.getElementById('image-upload-modal');
      m.classList.remove('hidden'); m.classList.add('flex');
      setTimeout(() => document.getElementById('image-upload-content').classList.remove('scale-95'), 10);
    }

    function openEditModal(productId) {
      const product = currentInventory.find(p => p.id === productId);
      if (!product) return;
      
      document.getElementById('edit-product-id').value = product.id;
      document.getElementById('edit-title').value = product.title;
      document.getElementById('edit-desc').value = product.description || '';
      
      editImageUrls = product.image_urls ? [...product.image_urls] : (product.image_url ? [product.image_url] : []);
      renderEditImageGrid();
      
      const isLocal = product.origin_country === 'Zambia';
      if (isLocal) {
        document.getElementById('edit-price-tzs-container').classList.add('hidden');
        document.getElementById('edit-price-zmw-container').classList.remove('hidden');
        document.getElementById('edit-price-zmw').value = product.price_zmw;
      } else {
        document.getElementById('edit-price-tzs-container').classList.remove('hidden');
        document.getElementById('edit-price-zmw-container').classList.add('hidden');
        document.getElementById('edit-price-tzs').value = product.price_tzs;
      }
      
      document.getElementById('edit-modal').classList.remove('hidden');
      document.getElementById('edit-modal').classList.add('flex');
    }
    
    function closeEditModal() {
      document.getElementById('edit-modal').classList.add('hidden');
      document.getElementById('edit-modal').classList.remove('flex');
    }
    
    async function submitEditForm(e) {
      e.preventDefault();
      const productId = document.getElementById('edit-product-id').value;
      const title = document.getElementById('edit-title').value;
      const desc = document.getElementById('edit-desc').value;
      const priceTzs = document.getElementById('edit-price-tzs').value;
      const priceZmw = document.getElementById('edit-price-zmw').value;
      
      const product = currentInventory.find(p => p.id === productId);
      if (!product) return;
      
      const btn = document.getElementById('btn-save-edit');
      btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>`;
      btn.disabled = true;
      
      try {
        const payload = {
          product_id: productId,
          title: title,
          description: desc,
          origin_country: product.origin_country,
          category: product.category,
          sub_category: product.sub_category,
          sub_sub_category: product.sub_sub_category,
          weight_kg: product.weight_kg,
          origin_city: product.origin_city
        };
        
        if (!document.getElementById('edit-price-tzs-container').classList.contains('hidden')) {
          payload.price_tzs = parseFloat(priceTzs);
        } else {
          payload.price_zmw_input = parseFloat(priceZmw);
        }
        
        payload.image_urls = editImageUrls;
        if (editImageUrls.length > 0) payload.image_url = editImageUrls[0];
        
        const res = await fetch('/api/v1/products/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.success) {
          alert('Listing updated successfully!');
          closeEditModal();
          loadInventoryForShop(); // Refresh list
        } else {
          alert('Update failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Update failed due to network error.');
        console.error(err);
      } finally {
        btn.innerHTML = `Save Changes`;
        btn.disabled = false;
      }
    }

