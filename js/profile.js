// Profile page functionality

/**
 * Initialize profile page
 */
async function initProfile() {
  // Check authentication
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    window.location.href = 'planner.html';
    return;
  }

  await loadProfileData();
}

/**
 * Load user profile and saved plans
 */
async function loadProfileData() {
  try {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';

    // Get user profile
    const profile = await getUserProfile();
    if (!profile) {
      throw new Error('Could not load user profile');
    }

    // Display profile info
    document.getElementById('profile-email').textContent = profile.email || '-';
    document.getElementById('profile-role').textContent = profile.role === 'admin' ? 'Admin' : 'User';
    document.getElementById('profile-created').textContent = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '-';

    // Load saved cost estimations
    const estimations = typeof getSavedCostEstimations === 'function' 
      ? getSavedCostEstimations() 
      : [];
    document.getElementById('profile-plans-count').textContent = estimations.length;

    // Display estimations
    renderPlans(estimations);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-info').style.display = 'block';
    document.getElementById('plans-section').style.display = 'block';
  } catch (error) {
    console.error('Error loading profile:', error);
    showError(`Error loading profile: ${error.message}`);
    document.getElementById('loading').style.display = 'none';
  }
}

/**
 * Render saved room plans
 */
function renderPlans(plans) {
  const container = document.getElementById('plans-list');
  container.innerHTML = '';

  if (plans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📭 No saved cost estimations yet</p>
        <p>Create your first cost estimation in the planner!</p>
      </div>
    `;
    return;
  }

  plans.forEach(estimation => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.dataset.planId = estimation.id;

    const createdDate = estimation.createdAt
      ? new Date(estimation.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    const estimationName = estimation.name || 'Unnamed Cost Estimation';
    const totalCost = estimation.costTotal ?? 0;
    const totalCostDisplay = formatCurrency(totalCost);
    const roomWidth = estimation.roomWidth ?? '-';
    const roomLength = estimation.roomLength ?? '-';
    const furnitureCount = estimation.furnitureCount ?? 0;
    const costItems = estimation.costItems || {};

    // Build cost breakdown HTML
    const costBreakdown = Object.keys(costItems).length > 0
      ? Object.entries(costItems).map(([modelKey, item]) => {
          const itemTotal = (item.unitCost || item.price || 0) * (item.qty || 0);
          return `
            <div class="cost-breakdown-item">
              <span>${item.name || modelKey}</span>
              <span>${item.qty || 0} × ${formatCurrency(item.unitCost || item.price || 0)} = ${formatCurrency(itemTotal)}</span>
            </div>
          `;
        }).join('')
      : '<div class="cost-breakdown-empty">No items in this estimation</div>';

    card.innerHTML = `
      <div class="plan-header">
        <div>
          <div class="plan-name">${estimationName}</div>
          <div class="plan-date">Created: ${createdDate}</div>
        </div>
        <div class="plan-total">
          <span>Total Estimated Cost</span>
          <strong>${totalCostDisplay}</strong>
        </div>
      </div>
      <div class="plan-details">
        <div class="plan-detail-item">
          <label>Room Size</label>
          <div class="value">${roomWidth}M × ${roomLength}M</div>
        </div>
        <div class="plan-detail-item">
          <label>Furniture Items</label>
          <div class="value">${furnitureCount} items</div>
        </div>
        <div class="plan-detail-item">
          <label>Cost Breakdown</label>
          <div class="cost-breakdown">
            ${costBreakdown}
          </div>
        </div>
      </div>
      <div class="plan-actions">
        <button class="btn-danger" onclick="deletePlan('${estimation.id}')">
          🗑️ Delete
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

/**
 * Delete a room plan
 * @param {string} planId - Plan ID
 */
async function deletePlan(planId) {
  const confirmed = await showConfirm('Delete this saved cost estimation?', 'Confirm Delete');
  if (!confirmed) {
    return;
  }

  try {
    if (typeof deleteCostEstimation === 'function') {
      deleteCostEstimation(planId);
    } else {
      throw new Error('Delete function not available');
    }
    await loadProfileData();
  } catch (error) {
    console.error('Error deleting cost estimation:', error);
    await showDialog('Error deleting cost estimation: ' + error.message, 'Error');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  const result = await signOut();
  if (result.success) {
    window.location.href = 'planner.html';
  } else {
    await showDialog('Error signing out: ' + result.error, 'Error');
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

// Initialize on page load
window.addEventListener('load', async () => {
  await initProfile();
});

function formatCurrency(value) {
  const number = Number(value) || 0;
  return `₱${number.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

