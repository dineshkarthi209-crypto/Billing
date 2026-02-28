// ===== UTILS =====

function getRestaurantSettings() {
  const defaults = {
    name: 'Spice Route',
    tagline: 'Authentic Indian Cuisine',
    address: '12, Temple Street, Chennai - 600001',
    phone: '+91 98765 43210',
    upiId: 'spiceroute@upi',
    taxRate: 5,
    taxEnabled: true,
    logo: '🍛'
  };
  const saved = localStorage.getItem('restaurant_settings');
  return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function saveRestaurantSettings(settings) {
  localStorage.setItem('restaurant_settings', JSON.stringify(settings));
}

// LocalStorage helpers
function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Toast
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  const icons = { success: '✅', error: '❌', info: '🍛' };
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function formatCurrency(amount) {
  return '₹' + parseFloat(amount).toFixed(2);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Initialize sidebar info
function initSidebarInfo() {
  const s = getRestaurantSettings();
  const el = document.getElementById('restaurantInfo');
  if (el) {
    el.innerHTML = `<strong style="color:#F5ECD8;font-size:0.8rem">${s.name}</strong><br>${s.address}<br>${s.phone}`;
  }
}
