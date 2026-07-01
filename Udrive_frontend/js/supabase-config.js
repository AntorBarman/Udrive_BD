// Supabase Configuration
const SUPABASE_URL = 'https://fexlbeisbmrfkmowmoyl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QCr5ByAnNJOfMuOJnywv_g_AHzWoLrd';

// Initialize Client with Safety Check
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase connected successfully in config!");
} else {
    console.error("Supabase script not loaded in HTML");
}

// Database Table Names (MAPPED TO YOUR ACTUAL DATABASE)
const DB_TABLES = {
    USERS: 'profiles',            // Use 'profiles' if you ran my SQL. Use 'users' if you have a users table.
    CARS: 'cars',
    BOOKINGS: 'bookings',
    BRANCHES: 'branches',
    PAYMENTS: 'payments',
    KYC_DOCUMENTS: 'kyc_verifications', // <--- THIS IS THE IMPORTANT FIX
    WALLETS: 'wallet_transactions',
    EARNER_APPLICATIONS: 'earner_applications',
    REVIEWS: 'reviews',
    NOTIFICATIONS: 'notifications'
};

window.DB_TABLES = DB_TABLES;

// Helper Functions
async function getCurrentUser() {
    if (!window.supabaseClient) return null;
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    return user;
}

async function getUserProfile(userId) {
    if (!window.supabaseClient) return null;
    
    // Fetch from the table defined above
    const { data, error } = await window.supabaseClient
        .from(DB_TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.warn('UserProfile not found (This is normal for new users):', error.message);
        return null;
    }
    return data;
}

window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;