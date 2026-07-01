// ==========================================
// dashboard.js - FULLY DYNAMIC WITH SUPABASE
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // ১. ইউজার লগিন করা আছে কিনা চেক করা
    const userStr = localStorage.getItem('udrive_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(userStr);
    
    // ২. ডাইনামিক ডাটা লোড করা শুরু...
    await loadUserProfile(user);
    await loadDashboardStats(user);
    await loadUpcomingTrips(user);
    await loadRecentBookings(user);
});

// 🟢 প্রোফাইলের ছবি এবং নাম লোড করা
async function loadUserProfile(user) {
    try {
        if (!window.supabaseClient) return;
        
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        const name = profile?.name || user.user_metadata?.name || 'User';
        const email = user.email;
        const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
        
        if (document.getElementById('userName')) document.getElementById('userName').textContent = name;
        if (document.getElementById('userEmail')) document.getElementById('userEmail').textContent = email;
        if (document.getElementById('welcomeName')) document.getElementById('welcomeName').textContent = name.split(' ');
        if (document.getElementById('userProfileImage')) document.getElementById('userProfileImage').src = avatar;
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// 🟢 মোট বুকিং এবং খরচের হিসাব লোড করা
async function loadDashboardStats(user) {
    try {
        if (!window.supabaseClient) return;
        
        const { data: bookings } = await window.supabaseClient
            .from('bookings')
            .select('*')
            .eq('user_id', user.id);
            
        const totalBookings = bookings ? bookings.length : 0;
        const totalSpent = bookings ? bookings.reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0) : 0;
        
        const upcomingTrips = bookings ? bookings.filter(b => 
            b.status === 'confirmed' && new Date(b.pickup_date) > new Date()
        ).length : 0;
        
        if(document.getElementById('totalBookings')) document.getElementById('totalBookings').textContent = totalBookings;
        if(document.getElementById('totalSpent')) document.getElementById('totalSpent').textContent = `৳${totalSpent.toFixed(0)}`;
        if(document.getElementById('upcomingTrips')) document.getElementById('upcomingTrips').textContent = upcomingTrips;
        
        const { data: reviews } = await window.supabaseClient
            .from('reviews')
            .select('rating')
            .eq('user_id', user.id);
            
        if (reviews && reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            if(document.getElementById('avgRating')) document.getElementById('avgRating').textContent = avgRating.toFixed(1);
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// 🟢 সামনের ট্রিপ বা বুকিং লোড করা
async function loadUpcomingTrips(user) {
    try {
        const container = document.getElementById('upcomingTripsList');
        if (!container) return;

        const { data: bookings, error } = await window.supabaseClient
            .from('bookings')
            .select('*, cars(id, make, model, images)')
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .gte('pickup_date', new Date().toISOString())
            .order('pickup_date', { ascending: true })
            .limit(3);
            
        if (error) throw error;
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align:center; padding:30px;">
                    <i class="fas fa-calendar-times" style="font-size:3rem; color:#cbd5e1; margin-bottom:15px;"></i>
                    <p style="color:#64748b; margin-bottom:15px;">No upcoming trips</p>
                    <a href="search.html" class="btn btn-primary" style="text-decoration:none;">Book a Car</a>
                </div>`;
            return;
        }
        
        container.innerHTML = bookings.map(booking => {
            const car = booking.cars || {};
            let img = 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=200&h=150&fit=crop';
            
            if (car.images && car.images.length > 0) {
                img = car.images.data || car.images;
            }
            
            return `
            <div class="trip-card" style="display:flex; align-items:center; gap:15px; padding:15px; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:15px;">
                <div class="trip-image" style="width:100px; height:70px; border-radius:8px; overflow:hidden;">
                    <img src="${img}" alt="Car" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/200'">
                </div>
                <div class="trip-info" style="flex:1;">
                    <h4 style="margin:0 0 5px 0; color:#1e293b;">${car.make || 'Car'} ${car.model || ''}</h4>
                    <div class="trip-dates" style="font-size:0.85rem; color:#64748b; display:flex; gap:15px;">
                        <span><i class="fas fa-calendar"></i> ${new Date(booking.pickup_date).toLocaleDateString()}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${booking.pickup_location || 'Dhaka'}</span>
                    </div>
                </div>
                <div class="trip-status" style="background:#d1fae5; color:#065f46; padding:5px 12px; border-radius:20px; font-size:0.8rem; font-weight:600;">Confirmed</div>
            </div>`;
        }).join('');
        
    } catch (error) {
        console.error('Error loading upcoming trips:', error);
    }
}

// 🟢 সাম্প্রতিক বুকিং টেবিল লোড করা
async function loadRecentBookings(user) {
    try {
        const container = document.getElementById('recentBookingsTable');
        if (!container) return;

        const { data: bookings, error } = await window.supabaseClient
            .from('bookings')
            .select('*, cars(make, model)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (error) throw error;
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color:#64748b;">No recent bookings found</td></tr>`;
            return;
        }
        
        container.innerHTML = bookings.map(booking => {
            const carName = booking.cars ? `${booking.cars.make} ${booking.cars.model}` : 'Unknown Car';
            
            let statusColor = '#f1f5f9';
            let textColor = '#475569';
            if (booking.status === 'confirmed') { statusColor = '#d1fae5'; textColor = '#065f46'; }
            if (booking.status === 'pending') { statusColor = '#fef3c7'; textColor = '#92400e'; }
            
            return `
            <tr>
                <td style="padding:15px; border-bottom:1px solid #f1f5f9;">#UD-${booking.id.toString().substring(0,6)}</td>
                <td style="padding:15px; border-bottom:1px solid #f1f5f9; font-weight:600;">${carName}</td>
                <td style="padding:15px; border-bottom:1px solid #f1f5f9;">${new Date(booking.pickup_date).toLocaleDateString()}</td>
                <td style="padding:15px; border-bottom:1px solid #f1f5f9; color:#2563eb; font-weight:bold;">৳${booking.total_price}</td>
                <td style="padding:15px; border-bottom:1px solid #f1f5f9;">
                    <span style="background:${statusColor}; color:${textColor}; padding:5px 10px; border-radius:20px; font-size:0.8rem; font-weight:600; text-transform:capitalize;">${booking.status}</span>
                </td>
                <td style="padding:15px; border-bottom:1px solid #f1f5f9;">
                    <a href="booking-details.html?id=${booking.id}" class="btn btn-outline btn-sm" style="text-decoration:none; padding:5px 10px; font-size:0.85rem;">View</a>
                </td>
            </tr>`;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent bookings:', error);
    }
}