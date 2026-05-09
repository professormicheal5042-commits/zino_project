// ── SUPABASE CLIENT INITIALIZATION ───────────────────────────────
// IMPORTANT: Replace these with your actual Supabase project details
// You can find them in Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://xjsoxlfsojlsoafpovht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqc294bGZzb2psc29hZnBvdmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTE0OTAsImV4cCI6MjA5Mzc4NzQ5MH0.GUaXto93eAHc-obMnODuanfbgydr1B7xpmNCGPrVOcA';

// Load Supabase from CDN (Ensure <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> is in your HTML)
let supabase;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("Supabase SDK is not loaded. Ensure the CDN script is correct and unblocked.");
}

// ── AUTHENTICATION WRAPPERS ───────────────────────────────────────

/**
 * Register a new user with Email and Password
 * In Supabase, if email confirmations are ON, this sends an OTP or Magic Link via Pingram
 */
async function registerUser(email, password, metadata = {}) {
  if (!supabase) throw new Error("Authentication failed: Supabase connection not established. Please disable adblockers or check your connection.");
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: metadata // e.g., { name: 'John', username: 'johndoe' }
    }
  });
  
  if (error) throw error;
  return data;
}

/**
 * Login existing user with Email and Password
 */
async function loginUser(email, password) {
  if (!supabase) throw new Error("Authentication failed: Supabase connection not established. Please disable adblockers or check your connection.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Verify 6-digit OTP code sent to user's email
 */
async function verifyOTPCode(email, token, type = 'signup') {
  if (!supabase) throw new Error("Authentication failed: Supabase connection not established. Please disable adblockers or check your connection.");
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: token,
    type: type // 'signup', 'magiclink', or 'recovery'
  });
  
  if (error) throw error;
  return data;
}

/**
 * Logout user
 */
async function logoutUser() {
  if (!supabase) throw new Error("Authentication failed: Supabase connection not established. Please disable adblockers or check your connection.");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Check if a user is currently logged in
 */
async function getCurrentSession() {
  if (!supabase) throw new Error("Authentication failed: Supabase connection not established. Please disable adblockers or check your connection.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
