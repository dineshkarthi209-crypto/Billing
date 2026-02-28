// ===== MENU =====

const DEFAULT_MENUS = [
  { id: 'idly',   name: 'Idly',   price: 30, category: 'Breakfast', emoji: '🫓', image: null, totalStock: null },
  { id: 'dhosa',  name: 'Dhosa',  price: 50, category: 'Breakfast', emoji: '🥙', image: null, totalStock: null },
  { id: 'poori',  name: 'Poori',  price: 40, category: 'Breakfast', emoji: '🫔', image: null, totalStock: null },
  { id: 'pongal', name: 'Pongal', price: 45, category: 'Breakfast', emoji: '🍲', image: null, totalStock: null },
  { id: 'vada',   name: 'Vada',   price: 25, category: 'Snacks',    emoji: '🍩', image: null, totalStock: null },
  { id: 'tea',    name: 'Tea',    price: 15, category: 'Beverages', emoji: '🍵', image: null, totalStock: null },
  { id: 'coffee', name: 'Coffee', price: 20, category: 'Beverages', emoji: '☕', image: null, totalStock: null },
  { id: 'snacks', name: 'Snacks', price: 35, category: 'Snacks',    emoji: '🥨', image: null, totalStock: null },
];

function getMenus() {
  const menus = lsGet('restaurant_menus', null);
  if (!menus) { lsSet('restaurant_menus', DEFAULT_MENUS); return DEFAULT_MENUS; }
  return menus;
}

function renderMenu(filter = '') {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  const menus = getMenus();
  const cart = lsGet('restaurant_cart', []);
  const filtered = filter
    ? menus.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()) || m.category.toLowerCase().includes(filter.toLowerCase()))
    : menus;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)"><i class="fa fa-search fa-2x" style="margin-bottom:12px;display:block"></i>No items found.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const inCart = cart.find(c => c.id === item.id);
    const qty = inCart ? inCart.qty : 0;
    const stock = (item.totalStock != null && item.totalStock !== '') ? parseInt(item.totalStock) : null;
    const outOfStock = stock !== null && stock === 0;

    let stockBadge = '';
    if (stock !== null) {
      stockBadge = outOfStock
        ? `<span class="stock-badge out">Out of Stock</span>`
        : `<span class="stock-badge">Stock: ${stock}</span>`;
    }

    const imgContent = item.image ? `<img src="${item.image}" alt="${item.name}" />` : `<span>${item.emoji || '🍛'}</span>`;

    let footerControls;
    if (qty > 0) {
      footerControls = `
        <div class="menu-qty-controls" onclick="event.stopPropagation()">
          <button class="menu-qty-btn minus" onclick="menuSubtract('${item.id}')">−</button>
          <span class="menu-qty-num">${qty}</span>
          <button class="menu-qty-btn plus" onclick="addToCart('${item.id}')">+</button>
        </div>`;
    } else {
      footerControls = `<button class="add-btn" onclick="event.stopPropagation();addToCart('${item.id}')" ${outOfStock ? 'disabled' : ''}>+</button>`;
    }

    return `
      <div class="menu-card${outOfStock ? ' out-of-stock' : ''}" data-id="${item.id}">
        <div class="menu-card-image">${imgContent}${stockBadge}</div>
        <div class="menu-card-body">
          <div class="menu-card-name">${item.name}</div>
          <div class="menu-card-category">${item.category}</div>
          <div class="menu-card-footer">
            <div class="menu-card-price">₹${item.price}</div>
            ${footerControls}
          </div>
        </div>
      </div>`;
  }).join('');
}

function menuSubtract(id) {
  const cart = getCart();
  const existing = cart.find(c => c.id === id);
  if (!existing) return;
  existing.qty -= 1;
  if (existing.qty <= 0) cart.splice(cart.indexOf(existing), 1);
  saveCart(cart);
  renderMenu(document.getElementById('menuSearch').value);
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('menuSearch');
  if (searchInput) searchInput.addEventListener('input', e => renderMenu(e.target.value));
});
