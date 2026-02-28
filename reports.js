// ===== REPORTS =====

let currentPeriod = 'daily';

function getFilteredOrders(period) {
  const orders = lsGet('restaurant_orders', []);
  const now = new Date();
  return orders.filter(o => {
    const d = new Date(o.date);
    if (period === 'daily') return d.toDateString() === now.toDateString();
    if (period === 'weekly') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    const m = new Date(now); m.setMonth(now.getMonth() - 1); return d >= m;
  });
}

function renderReports(period = 'daily') {
  currentPeriod = period;
  const orders = getFilteredOrders(period);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalPaid = orders.reduce((s, o) => s + (o.paidAmount || o.total), 0);
  const totalBalance = totalRevenue - totalPaid;
  const orderCount = orders.length;
  const avgOrder = orderCount ? totalRevenue / orderCount : 0;

  const itemMap = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!itemMap[item.name]) itemMap[item.name] = { qty: 0, revenue: 0, emoji: item.emoji };
      itemMap[item.name].qty += item.qty;
      itemMap[item.name].revenue += item.price * item.qty;
    });
  });
  const sortedItems = Object.entries(itemMap).sort((a, b) => b[1].revenue - a[1].revenue);

  document.getElementById('reportStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Revenue</div><div class="stat-value highlight">${formatCurrency(totalRevenue)}</div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Collected</div><div class="stat-value" style="color:#2E7D32">${formatCurrency(totalPaid)}</div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-label">Balance Due</div><div class="stat-value" style="color:${totalBalance > 0 ? '#C62828' : 'inherit'}">${formatCurrency(totalBalance)}</div></div>
    <div class="stat-card"><div class="stat-icon">🧾</div><div class="stat-label">Orders</div><div class="stat-value">${orderCount}</div></div>
    <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-label">Avg. Order</div><div class="stat-value">${formatCurrency(avgOrder)}</div></div>
    <div class="stat-card"><div class="stat-icon">🍽️</div><div class="stat-label">Items Sold</div><div class="stat-value">${sortedItems.reduce((s, [, v]) => s + v.qty, 0)}</div></div>`;

  // Item-wise table
  if (sortedItems.length === 0) {
    document.getElementById('reportTable').innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No orders in this period yet.</div>`;
  } else {
    const maxRev = sortedItems[0][1].revenue;
    document.getElementById('reportTable').innerHTML = `
      <table class="report-table">
        <thead><tr><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
        <tbody>
          ${sortedItems.map(([name, data]) => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:1.2rem">${data.emoji || '🍛'}</span>
                  <div>
                    <div style="font-weight:600">${name}</div>
                    <div style="width:${Math.round((data.revenue/maxRev)*120)}px;height:4px;background:var(--saffron);border-radius:4px;margin-top:4px;opacity:0.7"></div>
                  </div>
                </div>
              </td>
              <td>${data.qty}</td>
              <td style="font-weight:700;color:var(--saffron)">${formatCurrency(data.revenue)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  renderBillsList(orders);
}

// ===== BILLS LIST =====
function renderBillsList(orders) {
  const el = document.getElementById('billsList');
  if (!el) return;

  if (orders.length === 0) {
    el.innerHTML = `<div class="text-center py-5 text-muted"><i class="fa fa-receipt fa-2x mb-3 d-block opacity-50"></i>No bills in this period.</div>`;
    return;
  }

  const sorted = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = sorted.map((order) => {
    const d = new Date(order.date);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
    const orderId = (order.id || '').slice(-6).toUpperCase();
    const paidAmt = order.paidAmount || order.total;
    const balance = order.total - paidAmt;

    let payBadge = '';
    if (order.paymentStatus === 'part') {
      payBadge = `<span class="pay-badge part">Part Paid · Bal ${formatCurrency(balance)}</span>`;
    } else {
      payBadge = `<span class="pay-badge full">Paid</span>`;
    }

    return `
      <div class="bill-list-row" id="bill-row-${order.id}">
        <div class="bill-list-id">
          <span class="bill-order-num">#${orderId}</span>
          <span class="bill-datetime">${dateStr} · ${timeStr}</span>
        </div>
        <div class="bill-list-meta">
          <span class="bill-meta-chip"><i class="fa fa-chair me-1"></i>Table ${order.tableNo || '—'}</span>
          <span class="bill-meta-chip"><i class="fa fa-user me-1"></i>${order.customerName || 'Guest'}</span>
          <span class="bill-meta-chip"><i class="fa fa-utensils me-1"></i>${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
          ${payBadge}
        </div>
        <div class="bill-list-amount">${formatCurrency(order.total)}</div>
        <div class="bill-list-actions">
          <button class="btn btn-sm btn-outline-primary" title="View" onclick="viewBillModal('${order.id}')"><i class="fa fa-eye"></i><span class="d-none d-md-inline ms-1">View</span></button>
          <button class="btn btn-sm btn-outline-success" title="Download" onclick="downloadBill('${order.id}')"><i class="fa fa-download"></i><span class="d-none d-md-inline ms-1">Download</span></button>
          <button class="btn btn-sm btn-outline-secondary" title="Print" onclick="printSavedBill('${order.id}')"><i class="fa fa-print"></i><span class="d-none d-md-inline ms-1">Print</span></button>
          <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteBill('${order.id}')"><i class="fa fa-trash"></i><span class="d-none d-md-inline ms-1">Delete</span></button>
        </div>
      </div>`;
  }).join('');
}

// ===== DELETE BILL =====
function deleteBill(id) {
  if (!confirm('Delete this bill permanently? This cannot be undone.')) return;
  let orders = lsGet('restaurant_orders', []);
  const order = orders.find(o => o.id === id);
  orders = orders.filter(o => o.id !== id);
  lsSet('restaurant_orders', orders);

  // Also update customer account balance
  if (order && order.customerName && order.customerName !== 'Guest') {
    const accounts = lsGet('restaurant_accounts', {});
    const key = order.customerName.toLowerCase().trim();
    if (accounts[key]) {
      accounts[key].orders = accounts[key].orders.filter(oid => oid !== id);
      accounts[key].totalBilled -= order.total;
      accounts[key].totalPaid -= (order.paidAmount || order.total);
      if (accounts[key].orders.length === 0) delete accounts[key];
      lsSet('restaurant_accounts', accounts);
    }
  }

  showToast('Bill deleted', 'info');
  renderReports(currentPeriod);
}

// ===== VIEW BILL MODAL =====
function buildSavedBillHTML(order) {
  return buildBillHTML(order);
}

function getOrderById(id) {
  return lsGet('restaurant_orders', []).find(o => o.id === id);
}

function viewBillModal(id) {
  const order = getOrderById(id);
  if (!order) return;
  document.getElementById('savedBillContent').innerHTML = buildSavedBillHTML(order);
  document.getElementById('savedBillDownloadBtn').onclick = () => downloadBill(id);
  document.getElementById('savedBillPrintBtn').onclick = () => printSavedBill(id);

  // Show mark payment buttons if part paid
  const markFullBtn = document.getElementById('markFullPaidBtn');
  const addPaymentWrap = document.getElementById('addPaymentWrap');
  if (order.paymentStatus === 'part') {
    const balance = order.total - (order.paidAmount || 0);
    markFullBtn.style.display = 'inline-block';
    markFullBtn.onclick = () => markFullPaid(id);
    addPaymentWrap.style.display = 'block';
    addPaymentWrap.innerHTML = `
      <div class="d-flex gap-2 align-items-center mt-2">
        <input type="number" class="form-control form-control-sm" id="addPayAmt" placeholder="Add payment ₹" min="1" max="${balance.toFixed(2)}" step="0.01" style="max-width:160px"/>
        <button class="btn btn-sm btn-warning" onclick="addPayment('${id}')"><i class="fa fa-plus me-1"></i>Add Payment</button>
        <small class="text-muted">Balance: ${formatCurrency(balance)}</small>
      </div>`;
  } else {
    markFullBtn.style.display = 'none';
    addPaymentWrap.style.display = 'none';
    addPaymentWrap.innerHTML = '';
  }

  new bootstrap.Modal(document.getElementById('viewBillModal')).show();
}

function markFullPaid(id) {
  let orders = lsGet('restaurant_orders', []);
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return;
  const order = orders[idx];
  const prevPaid = order.paidAmount || 0;
  const balance = order.total - prevPaid;
  orders[idx].paymentStatus = 'full';
  orders[idx].paidAmount = order.total;
  lsSet('restaurant_orders', orders);

  // Update customer account
  if (order.customerName && order.customerName !== 'Guest') {
    const accounts = lsGet('restaurant_accounts', {});
    const key = order.customerName.toLowerCase().trim();
    if (accounts[key]) {
      accounts[key].totalPaid += balance;
      lsSet('restaurant_accounts', accounts);
    }
  }

  showToast('Marked as fully paid!', 'success');
  bootstrap.Modal.getInstance(document.getElementById('viewBillModal')).hide();
  renderReports(currentPeriod);
}

function addPayment(id) {
  const amt = parseFloat(document.getElementById('addPayAmt').value) || 0;
  if (amt <= 0) { showToast('Enter valid amount', 'error'); return; }
  let orders = lsGet('restaurant_orders', []);
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return;
  const order = orders[idx];
  const newPaid = (order.paidAmount || 0) + amt;
  if (newPaid >= order.total) {
    orders[idx].paidAmount = order.total;
    orders[idx].paymentStatus = 'full';
  } else {
    orders[idx].paidAmount = newPaid;
    orders[idx].paymentStatus = 'part';
  }
  lsSet('restaurant_orders', orders);

  // Update customer account
  if (order.customerName && order.customerName !== 'Guest') {
    const accounts = lsGet('restaurant_accounts', {});
    const key = order.customerName.toLowerCase().trim();
    if (accounts[key]) {
      accounts[key].totalPaid += amt;
      lsSet('restaurant_accounts', accounts);
    }
  }

  showToast(`Payment of ${formatCurrency(amt)} added!`, 'success');
  bootstrap.Modal.getInstance(document.getElementById('viewBillModal')).hide();
  renderReports(currentPeriod);
}

// ===== DOWNLOAD / PRINT =====
function downloadBill(id) {
  const order = getOrderById(id);
  if (!order) return;
  const receiptHTML = buildSavedBillHTML(order);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>
      :root{--saffron:#E8722A;--dark:#1A1208;--text-muted:#A08060;}
      body{font-family:'DM Sans',sans-serif;background:#f9f9f9;display:flex;justify-content:center;padding:30px;}
      .receipt{max-width:380px;background:white;padding:32px 24px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.1);}
      .receipt-header{text-align:center;padding-bottom:20px;border-bottom:2px dashed #ddd;margin-bottom:20px;}
      .receipt-logo{font-size:2.5rem;margin-bottom:4px;}
      .receipt-name{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:900;color:var(--dark);}
      .receipt-tagline{font-size:.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:2px;margin-top:2px;}
      .receipt-meta{margin:12px 0 0;font-size:.82rem;color:var(--text-muted);}
      .receipt-meta span{display:block;}
      .receipt-item{display:flex;justify-content:space-between;font-size:.88rem;padding:6px 0;border-bottom:1px solid #F5F0EA;}
      .receipt-item-qty{color:var(--text-muted);min-width:40px;text-align:center;}
      .receipt-item-price{font-weight:600;min-width:60px;text-align:right;}
      .receipt-divider{border:none;border-top:2px dashed #ddd;margin:12px 0;}
      .summary-line{display:flex;justify-content:space-between;font-size:.88rem;padding:4px 0;color:var(--text-muted);}
      .receipt-total{display:flex;justify-content:space-between;font-size:1.1rem;font-weight:800;color:var(--dark);padding:10px 0 6px;border-top:2px solid var(--dark);}
      .receipt-payment-status{text-align:center;padding:8px 12px;border-radius:8px;font-size:.82rem;font-weight:700;margin-top:10px;}
      .receipt-payment-status.part{background:#FFF3E0;color:#E65100;}
      .receipt-payment-status.full{background:#E8F5E9;color:#2E7D32;}
      .receipt-footer{text-align:center;margin-top:20px;padding-top:16px;border-top:2px dashed #ddd;font-size:.78rem;color:var(--text-muted);}
      .thank-you{font-family:'Playfair Display',serif;font-size:1rem;font-style:italic;color:var(--saffron);margin-top:4px;}
    </style></head><body>${receiptHTML}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bill-${(order.id || 'order').slice(-6)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Bill downloaded!', 'success');
}

function printSavedBill(id) {
  const order = getOrderById(id);
  if (!order) return;
  document.getElementById('printArea').innerHTML = buildSavedBillHTML(order);
  window.print();
}

// ===== CUSTOMER ACCOUNTS =====
function renderCustomerAccounts() {
  const el = document.getElementById('customerAccountsList');
  if (!el) return;
  const accounts = lsGet('restaurant_accounts', {});
  const entries = Object.values(accounts).filter(a => a.orders && a.orders.length > 0);

  if (entries.length === 0) {
    el.innerHTML = `<div class="text-center py-5 text-muted"><i class="fa fa-users fa-2x mb-3 d-block opacity-50"></i>No customer accounts yet.<br/><small>Named customers appear here after checkout.</small></div>`;
    return;
  }

  entries.sort((a, b) => (b.totalBilled - b.totalPaid) - (a.totalBilled - a.totalPaid));

  el.innerHTML = entries.map(acc => {
    const balance = acc.totalBilled - acc.totalPaid;
    const statusClass = balance > 0 ? 'danger' : 'success';
    const statusText = balance > 0 ? `Balance Due: ${formatCurrency(balance)}` : 'Fully Settled';
    const orderCount = acc.orders.length;
    return `
      <div class="customer-account-row" onclick="viewCustomerAccount('${acc.name.replace(/'/g,"\\'")}')">
        <div class="customer-avatar">${acc.name.charAt(0).toUpperCase()}</div>
        <div class="customer-info">
          <div class="customer-name">${acc.name}</div>
          <div class="customer-meta">
            <span><i class="fa fa-receipt me-1"></i>${orderCount} order${orderCount !== 1 ? 's' : ''}</span>
            <span><i class="fa fa-indian-rupee-sign me-1"></i>Billed: ${formatCurrency(acc.totalBilled)}</span>
          </div>
        </div>
        <div class="customer-balance-info text-end">
          <div class="customer-balance text-${statusClass}">${statusText}</div>
          <div class="customer-paid-info text-muted">Paid: ${formatCurrency(acc.totalPaid)}</div>
        </div>
        <button class="btn btn-sm btn-outline-primary ms-2" onclick="event.stopPropagation();viewCustomerAccount('${acc.name.replace(/'/g,"\\'")}')">
          <i class="fa fa-eye"></i><span class="d-none d-sm-inline ms-1">View</span>
        </button>
        <button class="btn btn-sm btn-outline-danger ms-1" onclick="event.stopPropagation();deleteCustomerAccount('${acc.name.replace(/'/g,"\\'")}')">
          <i class="fa fa-trash"></i><span class="d-none d-sm-inline ms-1">Delete</span>
        </button>
      </div>`;
  }).join('');
}

function viewCustomerAccount(name) {
  const accounts = lsGet('restaurant_accounts', {});
  const key = name.toLowerCase().trim();
  const acc = accounts[key];
  if (!acc) return;

  const orders = lsGet('restaurant_orders', []);
  const custOrders = orders.filter(o => acc.orders.includes(o.id)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const balance = acc.totalBilled - acc.totalPaid;

  const modal = document.getElementById('customerAccountModal');
  document.getElementById('custAccName').textContent = acc.name;

  document.getElementById('custAccStats').innerHTML = `
    <div class="row g-2 mb-3">
      <div class="col-4">
        <div class="cust-stat-card"><div class="cust-stat-label">Total Billed</div><div class="cust-stat-val text-dark">${formatCurrency(acc.totalBilled)}</div></div>
      </div>
      <div class="col-4">
        <div class="cust-stat-card"><div class="cust-stat-label">Total Paid</div><div class="cust-stat-val text-success">${formatCurrency(acc.totalPaid)}</div></div>
      </div>
      <div class="col-4">
        <div class="cust-stat-card"><div class="cust-stat-label">Balance Due</div><div class="cust-stat-val ${balance > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(balance)}</div></div>
      </div>
    </div>`;

  document.getElementById('custAccOrders').innerHTML = custOrders.map(order => {
    const d = new Date(order.date);
    const paid = order.paidAmount || order.total;
    const bal = order.total - paid;
    const orderId = (order.id || '').slice(-6).toUpperCase();
    let payBadge = order.paymentStatus === 'part'
      ? `<span class="pay-badge part">Part Paid</span>`
      : `<span class="pay-badge full">Paid</span>`;
    return `
      <div class="cust-order-row">
        <div>
          <div style="font-weight:700;font-size:0.88rem">#${orderId}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</div>
          <div class="mt-1">${payBadge}${bal > 0 ? `<span style="font-size:0.75rem;color:#C62828;margin-left:6px">Bal: ${formatCurrency(bal)}</span>` : ''}</div>
        </div>
        <div class="text-end">
          <div style="font-weight:800;color:var(--saffron)">${formatCurrency(order.total)}</div>
          <div class="d-flex gap-1 mt-1 justify-content-end">
            <button class="btn btn-xs btn-outline-primary" onclick="viewBillModal('${order.id}')"><i class="fa fa-eye"></i></button>
            <button class="btn btn-xs btn-outline-success" onclick="downloadBill('${order.id}')"><i class="fa fa-download"></i></button>
            <button class="btn btn-xs btn-outline-secondary" onclick="printSavedBill('${order.id}')"><i class="fa fa-print"></i></button>
            <button class="btn btn-xs btn-outline-danger" onclick="deleteBillFromCustomer('${order.id}','${name.replace(/'/g,"\\'")}')"><i class="fa fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  }).join('') || `<div class="text-center text-muted py-3">No orders found.</div>`;

  // Full settlement button
  document.getElementById('settleFullBtn').style.display = balance > 0 ? 'inline-block' : 'none';
  document.getElementById('settleFullBtn').onclick = () => settleFullAccount(name);

  // Download/print full account
  document.getElementById('custAccDownloadBtn').onclick = () => downloadCustomerAccount(name);
  document.getElementById('custAccPrintBtn').onclick = () => printCustomerAccount(name);

  new bootstrap.Modal(modal).show();
}

function settleFullAccount(name) {
  const accounts = lsGet('restaurant_accounts', {});
  const key = name.toLowerCase().trim();
  const acc = accounts[key];
  if (!acc) return;
  const balance = acc.totalBilled - acc.totalPaid;
  if (balance <= 0) { showToast('Account already settled!', 'info'); return; }

  // Mark all part-paid orders as full
  let orders = lsGet('restaurant_orders', []);
  acc.orders.forEach(oid => {
    const idx = orders.findIndex(o => o.id === oid);
    if (idx !== -1 && orders[idx].paymentStatus === 'part') {
      orders[idx].paidAmount = orders[idx].total;
      orders[idx].paymentStatus = 'full';
    }
  });
  lsSet('restaurant_orders', orders);
  accounts[key].totalPaid = accounts[key].totalBilled;
  lsSet('restaurant_accounts', accounts);

  showToast(`${name}'s account fully settled!`, 'success');
  bootstrap.Modal.getInstance(document.getElementById('customerAccountModal')).hide();
  renderCustomerAccounts();
  renderReports(currentPeriod);
}

function deleteBillFromCustomer(orderId, name) {
  bootstrap.Modal.getInstance(document.getElementById('customerAccountModal'))?.hide();
  setTimeout(() => {
    deleteBill(orderId);
    setTimeout(() => viewCustomerAccount(name), 400);
  }, 400);
}

function deleteCustomerAccount(name) {
  if (!confirm(`Delete all records for "${name}"? This removes the account but keeps individual bills.`)) return;
  const accounts = lsGet('restaurant_accounts', {});
  delete accounts[name.toLowerCase().trim()];
  lsSet('restaurant_accounts', accounts);
  showToast('Customer account deleted', 'info');
  renderCustomerAccounts();
}

function buildCustomerAccountHTML(name) {
  const accounts = lsGet('restaurant_accounts', {});
  const key = name.toLowerCase().trim();
  const acc = accounts[key];
  if (!acc) return '';
  const orders = lsGet('restaurant_orders', []);
  const custOrders = orders.filter(o => acc.orders.includes(o.id)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const balance = acc.totalBilled - acc.totalPaid;
  const settings = getRestaurantSettings();

  let rows = custOrders.map(o => {
    const d = new Date(o.date);
    const paid = o.paidAmount || o.total;
    const bal = o.total - paid;
    return `<tr>
      <td>#${(o.id||'').slice(-6).toUpperCase()}</td>
      <td>${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
      <td>Table ${o.tableNo||'—'}</td>
      <td>${formatCurrency(o.total)}</td>
      <td>${formatCurrency(paid)}</td>
      <td style="color:${bal>0?'#C62828':'#2E7D32'}">${formatCurrency(bal)}</td>
      <td><span style="padding:2px 8px;border-radius:50px;font-size:0.75rem;background:${o.paymentStatus==='full'?'#E8F5E9':'#FFF3E0'};color:${o.paymentStatus==='full'?'#2E7D32':'#E65100'}">${o.paymentStatus==='full'?'Paid':'Part Paid'}</span></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>
      :root{--saffron:#E8722A;--dark:#1A1208;--text-muted:#A08060;}
      body{font-family:'DM Sans',sans-serif;background:#f9f9f9;padding:30px;max-width:800px;margin:0 auto;}
      h1{font-family:'Playfair Display',serif;color:var(--dark);}
      .logo{font-size:2rem;} .rest-name{font-size:1.4rem;font-family:'Playfair Display',serif;font-weight:900;}
      .header{text-align:center;border-bottom:2px dashed #ddd;padding-bottom:16px;margin-bottom:20px;}
      .summary{display:flex;gap:20px;margin-bottom:20px;}
      .s-card{flex:1;background:white;border-radius:10px;padding:14px;text-align:center;border:1px solid #eee;}
      .s-label{font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;}
      .s-val{font-size:1.3rem;font-weight:800;margin-top:4px;}
      table{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;}
      th{background:var(--dark);color:white;padding:10px 12px;font-size:0.8rem;text-align:left;}
      td{padding:10px 12px;font-size:0.85rem;border-bottom:1px solid #f0eae0;}
      .footer{text-align:center;margin-top:20px;font-size:0.78rem;color:var(--text-muted);}
      .thank-you{font-family:'Playfair Display',serif;font-style:italic;color:var(--saffron);}
    </style></head><body>
    <div class="header">
      <div class="logo">${settings.logo}</div>
      <div class="rest-name">${settings.name}</div>
      <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">${settings.tagline}</div>
      <div style="font-size:0.82rem;margin-top:8px;color:var(--text-muted)">${settings.address} | ${settings.phone}</div>
    </div>
    <h2 style="font-family:'Playfair Display',serif;margin-bottom:4px">Account Statement</h2>
    <p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:16px">Customer: <strong>${acc.name}</strong> | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
    <div class="summary">
      <div class="s-card"><div class="s-label">Total Billed</div><div class="s-val">${formatCurrency(acc.totalBilled)}</div></div>
      <div class="s-card"><div class="s-label">Total Paid</div><div class="s-val" style="color:#2E7D32">${formatCurrency(acc.totalPaid)}</div></div>
      <div class="s-card"><div class="s-label">Balance Due</div><div class="s-val" style="color:${balance>0?'#C62828':'#2E7D32'}">${formatCurrency(balance)}</div></div>
    </div>
    <table>
      <thead><tr><th>#Order</th><th>Date & Time</th><th>Table</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer"><div class="thank-you">Thank you for your continued patronage! 🙏</div><div style="margin-top:4px">${settings.name} · ${settings.address}</div></div>
    </body></html>`;
}

function downloadCustomerAccount(name) {
  const html = buildCustomerAccountHTML(name);
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `account-${name.replace(/\s+/g,'-').toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Account statement downloaded!', 'success');
}

function printCustomerAccount(name) {
  const html = buildCustomerAccountHTML(name);
  if (!html) return;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

// ===== REPORT TABS & CUSTOMER TAB =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reportTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-period]');
    if (!tab) return;
    document.querySelectorAll('[data-period]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const period = tab.dataset.period;
    if (period === 'customers') {
      document.getElementById('reportStats').innerHTML = '';
      document.getElementById('reportTable').innerHTML = '';
      document.getElementById('billsList').innerHTML = '';
      document.querySelector('.bills-list-wrap').style.display = 'none';
      document.querySelector('.report-table-wrap').style.display = 'none';
      document.getElementById('customerAccountsSection').style.display = 'block';
      renderCustomerAccounts();
    } else {
      document.querySelector('.bills-list-wrap').style.display = 'block';
      document.querySelector('.report-table-wrap').style.display = 'block';
      document.getElementById('customerAccountsSection').style.display = 'none';
      renderReports(period);
    }
  });
});
