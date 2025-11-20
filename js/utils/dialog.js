// Dialog utility for replacing browser alerts, confirms, and prompts

/**
 * Show a simple dialog with a message and OK button
 * @param {string} message - Message to display
 * @param {string} title - Optional title (default: "Alert")
 * @returns {Promise<void>}
 */
function showDialog(message, title = 'Alert') {
  return new Promise((resolve) => {
    const modal = document.getElementById('dialog-modal');
    const content = document.getElementById('dialog-content');
    const titleEl = document.getElementById('dialog-title');
    const messageEl = document.getElementById('dialog-message');
    const buttonsEl = document.getElementById('dialog-buttons');
    
    if (!modal || !content) {
      // Fallback to native alert if dialog not found
      alert(message);
      resolve();
      return;
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Clear previous buttons and add OK button
    buttonsEl.innerHTML = '<button id="dialog-ok-btn" class="dialog-btn dialog-btn-primary">OK</button>';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Handle OK button
    const okBtn = document.getElementById('dialog-ok-btn');
    const closeDialog = () => {
      modal.style.display = 'none';
      resolve();
    };
    
    okBtn.onclick = closeDialog;
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeDialog();
      }
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  });
}

/**
 * Show a confirmation dialog with Yes/No buttons
 * @param {string} message - Message to display
 * @param {string} title - Optional title (default: "Confirm")
 * @returns {Promise<boolean>} - true if confirmed, false if cancelled
 */
function showConfirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const modal = document.getElementById('dialog-modal');
    const content = document.getElementById('dialog-content');
    const titleEl = document.getElementById('dialog-title');
    const messageEl = document.getElementById('dialog-message');
    const buttonsEl = document.getElementById('dialog-buttons');
    
    if (!modal || !content) {
      // Fallback to native confirm if dialog not found
      const result = confirm(message);
      resolve(result);
      return;
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Clear previous buttons and add Yes/No buttons
    buttonsEl.innerHTML = `
      <button id="dialog-cancel-btn" class="dialog-btn dialog-btn-secondary">Cancel</button>
      <button id="dialog-confirm-btn" class="dialog-btn dialog-btn-primary">Yes</button>
    `;
    
    // Show modal
    modal.style.display = 'flex';
    
    // Handle buttons
    const confirmBtn = document.getElementById('dialog-confirm-btn');
    const cancelBtn = document.getElementById('dialog-cancel-btn');
    
    const closeDialog = (result) => {
      modal.style.display = 'none';
      resolve(result);
    };
    
    confirmBtn.onclick = () => closeDialog(true);
    cancelBtn.onclick = () => closeDialog(false);
    
    // Close on backdrop click (treat as cancel)
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeDialog(false);
      }
    };
    
    // Close on Escape key (treat as cancel)
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeDialog(false);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  });
}

/**
 * Show a prompt dialog with an input field
 * @param {string} message - Message to display
 * @param {string} defaultValue - Default input value
 * @param {string} title - Optional title (default: "Input")
 * @returns {Promise<string|null>} - Input value or null if cancelled
 */
function showPrompt(message, defaultValue = '', title = 'Input') {
  return new Promise((resolve) => {
    const modal = document.getElementById('dialog-modal');
    const content = document.getElementById('dialog-content');
    const titleEl = document.getElementById('dialog-title');
    const messageEl = document.getElementById('dialog-message');
    const buttonsEl = document.getElementById('dialog-buttons');
    
    if (!modal || !content) {
      // Fallback to native prompt if dialog not found
      const result = prompt(message, defaultValue);
      resolve(result);
      return;
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Create input field
    const inputContainer = document.createElement('div');
    inputContainer.className = 'dialog-input-container';
    inputContainer.innerHTML = `
      <input type="text" id="dialog-input" class="dialog-input" value="${defaultValue || ''}" />
    `;
    
    // Insert input after message
    const existingInput = messageEl.nextElementSibling;
    if (existingInput && existingInput.classList.contains('dialog-input-container')) {
      existingInput.remove();
    }
    messageEl.after(inputContainer);
    
    // Clear previous buttons and add OK/Cancel buttons
    buttonsEl.innerHTML = `
      <button id="dialog-cancel-btn" class="dialog-btn dialog-btn-secondary">Cancel</button>
      <button id="dialog-ok-btn" class="dialog-btn dialog-btn-primary">OK</button>
    `;
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus input
    setTimeout(() => {
      const input = document.getElementById('dialog-input');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
    
    // Handle buttons
    const okBtn = document.getElementById('dialog-ok-btn');
    const cancelBtn = document.getElementById('dialog-cancel-btn');
    const input = document.getElementById('dialog-input');
    
    const closeDialog = (result) => {
      // Remove input container
      const inputContainer = document.querySelector('.dialog-input-container');
      if (inputContainer) {
        inputContainer.remove();
      }
      modal.style.display = 'none';
      resolve(result);
    };
    
    okBtn.onclick = () => {
      const value = input.value.trim();
      closeDialog(value || null);
    };
    
    cancelBtn.onclick = () => closeDialog(null);
    
    // Handle Enter key
    const enterHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        okBtn.click();
      }
    };
    if (input) {
      input.addEventListener('keydown', enterHandler);
    }
    
    // Close on backdrop click (treat as cancel)
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeDialog(null);
      }
    };
    
    // Close on Escape key (treat as cancel)
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeDialog(null);
        document.removeEventListener('keydown', escapeHandler);
        if (input) {
          input.removeEventListener('keydown', enterHandler);
        }
      }
    };
    document.addEventListener('keydown', escapeHandler);
  });
}

// Expose globally
window.showDialog = showDialog;
window.showConfirm = showConfirm;
window.showPrompt = showPrompt;

