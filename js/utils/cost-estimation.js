// Cost Estimation utility for saving and loading cost estimation data

const LOCAL_COST_ESTIMATIONS_KEY = 'localCostEstimations';

/**
 * Get all saved cost estimations
 * @returns {Array} - Array of saved cost estimations
 */
function getSavedCostEstimations() {
  try {
    const raw = localStorage.getItem(LOCAL_COST_ESTIMATIONS_KEY);
    const estimations = raw ? JSON.parse(raw) : [];
    return Array.isArray(estimations) ? estimations : [];
  } catch (error) {
    console.warn('Error parsing saved cost estimations:', error);
    return [];
  }
}

/**
 * Save cost estimations to localStorage
 * @param {Array} estimations - Array of cost estimations
 */
function saveCostEstimations(estimations) {
  localStorage.setItem(LOCAL_COST_ESTIMATIONS_KEY, JSON.stringify(estimations));
}

/**
 * Add a new cost estimation
 * @param {Object} estimation - Cost estimation object
 * @returns {Array} - Updated array of estimations
 */
function addCostEstimation(estimation) {
  const estimations = getSavedCostEstimations();
  estimations.unshift(estimation);
  saveCostEstimations(estimations);
  return estimations;
}

/**
 * Delete a cost estimation by ID
 * @param {string} id - Estimation ID
 * @returns {Array} - Updated array of estimations
 */
function deleteCostEstimation(id) {
  const estimations = getSavedCostEstimations().filter(est => est.id !== id);
  saveCostEstimations(estimations);
  return estimations;
}

/**
 * Save current cost estimation
 * @param {string} name - Project name
 * @returns {Object} - Saved estimation object
 */
function saveCostEstimation(name) {
  const roomWidth = parseFloat(localStorage.getItem('roomWidth')) || 10;
  const roomLength = parseFloat(localStorage.getItem('roomLength')) || 10;
  
  // Get current cost state (must be available globally)
  const costItems = typeof costState !== 'undefined' ? costState.items : {};
  const costTotal = typeof costState !== 'undefined' ? costState.total : 0;
  
  // Count furniture items
  const furnitureContainer = document.getElementById('furniture-container');
  let furnitureCount = 0;
  if (furnitureContainer) {
    furnitureCount = furnitureContainer.querySelectorAll('[id^="furniture-"]').length;
  }
  
  const estimation = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    name: name || `Cost Estimation ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    roomWidth: roomWidth,
    roomLength: roomLength,
    costItems: JSON.parse(JSON.stringify(costItems)), // Deep copy
    costTotal: costTotal,
    furnitureCount: furnitureCount
  };
  
  addCostEstimation(estimation);
  return estimation;
}

// Expose functions globally
window.getSavedCostEstimations = getSavedCostEstimations;
window.deleteCostEstimation = deleteCostEstimation;
window.saveCostEstimation = saveCostEstimation;

