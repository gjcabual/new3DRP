// Supabase client initialization
const SUPABASE_URL = 'https://mbambqhpvpftwjalrvtf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYW1icWhwdnBmdHdqYWxydnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDkxNDgsImV4cCI6MjA3OTAyNTE0OH0.2jg3Ar7CU5vJSNqw-XbYuwIOagrMCsyMRfIQdzLc8nw';

// Initialize Supabase client (supabase is global from CDN)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make supabase available globally for other scripts
window.supabase = supabase;

