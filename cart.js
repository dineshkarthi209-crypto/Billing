// ===== CART =====

function getCart() { return lsGet('restaurant_cart', []); }
function saveCart(cart) { lsSet('restaurant_cart', cart); updateCartBadge(); }

function addToCart(id) {
  const menus = getMenus();
  const item = menus.find(m => m.id === id);
  if (!item) return;

  // Stock check
  const stock = (item.totalStock != null && item.totalStock !== '') ? parseInt(item.totalStock) : null;
  const cart = getCart();
  const existing = cart.find(c => c.id === id);
  const currentQtyInCart = existing ? existing.qty : 0;
  if (stock !== null && currentQtyInCart >= stock) {
    showToast(`Only ${stock} "${item.name}" available!`, 'error');
    return;
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: item.id, name: item.name, price: item.price, emoji: item.emoji, image: item.image, qty: 1 });
  }
  saveCart(cart);
  showToast(`${item.name} added to cart`, 'success');
  if (document.getElementById('page-menu').classList.contains('active')) {
    renderMenu(document.getElementById('menuSearch')?.value || '');
  }
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(c => c.id === id);
  if (!item) return;
  if (delta > 0) {
    // Check stock before increasing
    const menus = getMenus();
    const menuItem = menus.find(m => m.id === id);
    const stock = menuItem && menuItem.totalStock != null ? parseInt(menuItem.totalStock) : null;
    if (stock !== null && item.qty >= stock) {
      showToast(`Only ${stock} "${item.name}" available!`, 'error');
      return;
    }
  }
  item.qty += delta;
  if (item.qty <= 0) cart.splice(cart.indexOf(item), 1);
  saveCart(cart);
  renderCart();
}

function removeFromCart(id) {
  saveCart(getCart().filter(c => c.id !== id));
  renderCart();
}

function clearCart() {
  saveCart([]);
  renderCart();
  showToast('Cart cleared', 'info');
}

function getCartTotals() {
  const settings = getRestaurantSettings();
  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxEnabled = settings.taxEnabled !== false;
  const tax = taxEnabled ? subtotal * (settings.taxRate / 100) : 0;
  const total = subtotal + tax;
  return { subtotal, tax, total, taxEnabled };
}

function updateCartBadge() {
  const count = getCart().reduce((s, i) => s + i.qty, 0);
  ['cartBadge', 'cartBadgeMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
}

function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById('cartItems');
  const emptyMsg = document.getElementById('emptyCartMsg');

  if (cart.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    if (itemsEl) itemsEl.innerHTML = '';
  } else {
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (itemsEl) {
      itemsEl.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-emoji">${item.image ? `<img src="${item.image}" alt="${item.name}" />` : (item.emoji || '🍛')}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-unit">₹${item.price} each</div>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          </div>
          <div class="cart-item-total">${formatCurrency(item.price * item.qty)}</div>
          <button class="remove-btn" onclick="removeFromCart('${item.id}')"><i class="fa fa-trash"></i></button>
        </div>`).join('');
    }
  }
  const { subtotal, tax, total, taxEnabled } = getCartTotals();
  const settings = getRestaurantSettings();
  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('taxAmount').textContent = taxEnabled ? formatCurrency(tax) : '—';
  const taxRow = document.getElementById('taxRow');
  if (taxRow) taxRow.style.opacity = taxEnabled ? '1' : '0.4';
  const taxLabel = document.getElementById('taxLabel');
  if (taxLabel) taxLabel.textContent = taxEnabled ? `Tax (${settings.taxRate}%)` : 'Tax (disabled)';
  document.getElementById('totalAmount').textContent = formatCurrency(total);
  // Sync the toggle checkbox state
  const toggle = document.getElementById('taxToggle');
  if (toggle) toggle.checked = taxEnabled;
}

function buildBillHTML(order = null) {
  // If order object passed, use it; else build from current cart
  let items, subtotal, tax, total, tableNo, customerName, orderId, dateStr, timeStr;
  const settings = getRestaurantSettings();
  if (order) {
    items = order.items;
    subtotal = order.subtotal;
    tax = order.tax;
    total = order.total;
    tableNo = order.tableNo || '—';
    customerName = order.customerName || 'Guest';
    orderId = (order.id || '').toUpperCase();
    const d = new Date(order.date);
    dateStr = d.toLocaleDateString('en-IN');
    timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } else {
    const cart = getCart();
    const totals = getCartTotals();
    items = cart;
    subtotal = totals.subtotal;
    tax = totals.tax;
    total = totals.total;
    tableNo = document.getElementById('tableNumber').value || '—';
    customerName = document.getElementById('customerName').value || 'Guest';
    const now = new Date();
    orderId = 'ORD-' + now.getTime().toString().slice(-6);
    dateStr = now.toLocaleDateString('en-IN');
    timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  // Payment status badge
  let paymentBadge = '';
  if (order) {
    if (order.paymentStatus === 'part') {
      const paid = order.paidAmount || 0;
      const balance = total - paid;
      paymentBadge = `
        <div class="receipt-payment-status part">
          <div>Part Payment</div>
          <div>Paid: ${formatCurrency(paid)} | Balance: ${formatCurrency(balance)}</div>
        </div>`;
    } else if (order.paymentStatus === 'full') {
      paymentBadge = `<div class="receipt-payment-status full">✅ Fully Paid</div>`;
    }
  }

  return `
    <div class="receipt">
      <div class="receipt-header">
        <div class="receipt-logo">${settings.logo}</div>
        <div class="receipt-name">${settings.name}</div>
        <div class="receipt-tagline">${settings.tagline}</div>
        <div class="receipt-meta">
          <span>${settings.address}</span>
          <span>📞 ${settings.phone}</span>
        </div>
        <div class="receipt-meta" style="margin-top:8px">
          <span>Order: <strong>#${orderId}</strong></span>
          <span>Table: <strong>${tableNo}</strong> | Customer: <strong>${customerName}</strong></span>
          <span>${dateStr} ${timeStr}</span>
        </div>
      </div>
      <div class="receipt-items">
        ${items.map(item => `
          <div class="receipt-item">
            <span class="receipt-item-name">${item.name}</span>
            <span class="receipt-item-qty">×${item.qty}</span>
            <span class="receipt-item-price">${formatCurrency(item.price * item.qty)}</span>
          </div>`).join('')}
      </div>
      <hr class="receipt-divider" />
      <div class="receipt-summary">
        <div class="summary-line"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${(order ? order.taxEnabled !== false : settings.taxEnabled !== false) ? `<div class="summary-line"><span>Tax (${(order ? order.taxRate : null) || settings.taxRate}%)</span><span>${formatCurrency(tax)}</span></div>` : `<div class="summary-line" style="opacity:0.4"><span>Tax</span><span>Not Applicable</span></div>`}
      </div>
      <div class="receipt-total"><span>Total</span><span>${formatCurrency(total)}</span></div>
      ${paymentBadge}
      <div class="receipt-footer">
        <div>UPI: ${settings.upiId}</div>
        <div class="thank-you">Thank you for dining with us! 🙏</div>
        <div style="margin-top:6px">Visit again soon</div>
      </div>
    </div>`;
}

function openCheckout() {
  const cart = getCart();
  if (cart.length === 0) { showToast('Cart is empty!', 'error'); return; }
  const settings = getRestaurantSettings();
  const { total } = getCartTotals();

  document.getElementById('billPreview').innerHTML = buildBillHTML();

  const qrContainer = document.getElementById('qrCode');
  qrContainer.innerHTML = '';
  document.getElementById('upiDisplay').textContent = settings.upiId || '';

  if (settings.qrImage) {
    // Use uploaded QR image
    qrContainer.innerHTML = `<img src="${settings.qrImage}" alt="QR Code" style="width:180px;height:180px;object-fit:contain;border-radius:10px;border:2px solid #eee" />`;
  } else {
    // Auto-generate from UPI ID
    const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.name)}&am=${total.toFixed(2)}&cu=INR`;
    try {
      new QRCode(qrContainer, { text: upiUrl, width: 180, height: 180, colorDark: '#1A1208', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    } catch (e) {
      qrContainer.innerHTML = `<div style="padding:20px;font-size:0.8rem;color:#999">QR unavailable<br/>${upiUrl}</div>`;
    }
  }

  new bootstrap.Modal(document.getElementById('checkoutModal')).show();
}

function printBill() {
  document.getElementById('printArea').innerHTML = buildBillHTML();
  window.print();
}

// Deduct stock after payment
function deductStock(cartItems) {
  const menus = getMenus();
  let changed = false;
  cartItems.forEach(cartItem => {
    const idx = menus.findIndex(m => m.id === cartItem.id);
    if (idx !== -1 && menus[idx].totalStock != null && menus[idx].totalStock !== '') {
      menus[idx].totalStock = Math.max(0, parseInt(menus[idx].totalStock) - cartItem.qty);
      changed = true;
    }
  });
  if (changed) lsSet('restaurant_menus', menus);
}

function confirmPayment() {
  const cart = getCart();
  const { subtotal, tax, total } = getCartTotals();
  const settings = getRestaurantSettings();
  const tableNo = document.getElementById('tableNumber').value || '';
  const customerName = (document.getElementById('customerName').value || 'Guest').trim();
  const now = new Date().toISOString();

  const orders = lsGet('restaurant_orders', []);
  const order = {
    id: generateId(),
    date: now,
    items: cart.map(i => ({ ...i })),
    subtotal, tax, total,
    tableNo, customerName,
    taxRate: settings.taxRate,
    taxEnabled: settings.taxEnabled !== false,
    paymentStatus: 'full',
    paidAmount: total
  };
  orders.push(order);
  lsSet('restaurant_orders', orders);

  // Deduct stock
  deductStock(cart);

  // Update customer account
  updateCustomerAccount(customerName, order);

  clearCart();
  document.getElementById('tableNumber').value = '';
  document.getElementById('customerName').value = '';

  bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
  showToast('Payment confirmed! Order saved.', 'success');
  navigateTo('reports');
}

// Part payment from checkout modal
function confirmPartPayment() {
  const cart = getCart();
  if (cart.length === 0) return;
  const { subtotal, tax, total } = getCartTotals();
  const settings = getRestaurantSettings();
  const tableNo = document.getElementById('tableNumber').value || '';
  const customerName = (document.getElementById('customerName').value || 'Guest').trim();
  const partAmtStr = document.getElementById('partPaymentAmt').value;
  const partAmt = parseFloat(partAmtStr) || 0;
  if (partAmt <= 0 || partAmt >= total) {
    showToast('Enter a valid partial amount (less than total)', 'error');
    return;
  }
  const now = new Date().toISOString();
  const orders = lsGet('restaurant_orders', []);
  const order = {
    id: generateId(),
    date: now,
    items: cart.map(i => ({ ...i })),
    subtotal, tax, total,
    tableNo, customerName,
    taxRate: settings.taxRate,
    taxEnabled: settings.taxEnabled !== false,
    paymentStatus: 'part',
    paidAmount: partAmt
  };
  orders.push(order);
  lsSet('restaurant_orders', orders);

  deductStock(cart);
  updateCustomerAccount(customerName, order);

  clearCart();
  document.getElementById('tableNumber').value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('partPaymentAmt').value = '';

  bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
  showToast(`Part payment ₹${partAmt.toFixed(2)} recorded. Balance: ₹${(total - partAmt).toFixed(2)}`, 'info');
  navigateTo('reports');
}

// Customer account management
function updateCustomerAccount(customerName, order) {
  if (!customerName || customerName === 'Guest') return;
  const accounts = lsGet('restaurant_accounts', {});
  const key = customerName.toLowerCase().trim();
  if (!accounts[key]) {
    accounts[key] = { name: customerName, orders: [], totalBilled: 0, totalPaid: 0 };
  }
  accounts[key].orders.push(order.id);
  accounts[key].totalBilled += order.total;
  accounts[key].totalPaid += order.paidAmount || order.total;
  accounts[key].name = customerName; // keep latest casing
  lsSet('restaurant_accounts', accounts);
}

function toggleTax() {
  const settings = getRestaurantSettings();
  settings.taxEnabled = !settings.taxEnabled;
  saveRestaurantSettings(settings);
  renderCart();
  showToast(settings.taxEnabled ? 'Tax enabled' : 'Tax disabled', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
  document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);
  document.getElementById('printBillBtn')?.addEventListener('click', printBill);
  document.getElementById('confirmPaymentBtn')?.addEventListener('click', confirmPayment);
  document.getElementById('confirmPartPayBtn')?.addEventListener('click', confirmPartPayment);
  document.getElementById('taxToggle')?.addEventListener('change', toggleTax);

  // Toggle part payment input
  document.getElementById('partPayToggle')?.addEventListener('click', () => {
    const wrap = document.getElementById('partPayWrap');
    wrap.classList.toggle('d-none');
  });
});
