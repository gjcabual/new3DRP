// Admin panel functionality

let allItems = [];
let itemPrices = {};

/**
 * Initialize admin panel
 */
async function initAdmin() {
  // Check if user is admin
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    showError('Access denied. Admin privileges required.');
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    return;
  }

  // Load all items data
  await loadAllItems();
}

/**
 * Load all items and prices
 */
async function loadAllItems() {
  try {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';

    // Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .order('category, model_key');

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      // No items found, but don't throw error - allow adding items
      allItems = [];
      itemPrices = {};
      populateItemSelector();
      document.getElementById('loading').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
      return;
    }

    allItems = items;

    // Fetch all prices
    const itemIds = items.map(item => item.id);
    const { data: prices, error: pricesError } = await supabase
      .from('item_prices')
      .select('*')
      .in('item_id', itemIds)
      .order('item_id, store_name');

    if (pricesError) {
      throw pricesError;
    }

    // Organize prices by item_id and store
    itemPrices = {};
    items.forEach(item => {
      itemPrices[item.id] = {};
    });

    if (prices) {
      prices.forEach(price => {
        if (!itemPrices[price.item_id]) {
          itemPrices[price.item_id] = {};
        }
        itemPrices[price.item_id][price.store_name] = price;
      });
    }

    // Populate item selector for adding prices
    populateItemSelector();

    // Render all item cards
    renderAllItems();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
  } catch (error) {
    console.error('Error loading items:', error);
    showError(`Error loading data: ${error.message}`);
    document.getElementById('loading').style.display = 'none';
  }
}

/**
 * Populate item selector dropdown
 */
function populateItemSelector() {
  const select = document.getElementById('price-item-select');
  if (!select) return;

  select.innerHTML = '<option value="">Select an item...</option>';
  
  allItems.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} (${item.model_key})`;
    select.appendChild(option);
  });
}

/**
 * Render all items with prices
 */
function renderAllItems() {
  const container = document.getElementById('items-list');
  if (!container) return;

  container.innerHTML = '';

  if (allItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No items found. Add your first item above!</p>';
    return;
  }

  // Group items by category
  const itemsByCategory = {};
  allItems.forEach(item => {
    const category = item.category || 'Other';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });

  // Render items grouped by category
  Object.keys(itemsByCategory).sort().forEach(category => {
    const categorySection = document.createElement('div');
    categorySection.className = 'category-section';
    categorySection.innerHTML = `<h3 style="color: #666; margin-bottom: 15px; font-size: 18px;">${category}</h3>`;
    
    const categoryItems = document.createElement('div');
    
    itemsByCategory[category].forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.itemId = item.id;

      // Calculate estimated price
      const prices = itemPrices[item.id] || {};
      const priceValues = Object.values(prices).map(p => p.price);
      const estimatedPrice = priceValues.length > 0 && priceValues.some(p => p > 0)
        ? (priceValues.reduce((a, b) => a + b, 0) / priceValues.length).toFixed(2)
        : 0;

      // Get all store names for this item
      const storeNames = Object.keys(prices).sort();
      const defaultStores = ['All-Home', 'Wilcon Depot', 'Gaisano', 'Local suppliers'];
      const allStoreNames = [...new Set([...defaultStores, ...storeNames])];

      card.innerHTML = `
        <div class="item-header">
          <div>
            <h3>${item.name || item.model_key}</h3>
            <div class="item-meta">Model Key: ${item.model_key} | Category: ${item.category || 'N/A'}</div>
          </div>
          <div class="estimated-price">
            <span class="estimated-price-label">Estimated Price:</span>
            ₱${parseFloat(estimatedPrice).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        <div class="stores-section">
          <div class="stores-title">Store Prices:</div>
          ${allStoreNames.map(storeName => {
            const price = prices[storeName];
            const priceValue = price ? price.price : 0;
            return `
              <div class="store-row">
                <div class="store-name">${storeName}:</div>
                <div class="store-input-group">
                  <span>₱</span>
                  <input 
                    type="number" 
                    value="${priceValue}" 
                    min="0" 
                    step="0.01"
                    data-item-id="${item.id}"
                    data-store-name="${storeName}"
                    onchange="handlePriceChange('${item.id}', '${storeName}', this.value)"
                  />
                  <button class="btn-save" onclick="savePrice('${item.id}', '${storeName}')">Save</button>
                  <span class="save-status" id="status-${item.id}-${storeName}"></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      categoryItems.appendChild(card);
    });
    
    categorySection.appendChild(categoryItems);
    container.appendChild(categorySection);
  });
}

/**
 * Handle price change
 */
function handlePriceChange(itemId, storeName, value) {
  // Update local state
  const priceValue = parseFloat(value) || 0;
  if (!itemPrices[itemId]) {
    itemPrices[itemId] = {};
  }
  if (!itemPrices[itemId][storeName]) {
    itemPrices[itemId][storeName] = {
      item_id: itemId,
      store_name: storeName,
      price: priceValue
    };
  } else {
    itemPrices[itemId][storeName].price = priceValue;
  }

  // Update estimated price display
  updateEstimatedPrice(itemId);
}

/**
 * Save price to database
 */
async function savePrice(itemId, storeName) {
  try {
    const priceData = itemPrices[itemId][storeName];
    if (!priceData || priceData.price < 0) {
      throw new Error('Invalid price');
    }

    const statusEl = document.getElementById(`status-${itemId}-${storeName}`);
    statusEl.textContent = 'Saving...';
    statusEl.className = 'save-status';

    // Check if price exists
    const { data: existing } = await supabase
      .from('item_prices')
      .select('id')
      .eq('item_id', itemId)
      .eq('store_name', storeName)
      .single();

    let result;
    if (existing) {
      // Update existing price
      result = await supabase
        .from('item_prices')
        .update({
          price: priceData.price,
          updated_at: new Date().toISOString()
        })
        .eq('item_id', itemId)
        .eq('store_name', storeName);
    } else {
      // Insert new price
      result = await supabase
        .from('item_prices')
        .insert({
          item_id: itemId,
          store_name: storeName,
          price: priceData.price
        });
    }

    if (result.error) {
      throw result.error;
    }

    statusEl.textContent = 'Saved!';
    statusEl.className = 'save-status success';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);

    // Recalculate estimated price
    updateEstimatedPrice(itemId);
  } catch (error) {
    console.error('Error saving price:', error);
    const statusEl = document.getElementById(`status-${itemId}-${storeName}`);
    statusEl.textContent = 'Error!';
    statusEl.className = 'save-status error';
  }
}

/**
 * Update estimated price display
 */
function updateEstimatedPrice(itemId) {
  const prices = itemPrices[itemId] || {};
  const priceValues = Object.values(prices).map(p => p.price).filter(p => p > 0);
  const estimatedPrice = priceValues.length > 0
    ? (priceValues.reduce((a, b) => a + b, 0) / priceValues.length).toFixed(2)
    : 0;

  const card = document.querySelector(`[data-item-id="${itemId}"]`);
  if (card) {
    const estimatedEl = card.querySelector('.estimated-price');
    if (estimatedEl) {
      estimatedEl.innerHTML = `
        <span class="estimated-price-label">Estimated Price:</span>
        ₱${parseFloat(estimatedPrice).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
      `;
    }
  }
}

/**
 * Add new item
 */
async function addNewItem() {
  const modelKey = document.getElementById('new-item-model-key').value.trim();
  const name = document.getElementById('new-item-name').value.trim();
  const category = document.getElementById('new-item-category').value;
  const modelPath = document.getElementById('new-item-model-path').value.trim();

  const statusEl = document.getElementById('add-item-status');

  // Validation
  if (!modelKey || !name) {
    statusEl.textContent = 'Please fill in Model Key and Name';
    statusEl.className = 'save-status error';
    return;
  }

  statusEl.textContent = 'Adding...';
  statusEl.className = 'save-status';

  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        model_key: modelKey,
        name: name,
        category: category || null,
        model_file_path: modelPath || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Clear form
    document.getElementById('new-item-model-key').value = '';
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-category').value = 'Tables';
    document.getElementById('new-item-model-path').value = '';

    // Reload items
    await loadAllItems();

    statusEl.textContent = 'Item added successfully!';
    statusEl.className = 'save-status success';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error adding item:', error);
    statusEl.textContent = 'Error: ' + (error.message || 'Failed to add item');
    statusEl.className = 'save-status error';
  }
}

/**
 * Add price to item
 */
async function addPriceToItem() {
  const itemId = document.getElementById('price-item-select').value;
  const storeName = document.getElementById('price-store-name').value.trim();
  const priceAmount = parseFloat(document.getElementById('price-amount').value);

  const statusEl = document.getElementById('add-price-status');

  // Validation
  if (!itemId) {
    statusEl.textContent = 'Please select an item';
    statusEl.className = 'save-status error';
    return;
  }

  if (!storeName) {
    statusEl.textContent = 'Please enter store name';
    statusEl.className = 'save-status error';
    return;
  }

  if (!priceAmount || priceAmount < 0) {
    statusEl.textContent = 'Please enter a valid price';
    statusEl.className = 'save-status error';
    return;
  }

  statusEl.textContent = 'Adding...';
  statusEl.className = 'save-status';

  try {
    // Check if price exists
    const { data: existing } = await supabase
      .from('item_prices')
      .select('id')
      .eq('item_id', itemId)
      .eq('store_name', storeName)
      .single();

    let result;
    if (existing) {
      // Update existing price
      result = await supabase
        .from('item_prices')
        .update({
          price: priceAmount,
          updated_at: new Date().toISOString()
        })
        .eq('item_id', itemId)
        .eq('store_name', storeName);
    } else {
      // Insert new price
      result = await supabase
        .from('item_prices')
        .insert({
          item_id: itemId,
          store_name: storeName,
          price: priceAmount
        });
    }

    if (result.error) {
      throw result.error;
    }

    // Clear form
    document.getElementById('price-store-name').value = '';
    document.getElementById('price-amount').value = '';

    // Reload items
    await loadAllItems();

    statusEl.textContent = 'Price added successfully!';
    statusEl.className = 'save-status success';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error adding price:', error);
    statusEl.textContent = 'Error: ' + (error.message || 'Failed to add price');
    statusEl.className = 'save-status error';
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('error');
  const errorText = document.getElementById('error-text');
  errorText.textContent = message;
  errorEl.style.display = 'block';
}

/**
 * Handle sign out
 */
async function handleSignOut() {
  const result = await signOut();
  if (result.success) {
    window.location.href = 'planner.html';
  } else {
    alert('Error signing out: ' + result.error);
  }
}

// Initialize on page load
window.addEventListener('load', async () => {
  // Check authentication first
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    window.location.href = 'planner.html';
    return;
  }

  await initAdmin();
});

