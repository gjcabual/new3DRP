// Authentication UI components and handlers

let authModalOpen = false;

/**
 * Show authentication modal
 * @param {Function} onSuccess - Callback when auth succeeds
 */
function showAuthModal(onSuccess) {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'flex';
    authModalOpen = true;
    
    // Disable camera look controls
    disableCameraControls();
    
    // Focus on email input
    setTimeout(() => {
      const emailInput = document.getElementById('auth-email');
      if (emailInput) {
        emailInput.focus();
      }
    }, 100);
  }
}

/**
 * Hide authentication modal
 */
function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'none';
    authModalOpen = false;
    // Clear form
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-error').textContent = '';
    document.getElementById('auth-success').textContent = '';
    
    // Re-enable camera look controls
    enableCameraControls();
  }
}

/**
 * Switch between sign in and sign up views
 */
function switchAuthMode() {
  const isSignUp = document.getElementById('auth-modal').dataset.mode === 'signup';
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const switchBtn = document.getElementById('auth-switch-btn');
  const switchText = document.getElementById('auth-switch-text');
  if (isSignUp) {
    // Switch to sign in
    modal.dataset.mode = 'signin';
    title.textContent = 'Sign In';
    submitBtn.textContent = 'Sign In';
    switchBtn.textContent = 'Sign Up';
    switchText.textContent = "Don't have an account?";
  } else {
    // Switch to sign up
    modal.dataset.mode = 'signup';
    title.textContent = 'Sign Up';
    submitBtn.textContent = 'Sign Up';
    switchBtn.textContent = 'Sign In';
    switchText.textContent = 'Already have an account?';
  }

  // Clear error messages
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').textContent = '';
}

/**
 * Handle authentication form submission
 */
async function handleAuthSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  const successEl = document.getElementById('auth-success');
  const submitBtn = document.getElementById('auth-submit-btn');
  const isSignUp = document.getElementById('auth-modal').dataset.mode === 'signup';

  // Clear previous messages
  errorEl.textContent = '';
  successEl.textContent = '';

  // Validation
  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }

  // Disable button during request
  submitBtn.disabled = true;
  submitBtn.textContent = isSignUp ? 'Signing Up...' : 'Signing In...';

  try {
    let result;
    if (isSignUp) {
      result = await signUp(email, password);
    } else {
      result = await signIn(email, password);
    }

    if (result.success) {
      successEl.textContent = isSignUp 
        ? 'Account created successfully! You can now save your room plan.' 
        : 'Signed in successfully!';
      
      setTimeout(() => {
        hideAuthModal();
      }, 1500);
    } else {
      errorEl.textContent = result.error || 'Authentication failed';
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
  } catch (error) {
    errorEl.textContent = 'An error occurred. Please try again.';
    submitBtn.disabled = false;
    submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
  }
}

/**
 * Update UI based on auth state
 */
async function updateAuthUI() {
  const isAuthenticated = await checkAuth();
  const user = await getCurrentUser();
  const costPanel = document.getElementById('cost-panel');

  // Cost panel is now always visible, regardless of authentication status
  if (costPanel) {
    costPanel.classList.remove('hidden');
  }

  if (typeof updateProfileMenu === 'function') {
    await updateProfileMenu(isAuthenticated, user);
  }
}

/**
 * Initialize auth UI
 */
function initAuthUI() {
  // Update UI on page load
  updateAuthUI();

  // Listen for auth state changes
  onAuthStateChange((event, session) => {
    updateAuthUI();
  });

  // Close modal when clicking outside
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideAuthModal();
      }
    });
  }

  // Allow Enter key to submit form
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  if (emailInput && passwordInput) {
    [emailInput, passwordInput].forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleAuthSubmit();
        }
      });
      
      // Stop propagation when input is focused to prevent movement
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
      
      input.addEventListener('keyup', (e) => {
        e.stopPropagation();
      });
    });
  }
}

/**
 * Disable camera look controls when modal is open
 */
function disableCameraControls() {
  const camera = document.querySelector('a-camera');
  if (camera) {
    const lookControls = camera.getAttribute('look-controls');
    if (lookControls) {
      // Store original enabled state
      const wasEnabled = typeof lookControls === 'object' 
        ? (lookControls.enabled !== false)
        : (lookControls !== 'false' && lookControls !== false);
      
      camera.setAttribute('data-original-look-enabled', wasEnabled ? 'true' : 'false');
      // Disable look controls
      camera.setAttribute('look-controls', 'enabled', false);
    }
  }
}

/**
 * Enable camera look controls when modal is closed
 */
function enableCameraControls() {
  const camera = document.querySelector('a-camera');
  if (camera) {
    const originalEnabled = camera.getAttribute('data-original-look-enabled');
    if (originalEnabled !== null) {
      // Restore original state
      const shouldEnable = originalEnabled === 'true';
      camera.setAttribute('look-controls', 'enabled', shouldEnable);
      camera.removeAttribute('data-original-look-enabled');
    } else {
      // Just re-enable if no original state stored (default behavior)
      camera.setAttribute('look-controls', 'enabled', true);
    }
  }
}

