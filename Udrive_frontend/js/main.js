// ==========================================
// main.js - FULLY UPDATED & SECURED VERSION
// ==========================================

// Database Tables Constants
const DB_TABLES = {
    CARS: 'cars',
    USERS: 'users',
    BOOKINGS: 'bookings',
    REVIEWS: 'reviews',
    BRANCHES: 'branches',
    NEWSLETTER: 'newsletter_subscriptions',
    WALLETS: 'wallet_transactions'
};
window.DB_TABLES = DB_TABLES;

// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    
    // শুধুমাত্র হোমপেজের ইলিমেন্ট থাকলে লোড করবে
    if (document.getElementById('popularCars')) await loadPopularCars();
    if (document.getElementById('totalCarsCount')) await loadHomeStats();
    if (document.getElementById('featuredLocations')) await loadFeaturedLocations();
    if (document.getElementById('testimonials')) await loadTestimonials();
    
    // Update header UI based on login status (সব পেজের জন্য)
    updateAuthUI();
});

// --- 2. HEADER UPDATER & LOGOUT ---
function updateAuthUI() {
    const container = document.getElementById('header');
    if (!container) return; // হেডার ইলিমেন্ট না থাকলে রিটার্ন করবে

    const userStr = localStorage.getItem('udrive_user');
    const userObj = userStr ? JSON.parse(userStr) : null;

    let navHtml = `
        <header style="background:white; padding:15px; box-shadow:0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100;">
            <div class="container" style="display:flex; justify-content:space-between; align-items:center;">
                <a href="index.html" style="font-size:1.6rem; font-weight:bold; color:#0f766e; text-decoration:none;">
                    <i class="fas fa-car" style="color:#ef4444;"></i> Udrive
                </a>
                <div style="display:flex; gap:20px; align-items: center;">
                    <a href="search.html" style="color:#374151; text-decoration:none; font-weight:500;">Find Cars</a>
    `;

    if (userObj) {
        // লগিন করা থাকলে ইউজারের নাম এবং রোল (Role) বের করা
        const userName = userObj.user_metadata?.name || userObj.name || 'User';
        const role = userObj.user_metadata?.role || userObj.role || 'renter'; // ডিফল্ট রোল renter

        if (role === 'earner') {
            // 🟢 Earner (যিনি গাড়ি লিস্ট করবেন) এর জন্য নেভবার
            navHtml += `
                    <a href="earner-portal.html" style="color:#0f766e; font-weight:bold; text-decoration:none; margin-right:10px;">Earner Portal</a>
                    <a href="profile.html" style="color:#374151; font-weight:700; text-decoration:none; margin-right:10px;">My Profile</a>
                    <a href="#" onclick="event.preventDefault(); window.logout();" style="color:#ef4444; text-decoration:none; font-weight:bold;">Logout (${userName})</a>
            `;
        } else {
            // 🔵 Renter (যিনি গাড়ি ভাড়া নেবেন) এর জন্য নেভবার
            navHtml += `
                    <a href="dashboard.html" style="color:#0f766e; font-weight:bold; text-decoration:none; margin-right:10px;">Dashboard</a>
                    <a href="profile.html" style="color:#374151; font-weight:700; text-decoration:none; margin-right:10px;">My Profile</a>
                    <a href="bookings.html" style="color:#374151; text-decoration:none; font-weight:500;">My Bookings</a>
                    <a href="#" onclick="event.preventDefault(); window.logout();" style="color:#ef4444; text-decoration:none; font-weight:bold;">Logout (${userName})</a>
            `;
        }
    } else {
        // 🔴 লগিন না থাকলে
        navHtml += `
                    <a href="login.html" style="color:#0f766e; text-decoration:none; font-weight:bold;">Login</a>
                    <a href="register.html" class="btn btn-primary" style="padding: 8px 15px; background:#0f766e; color: white; border-radius: 5px; text-decoration:none;">Sign Up</a>
        `;
    }

    navHtml += `
                </div>
            </div>
        </header>
    `;
    
    container.innerHTML = navHtml;
}

// 🚀 গ্লোবাল লগআউট ফাংশন (যাতে সব পেজ থেকে কাজ করে)
window.logout = async function() {
    if (confirm("Are you sure you want to logout?")) {
        // লোকাল স্টোরেজ ক্লিয়ার
        localStorage.removeItem('udrive_user');
        localStorage.removeItem('udrive_token');
        
        // Supabase থেকে সাইন আউট
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        
        alert("Logged out successfully!");
        window.location.href = 'index.html'; // হোমপেজে রিডাইরেক্ট
    }
};

// --- 3. CAR DATA LOGIC ---
async function loadPopularCars() {
    const container = document.getElementById('popularCars');
    if (!container) return;
    
    try {
        if (!window.supabaseClient) return;
        const { data: cars, error } = await window.supabaseClient
            .from(DB_TABLES.CARS)
            .select('*')
            .limit(6);
        
        if (error) throw error;
        
        if (!cars || cars.length === 0) {
            container.innerHTML = '<div style="text-align:center; width:100%; color:#64748b;">No cars available at the moment.</div>';
            return;
        }
        
        container.innerHTML = cars.map(car => `
            <div class="car-card" style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
                <div class="car-image">
                    <img src="${car.image_url || (car.images && car.images[0]) || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'}" 
                         alt="${car.name}" style="width:100%; height:200px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/400x300'">
                </div>
                <div class="car-info" style="padding:15px;">
                    <h3 style="margin-bottom:10px;">${car.name || car.make + ' ' + car.model}</h3>
                    <div class="car-specs" style="color:#64748b; font-size:0.9rem; margin-bottom:15px; display:flex; gap:10px;">
                        <span><i class="fas fa-user-friends"></i> ${car.seats || 5} seats</span>
                        <span><i class="fas fa-cog"></i> ${car.transmission || 'Auto'}</span>
                    </div>
                    <div class="car-price" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="price" style="font-weight:bold; color:#0f766e; font-size:1.1rem;">৳${car.price || car.daily_rate}<span>/day</span></div>
                        <a href="car-details.html?id=${car.id}" class="btn btn-primary" style="font-size:0.9rem; padding:8px 15px; background:#0f766e; color:white; border-radius:5px; text-decoration:none;">View Details</a>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading cars:', error);
        container.innerHTML = `<p style="color:red; text-align:center;">Failed to load popular cars.</p>`;
    }
}

// --- 4. STATS & LOCATIONS & TESTIMONIALS ---
async function loadHomeStats() {
    try {
        if (!window.supabaseClient) return;
        const { count: totalCars } = await window.supabaseClient.from(DB_TABLES.CARS).select('*', { count: 'exact', head: true });
        const { count: totalBookings } = await window.supabaseClient.from(DB_TABLES.BOOKINGS).select('*', { count: 'exact', head: true });
        
        if(document.getElementById('totalCarsCount')) animateCounter(document.getElementById('totalCarsCount'), totalCars || 120);
        if(document.getElementById('totalBookingsCount')) animateCounter(document.getElementById('totalBookingsCount'), totalBookings || 450);
        if(document.getElementById('totalUsersCount')) animateCounter(document.getElementById('totalUsersCount'), 1200);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function animateCounter(element, target) {
    let current = 0;
    const increment = Math.ceil(target / 50) || 1;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = current;
        }
    }, 30);
}

async function loadFeaturedLocations() {
    const container = document.getElementById('featuredLocations');
    if (!container) return;

    try {
        const { data: locations, error } = await window.supabaseClient
            .from(DB_TABLES.BRANCHES)
            .select('*')
            .eq('status', 'active');
        
        if (error) throw error;
        
        if(locations && locations.length > 0) {
            container.innerHTML = locations.map(loc => `
                <div class="location-card" style="text-align:center; padding:20px; border:1px solid #e2e8f0; border-radius:8px;">
                    <div class="location-icon" style="font-size:2rem; color:#ef4444; margin-bottom:10px;"><i class="fas fa-map-marker-alt"></i></div>
                    <h4 style="margin-bottom:5px;">${loc.name}</h4>
                    <p style="color:#64748b; font-size:0.9rem; margin-bottom:15px;">${loc.address}</p>
                    <a href="search.html?location=${encodeURIComponent(loc.name)}" class="btn btn-outline" style="border:1px solid #0f766e; color:#0f766e; padding:5px 15px; border-radius:5px; text-decoration:none;">View Cars</a>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

async function loadTestimonials() {
    const container = document.getElementById('testimonials');
    if (!container) return;

    try {
        const { data: reviews, error } = await window.supabaseClient
            .from(DB_TABLES.REVIEWS)
            .select('*, users(name)')
            .gte('rating', 4)
            .limit(3);

        if (error) throw error;

        if (reviews && reviews.length > 0) {
            container.innerHTML = reviews.map(review => `
                <div class="feature-card" style="text-align:left; background:#f8fafc; padding:20px; border-radius:8px;">
                    <div style="color:#fbbf24; margin-bottom:10px;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    <p style="font-style:italic; color:#475569;">"${review.comment}"</p>
                    <h4 style="margin-top:15px; color:#1e293b;">- ${review.users?.name || 'Happy Customer'}</h4>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Testimonials error", err);
    }
}

// --- 5. FORMS & EVENT LISTENERS ---
function setupEventListeners() {
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }

    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }

    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
}

function handleSearchSubmit(e) {
    e.preventDefault();
    window.location.href = 'search.html';
}

async function handleNewsletterSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Subscribing...";
    
    const email = e.target.querySelector('input[type="email"]').value;
    if (!email) { alert('Please enter email'); btn.innerText = originalText; return; }

    try {
        const { error } = await window.supabaseClient
            .from(DB_TABLES.NEWSLETTER)
            .insert([{ email: email, subscribed_at: new Date() }]);
        
        if (error && error.code !== '23505') throw error; // 23505 = duplicate email
        
        alert('Subscribed successfully!');
        e.target.reset();
    } catch (err) {
        console.error('Newsletter error:', err);
        alert('Subscription failed or email already exists.');
    } finally {
        btn.innerText = originalText;
    }
}

function toggleMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) mobileMenu.classList.toggle('active');
}

