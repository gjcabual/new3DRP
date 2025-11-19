// Authentication functions using Supabase

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} role - User role ('user' or 'admin'), defaults to 'user'
 * @returns {Promise<Object>} - {success: boolean, data: Object, error: string}
 */
async function signUp(email, password, role = 'user') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Create user profile in users table if auth.users was created
    if (data.user) {
      // Validate role (default to 'user' for security)
      const userRole = (role === 'admin' || role === 'user') ? role : 'user';
      
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          role: userRole,
        });

      if (profileError && profileError.code !== '23505') {
        // Ignore duplicate key error (user might already exist)
        console.warn('Error creating user profile:', profileError);
      }
    }

    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - {success: boolean, data: Object, error: string}
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} - {success: boolean, error: string}
 */
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} - User object or null
 */
async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user profile with role
 * @returns {Promise<Object|null>} - User profile with role or null
 */
async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} - True if authenticated
 */
async function checkAuth() {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if user is an admin
 * @returns {Promise<boolean>} - True if user is admin
 */
async function isAdmin() {
  const profile = await getUserProfile();
  return profile && profile.role === 'admin';
}

/**
 * Listen for auth state changes
 * @param {Function} callback - Callback function to call on auth state change
 * @returns {Function} - Unsubscribe function
 */
function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

