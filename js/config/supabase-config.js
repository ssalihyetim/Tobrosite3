/**
 * Supabase Configuration and Client Setup
 * Replace these with your actual Supabase project credentials
 */

const SUPABASE_CONFIG = {
    // TODO: Replace with your actual Supabase URL and API key
    url: 'https://nnnkszlkdinsfousfkzu.supabase.co', // e.g., 'https://xyzcompany.supabase.co'
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubmtzemxrZGluc2ZvdXNma3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTA3MjQsImV4cCI6MjA2NjUyNjcyNH0.QpHBtgRIrB-XOXZ1Eov0Pc7zgjbew8uROEtuqZVey-Y', // Your public anon key
    
    // Storage bucket names
    buckets: {
        rfq_files: 'rfq-files',
        cad_files: 'cad-files',
        documents: 'documents'
    },
    
    // Database table names
    tables: {
        customers: 'customers',
        rfqs: 'rfqs',
        parts: 'parts',
        quotes: 'quotes',
        files: 'files',
        timeline_entries: 'timeline_entries',
        settings: 'admin_settings'
    }
};

/**
 * Initialize Supabase client
 * This will be available globally as window.supabase
 */
let supabaseClient = null;

function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase JavaScript library not loaded. Please include the Supabase CDN script.');
        return null;
    }
    
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('Supabase not configured. Please update SUPABASE_CONFIG with your project credentials.');
        return null;
    }
    
    try {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('Supabase client initialized successfully');
        return supabaseClient;
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
}

/**
 * Get the Supabase client instance
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = initializeSupabase();
    }
    return supabaseClient;
}

// Make configuration available globally immediately
if (typeof window !== 'undefined') {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.getSupabaseClient = getSupabaseClient;
    window.initializeSupabase = initializeSupabase;
    
    // Initialize client on load
    window.addEventListener('DOMContentLoaded', function() {
        window.supabase = getSupabaseClient();
    });
    
    // Also try to initialize immediately if DOM is already ready
    if (document.readyState !== 'loading') {
        window.supabase = getSupabaseClient();
    }
}

// Export for Node.js environment (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        initializeSupabase,
        getSupabaseClient
    };
} 