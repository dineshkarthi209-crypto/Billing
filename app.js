// ===== APP =====

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');

  if (page === 'menu') renderMenu();
  if (page === 'cart') renderCart();
  if (page === 'reports') renderReports(currentPeriod || 'daily');
  if (page === 'manage') renderManageList();
  if (page === 'settings') {
    renderSettingsPage();
    renderLivePreview();
  }
}

function renderLivePreview() {
  const s = getDraftSettings ? getDraftSettings() : getRestaurantSettings();
  const el = document.getElementById('settingsPreviewReceipt');
  if (!el) return;
  const taxEnabled = s.taxEnabled !== false;
  const taxRate = parseFloat(s.taxRate) || 5;
  el.innerHTML = `
    <div class="preview-receipt">
      <div class="preview-receipt-top">
        <div class="preview-logo">${s.logo || '🍛'}</div>
        <div class="preview-name">${s.name || 'Restaurant Name'}</div>
        <div class="preview-tagline">${s.tagline || ''}</div>
        <div class="preview-addr">${(s.address || '').replace(/\n/g, ', ')}</div>
        <div class="preview-phone">${s.phone || ''}</div>
      </div>
      <div class="preview-divider">- - - - - - - - - - - - - -</div>
      <div class="preview-row"><span>Sample Item ×2</span><span>₹100.00</span></div>
      <div class="preview-row"><span>Another Item ×1</span><span>₹60.00</span></div>
      <div class="preview-divider">- - - - - - - - - - - - - -</div>
      <div class="preview-row text-muted"><span>Subtotal</span><span>₹160.00</span></div>
      ${taxEnabled
        ? `<div class="preview-row text-muted"><span>Tax (${taxRate}%)</span><span>₹${(160 * taxRate / 100).toFixed(2)}</span></div>`
        : `<div class="preview-row text-muted" style="opacity:0.4"><span>Tax</span><span>Not Applicable</span></div>`}
      <div class="preview-total"><span>Total</span><span>₹${(160 + (taxEnabled ? 160 * taxRate / 100 : 0)).toFixed(2)}</span></div>
      <div class="preview-divider">- - - - - - - - - - - - - -</div>
      <div class="preview-upi">UPI: ${s.upiId || 'yourname@upi'}</div>
      <div class="preview-thanks">Thank you! 🙏</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebarInfo();
  updateCartBadge();

  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  document.querySelector('.cart-btn-mobile[data-page]')?.addEventListener('click', function() {
    navigateTo(this.dataset.page);
  });

  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  });

  document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  });

  // Tax preset buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tax-preset');
    if (!btn) return;
    const rate = btn.dataset.rate;
    const input = document.getElementById('setTaxRate');
    if (input) {
      input.value = rate;
      document.querySelectorAll('.tax-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      livePreviewSettings();
    }
  });

  // setTaxEnabled toggle shows/hides rate section
  document.getElementById('setTaxEnabled')?.addEventListener('change', function() {
    const wrap = document.getElementById('taxRateWrap');
    const note = document.getElementById('taxDisabledNote');
    if (this.checked) {
      wrap.style.display = 'block';
      note.style.display = 'none';
    } else {
      wrap.style.display = 'none';
      note.style.display = 'block';
    }
    livePreviewSettings();
    renderLivePreview();
  });

  // Live preview on any settings input change
  ['setRestName','setTagline','setAddress','setPhone','setUpiId','setLogo','setTaxRate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      renderLivePreview();
    });
  });

  renderMenu();
});
