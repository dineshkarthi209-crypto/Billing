// ===== SETTINGS PAGE =====

function renderSettingsPage() {
  const s = getRestaurantSettings();

  // Fill form fields
  document.getElementById('setRestName').value = s.name || '';
  document.getElementById('setTagline').value = s.tagline || '';
  document.getElementById('setAddress').value = s.address || '';
  document.getElementById('setPhone').value = s.phone || '';
  document.getElementById('setUpiId').value = s.upiId || '';
  document.getElementById('setLogo').value = s.logo || '🍛';
  document.getElementById('setTaxRate').value = s.taxRate != null ? s.taxRate : 5;
  document.getElementById('setTaxEnabled').checked = s.taxEnabled !== false;

  // Show uploaded QR if any
  renderQRPreview(s);

  // Live preview
  updateSettingsPreview(s);
}

function renderQRPreview(s) {
  const previewWrap = document.getElementById('qrImagePreview');
  if (s.qrImage) {
    previewWrap.innerHTML = `
      <div class="qr-upload-preview">
        <img src="${s.qrImage}" alt="QR Code" id="qrPreviewImg" />
        <div class="qr-upload-actions mt-2 d-flex gap-2 justify-content-center">
          <label class="btn btn-sm btn-outline-primary" for="qrImageInput">
            <i class="fa fa-pen me-1"></i>Change QR
          </label>
          <button class="btn btn-sm btn-outline-danger" onclick="removeQRImage()">
            <i class="fa fa-trash me-1"></i>Remove
          </button>
        </div>
      </div>`;
  } else {
    previewWrap.innerHTML = `
      <div class="qr-upload-empty">
        <i class="fa fa-qrcode fa-2x mb-2 d-block opacity-40"></i>
        <div class="mb-2" style="font-size:0.85rem;color:var(--text-muted)">Upload your payment QR code image</div>
        <label class="btn btn-outline-primary btn-sm" for="qrImageInput">
          <i class="fa fa-upload me-1"></i>Upload QR Image
        </label>
      </div>`;
  }
}

function removeQRImage() {
  const s = getRestaurantSettings();
  delete s.qrImage;
  saveRestaurantSettings(s);
  renderQRPreview(s);
  showToast('QR image removed', 'info');
}

function updateSettingsPreview(s) {
  const name = s.name || 'Restaurant Name';
  const address = s.address || 'Address';
  const phone = s.phone || 'Phone';
  const logo = s.logo || '🍛';
  const taxEnabled = s.taxEnabled !== false;
  const taxRate = s.taxRate || 5;

  // Sidebar live update
  const brandNameEl = document.querySelector('.brand-name');
  if (brandNameEl) brandNameEl.textContent = name;
  const pageTitleEl = document.querySelector('.mobile-brand');
  if (pageTitleEl) pageTitleEl.textContent = name;
  const logoIconEl = document.querySelector('.logo-icon');
  if (logoIconEl) logoIconEl.textContent = logo;
  document.title = `${name} — POS`;
  initSidebarInfo();

  // Tax label in cart
  const taxLabel = document.getElementById('taxLabel');
  if (taxLabel) {
    taxLabel.textContent = taxEnabled ? `Tax (${taxRate}%)` : 'Tax (disabled)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // QR image file input
  document.getElementById('qrImageInput')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const s = getRestaurantSettings();
      s.qrImage = e.target.result;
      saveRestaurantSettings(s);
      renderQRPreview(s);
      showToast('QR image uploaded!', 'success');
    };
    reader.readAsDataURL(file);
  });

  // Live preview on input changes
  ['setRestName','setTagline','setAddress','setPhone','setUpiId','setLogo','setTaxRate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', livePreviewSettings);
  });
  document.getElementById('setTaxEnabled')?.addEventListener('change', livePreviewSettings);

  // Save settings form
  document.getElementById('settingsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    saveAllSettings();
  });
});

function livePreviewSettings() {
  const draft = getDraftSettings();
  updateSettingsPreview(draft);
  // Update tax label and cart totals live
  const taxLabel = document.getElementById('taxLabel');
  if (taxLabel) {
    taxLabel.textContent = draft.taxEnabled !== false ? `Tax (${draft.taxRate}%)` : 'Tax (disabled)';
  }
  const taxToggle = document.getElementById('taxToggle');
  if (taxToggle) taxToggle.checked = draft.taxEnabled !== false;
  renderCartTaxRow(draft);
}

function renderCartTaxRow(draft) {
  const taxRow = document.getElementById('taxRow');
  if (!taxRow) return;
  taxRow.style.opacity = draft.taxEnabled !== false ? '1' : '0.4';
}

function getDraftSettings() {
  const s = getRestaurantSettings();
  return {
    ...s,
    name: document.getElementById('setRestName')?.value.trim() || s.name,
    tagline: document.getElementById('setTagline')?.value.trim() || s.tagline,
    address: document.getElementById('setAddress')?.value.trim() || s.address,
    phone: document.getElementById('setPhone')?.value.trim() || s.phone,
    upiId: document.getElementById('setUpiId')?.value.trim() || s.upiId,
    logo: document.getElementById('setLogo')?.value.trim() || s.logo,
    taxRate: parseFloat(document.getElementById('setTaxRate')?.value) || 5,
    taxEnabled: document.getElementById('setTaxEnabled')?.checked !== false,
  };
}

function saveAllSettings() {
  const current = getRestaurantSettings();
  const updated = {
    ...current,
    ...getDraftSettings(),
  };
  saveRestaurantSettings(updated);
  updateSettingsPreview(updated);
  renderCart(); // recalculate totals with new tax
  showToast('Settings saved successfully!', 'success');
}

function resetSettingsToDefault() {
  if (!confirm('Reset all settings to default? This cannot be undone.')) return;
  localStorage.removeItem('restaurant_settings');
  renderSettingsPage();
  updateSettingsPreview(getRestaurantSettings());
  renderCart();
  showToast('Settings reset to default', 'info');
}
