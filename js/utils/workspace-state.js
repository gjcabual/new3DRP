// Workspace state utility - can be used from any page

/**
 * Go back to planner using browser history
 * This preserves the page state and keeps items in the workspace
 */
function goBackToPlanner() {
  // Save state using collectRoomPlanData if available (best UX)
  if (typeof collectRoomPlanData === 'function') {
    try {
      const roomPlanData = collectRoomPlanData();
      localStorage.setItem('currentRoomState', JSON.stringify({
        ...roomPlanData,
        costState: typeof costState !== 'undefined' ? costState : { items: {}, total: 0 },
        furnitureCounter: typeof furnitureCounter !== 'undefined' ? furnitureCounter : 0
      }));
      console.log('Room state saved before navigation using collectRoomPlanData');
    } catch (error) {
      console.error('Error saving room state before navigation:', error);
    }
  } else if (typeof window.saveWorkspaceState === 'function') {
    // Fallback to saveWorkspaceState
    try {
      window.saveWorkspaceState();
      console.log('Workspace state saved before navigation');
    } catch (error) {
      console.error('Error saving workspace state before navigation:', error);
    }
  }
  
  // Use browser history to go back
  // This preserves the page state and keeps all items in the workspace
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Fallback to direct navigation if no history
    window.location.href = 'planner.html';
  }
}

// Expose globally
window.goBackToPlanner = goBackToPlanner;

