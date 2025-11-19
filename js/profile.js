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

    // Load saved plans
    const plans = getLocalRoomPlans();
    document.getElementById('profile-plans-count').textContent = plans.length;

    // Display plans
    renderPlans(plans);

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
        <p>📭 No saved plans yet</p>
        <p>Create your first room plan in the planner!</p>
      </div>
    `;
    return;
  }

  plans.forEach(plan => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.dataset.planId = plan.id;

    const createdDate = plan.createdAt
      ? new Date(plan.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    const planName = plan.name || 'Unnamed Plan';
    const planCost = plan.costTotal ?? plan.cost_total ?? 0;
    const totalCostDisplay = formatCurrency(planCost);
    const roomWidth = plan.roomWidth ?? plan.room_width ?? '-';
    const roomLength = plan.roomLength ?? plan.room_length ?? '-';
    const furnitureCount = plan.furnitureData?.length ?? plan.furniture_data?.length ?? 0;
    const snapshotFileName = plan.snapshotFileName || 'Not downloaded';

    card.innerHTML = `
      <div class="plan-header">
        <div>
          <div class="plan-name">${planName}</div>
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
          <label>File Name</label>
          <div class="value">${snapshotFileName}</div>
        </div>
      </div>
      <div class="plan-actions">
        <button class="btn-danger" onclick="deletePlan('${plan.id}')">
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
  if (!confirm('Delete this saved snapshot?')) {
    return;
  }

  try {
    deleteLocalRoomPlan(planId);
    await loadProfileData();
  } catch (error) {
    console.error('Error deleting plan:', error);
    alert('Error deleting plan: ' + error.message);
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
    alert('Error signing out: ' + result.error);
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

