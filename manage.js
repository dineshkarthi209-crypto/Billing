// ===== MANAGE MENUS =====

function renderManageList() {
  const menus = getMenus();
  const el = document.getElementById('manageList');
  if (!el) return;

  if (menus.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No menu items yet. Add one!</div>`;
    return;
  }

  el.innerHTML = menus.map(item => {
    const stock = (item.totalStock != null && item.totalStock !== '') ? parseInt(item.totalStock) : null;
    const stockDisplay = stock === null
      ? `<span class="manage-stock-pill unlimited">Unlimited</span>`
      : stock === 0
        ? `<span class="manage-stock-pill out">Out</span>`
        : `<span class="manage-stock-pill available">${stock} left</span>`;

    return `
    <div class="manage-item">
      <div class="manage-item-emoji">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : (item.emoji || '🍛')}
      </div>
      <div class="manage-item-info">
        <div class="manage-item-name">${item.name}</div>
        <div class="manage-item-meta d-flex align-items-center gap-2 flex-wrap">
          <span>${item.category}</span>
          ${stockDisplay}
        </div>
      </div>
      <span class="manage-item-price">₹${item.price}</span>
      <div class="manage-actions">
        <button class="btn btn-sm btn-outline-primary" title="Edit" onclick="editItem('${item.id}')"><i class="fa fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-warning" title="Update Stock" onclick="quickStockEdit('${item.id}')"><i class="fa fa-cubes"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteItem('${item.id}')"><i class="fa fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function editItem(id) {
  const item = getMenus().find(m => m.id === id);
  if (!item) return;

  document.getElementById('editId').value = item.id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemCategory').value = item.category;
  document.getElementById('itemEmoji').value = item.emoji || '';
  document.getElementById('itemStock').value = (item.totalStock != null) ? item.totalStock : '';
  document.getElementById('formTitle').textContent = 'Edit Item';
  document.getElementById('submitBtn').textContent = 'Update Item';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';

  const preview = document.getElementById('imagePreview');
  if (item.image) {
    preview.innerHTML = `<img src="${item.image}" style="max-width:100%;border-radius:10px;max-height:120px;object-fit:cover" />`;
  } else {
    preview.innerHTML = '';
  }
  document.getElementById('manageFormCard').scrollIntoView({ behavior: 'smooth' });
}

function quickStockEdit(id) {
  const item = getMenus().find(m => m.id === id);
  if (!item) return;
  const current = (item.totalStock != null) ? item.totalStock : '';
  const val = prompt(`Update stock for "${item.name}"\nEnter number (leave blank for unlimited):`, current);
  if (val === null) return; // cancelled
  const menus = getMenus();
  const idx = menus.findIndex(m => m.id === id);
  if (idx !== -1) {
    menus[idx].totalStock = val.trim() === '' ? null : parseInt(val);
    lsSet('restaurant_menus', menus);
    renderManageList();
    showToast('Stock updated!', 'success');
  }
}

function deleteItem(id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  const menus = getMenus().filter(m => m.id !== id);
  lsSet('restaurant_menus', menus);
  renderManageList();
  const cart = getCart().filter(c => c.id !== id);
  saveCart(cart);
  showToast('Item deleted', 'info');
}

function resetForm() {
  document.getElementById('menuForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').textContent = 'Add New Item';
  document.getElementById('submitBtn').textContent = 'Add Item';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('imagePreview').innerHTML = '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('itemImage')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    document.getElementById('imagePreview').innerHTML = `<img src="${b64}" style="max-width:100%;border-radius:10px;max-height:120px;object-fit:cover" />`;
  });

  document.getElementById('cancelEditBtn')?.addEventListener('click', resetForm);

  document.getElementById('menuForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const name = document.getElementById('itemName').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const emoji = document.getElementById('itemEmoji').value.trim() || '🍛';
    const stockVal = document.getElementById('itemStock').value.trim();
    const totalStock = stockVal === '' ? null : parseInt(stockVal);
    const imageFile = document.getElementById('itemImage').files[0];

    let image = null;
    if (imageFile) {
      image = await fileToBase64(imageFile);
    } else if (editId) {
      const existing = getMenus().find(m => m.id === editId);
      image = existing?.image || null;
    }

    const menus = getMenus();

    if (editId) {
      const idx = menus.findIndex(m => m.id === editId);
      if (idx !== -1) {
        menus[idx] = { ...menus[idx], name, price, category, emoji, image, totalStock };
        lsSet('restaurant_menus', menus);
        showToast('Item updated!', 'success');
      }
    } else {
      const newItem = { id: generateId(), name, price, category, emoji, image, totalStock };
      menus.push(newItem);
      lsSet('restaurant_menus', menus);
      showToast('Item added!', 'success');
    }

    resetForm();
    renderManageList();
  });
});
