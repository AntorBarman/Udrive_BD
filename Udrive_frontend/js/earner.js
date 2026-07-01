// Earner Portal Functions with Supabase
async function initEarnerPortal() {
    setupEarnerEvents();
    await checkEarnerStatus();
}

async function checkEarnerStatus() {
    const user = await getCurrentUser();
    
    // COMMENT OUT THE REDIRECT LOGIC FOR NOW so you can test it
    /* if (user) {
        const profile = await getUserProfile(user.id);
        if (profile && profile.role !== 'earner') {
             alert("You need to register as an earner first.");
             // window.location.href = 'index.html'; // Don't redirect yet
        }
    }
    */
}

function setupEarnerEvents() {
    // Earner registration form
    const earnerForm = document.getElementById('earnerRegistrationForm');
    if (earnerForm) {
        earnerForm.addEventListener('submit', handleEarnerRegistration);
    }
    
    // Car listing form
    const carForm = document.getElementById('carListingForm');
    if (carForm) {
        carForm.addEventListener('submit', handleCarListing);
    }
}

async function handleEarnerRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('earnerName')?.value;
    const phone = document.getElementById('earnerPhone')?.value;
    const email = document.getElementById('earnerEmail')?.value;
    const carModel = document.getElementById('carModel')?.value;
    const carYear = document.getElementById('carYear')?.value;
    const carLocation = document.getElementById('carLocation')?.value;
    
    if (!name || !phone || !email || !carModel || !carYear || !carLocation) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        const earnerData = {
            user_id: user ? user.id : null,
            name,
            phone,
            email,
            car_model: carModel,
            car_year: carYear,
            car_location: carLocation,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        // Save earner application
        const { data, error } = await supabaseClient
            .from(DB_TABLES.EARNER_APPLICATIONS)
            .insert([earnerData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Show success message
        showNotification('Application submitted successfully! We will contact you within 24 hours.', 'success');
        
        // Reset form
        e.target.reset();
        
    } catch (error) {
        console.error('Earner registration error:', error);
        showNotification('Failed to submit application. Please try again.', 'error');
    }
}

async function handleCarListing(e) {
    e.preventDefault();
    
    const user = await getCurrentUser();
    if (!user) {
        showNotification('Please login to list your car', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const profile = await getUserProfile(user.id);
    if (!profile || profile.role !== 'earner') {
        showNotification('You must be approved as an earner to list cars', 'error');
        return;
    }
    
    const carData = {
        user_id: user.id, // 🔴 UPDATE: owner_id থেকে user_id করা হয়েছে
        name: `${document.getElementById('carMake')?.value} ${document.getElementById('carModelInput')?.value}`,
        make: document.getElementById('carMake')?.value,
        model: document.getElementById('carModelInput')?.value,
        year: document.getElementById('carYearInput')?.value,
        transmission: document.getElementById('transmission')?.value,
        fuel_type: document.getElementById('fuelType')?.value,
        seats: document.getElementById('seats')?.value,
        daily_rate: document.getElementById('dailyRate')?.value,
        location: document.getElementById('carLocationInput')?.value,
        description: document.getElementById('carDescription')?.value,
        type: document.getElementById('carType')?.value || 'Sedan',
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    // Validate car data
    if (!carData.make || !carData.model || !carData.year || !carData.daily_rate) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        // Check if editing existing car
        const editId = e.target.dataset.editId;
        
        if (editId) {
            // Update existing car
            const { data, error } = await supabaseClient
                .from(DB_TABLES.CARS)
                .update(carData)
                .eq('id', editId)
                .eq('user_id', user.id) // 🔴 UPDATE: owner_id থেকে user_id
                .select()
                .single();
            
            if (error) throw error;
            
            showNotification('Car updated successfully!', 'success');
            delete e.target.dataset.editId;
            
        } else {
            // Insert new car
            const { data, error } = await supabaseClient
                .from(DB_TABLES.CARS)
                .insert([carData])
                .select()
                .single();
            
            if (error) throw error;
            
            showNotification('Car listed successfully! Waiting for admin approval.', 'success');
        }
        
        e.target.reset();
        
        // Reload cars list if on dashboard
        if (typeof loadEarnerCars === 'function') {
            await loadEarnerCars(user.id);
        }
        
    } catch (error) {
        console.error('Car listing error:', error);
        showNotification('Failed to list car. Please try again.', 'error');
    }
}

// Earner Dashboard Functions
async function loadEarnerDashboard() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const profile = await getUserProfile(user.id);
    if (!profile || profile.role !== 'earner') {
        showNotification('Access denied. Earner approval required.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }
    
    await loadEarnerStats(user.id);
    await loadEarnerCars(user.id);
    await loadEarnerBookings(user.id);
}

async function loadEarnerStats(userId) {
    try {
        // Get user's cars
        const { data: cars, error: carsError } = await supabaseClient
            .from(DB_TABLES.CARS)
            .select('*')
            .eq('user_id', userId); // 🔴 UPDATE: owner_id থেকে user_id
        
        if (carsError) throw carsError;
        
        // Get bookings for user's cars
        const carIds = cars.map(car => car.id);
        const { data: bookings, error: bookingsError } = await supabaseClient
            .from(DB_TABLES.BOOKINGS)
            .select('*')
            .in('car_id', carIds);
        
        if (bookingsError) throw bookingsError;
        
        // Calculate stats
        const totalEarnings = bookings
            .filter(b => b.status === 'completed')
            .reduce((sum, booking) => sum + (parseFloat(booking.total_price) * 0.8), 0); // 80% to earner
        
        const activeCars = cars.filter(car => car.status === 'approved').length;
        const totalBookings = bookings.length;
        
        const pendingPayout = bookings
            .filter(b => b.status === 'completed' && !b.payout_processed)
            .reduce((sum, booking) => sum + (parseFloat(booking.total_price) * 0.8), 0);
        
        // Update UI
        const totalEarningsElement = document.getElementById('totalEarnings');
        const activeCarsElement = document.getElementById('activeCars');
        const totalBookingsElement = document.getElementById('totalBookingsEarner');
        const pendingPayoutElement = document.getElementById('pendingPayout');
        
        if (totalEarningsElement) totalEarningsElement.textContent = `৳${totalEarnings.toFixed(0)}`;
        if (activeCarsElement) activeCarsElement.textContent = activeCars;
        if (totalBookingsElement) totalBookingsElement.textContent = totalBookings;
        if (pendingPayoutElement) pendingPayoutElement.textContent = `৳${pendingPayout.toFixed(0)}`;
        
    } catch (error) {
        console.error('Error loading earner stats:', error);
    }
}

async function loadEarnerCars(userId) {
    try {
        const { data: cars, error } = await supabaseClient
            .from(DB_TABLES.CARS)
            .select('*')
            .eq('user_id', userId) // 🔴 UPDATE: owner_id থেকে user_id
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('earnerCarsList');
        if (!container) return;
        
        if (cars.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <p>No cars listed yet</p>
                    <a href="add-car.html" class="btn btn-primary">Add Your First Car</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = cars.map(car => `
            <div class="car-item">
                <div class="car-image">
                    <img src="${(car.images && car.images.length > 0) ? car.images : 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=200&h=150&fit=crop'}" alt="${car.name}">
                </div>
                <div class="car-info">
                    <h4>${car.name}</h4>
                    <p>৳${car.daily_rate}/day • ${car.location}</p>
                </div>
                <div class="car-status status-${car.status === 'approved' ? 'active' : 'inactive'}">
                    ${car.status}
                </div>
                <div class="car-actions">
                    <button class="btn btn-sm btn-outline" onclick="editCar('${car.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="removeCar('${car.id}')">Remove</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading earner cars:', error);
    }
}

async function loadEarnerBookings(userId) {
    try {
        // First get user's cars
        const { data: cars, error: carsError } = await supabaseClient
            .from(DB_TABLES.CARS)
            .select('id')
            .eq('user_id', userId); // 🔴 UPDATE: owner_id থেকে user_id
        
        if (carsError) throw carsError;
        
        const carIds = cars.map(car => car.id);
        
        // Get bookings for those cars
        const { data: bookings, error: bookingsError } = await supabaseClient
            .from(DB_TABLES.BOOKINGS)
            .select(`
                *,
                cars (
                    name
                )
            `)
            .in('car_id', carIds)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (bookingsError) throw bookingsError;
        
        const container = document.getElementById('earnerBookingsTable');
        if (!container) return;
        
        if (bookings.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state-sm">
                            <i class="fas fa-calendar-times"></i>
                            <p>No bookings yet</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = bookings.map(booking => {
            const earnings = (parseFloat(booking.total_price) * 0.8).toFixed(0);
            return `
                <tr>
                    <td>${booking.booking_id}</td>
                    <td>${booking.cars?.name || 'N/A'}</td>
                    <td>${formatDate(booking.pickup_date)}</td>
                    <td>${formatDate(booking.return_date)}</td>
                    <td>৳${earnings}</td>
                    <td>
                        <span class="status-badge status-${booking.status || 'pending'}">
                            ${booking.status || 'Pending'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading earner bookings:', error);
    }
}

async function editCar(carId) {
    try {
        const user = await getCurrentUser();
        const { data: car, error } = await supabaseClient
            .from(DB_TABLES.CARS)
            .select('*')
            .eq('id', carId)
            .eq('user_id', user.id) // 🔴 UPDATE: owner_id থেকে user_id
            .single();
        
        if (error) throw error;
        
        if (car) {
            // Populate edit form
            const form = document.getElementById('carListingForm');
            if (!form) return;
            
            document.getElementById('carMake').value = car.make;
            document.getElementById('carModelInput').value = car.model;
            document.getElementById('carYearInput').value = car.year;
            document.getElementById('transmission').value = car.transmission;
            document.getElementById('fuelType').value = car.fuel_type;
            document.getElementById('seats').value = car.seats;
            document.getElementById('dailyRate').value = car.daily_rate;
            document.getElementById('carLocationInput').value = car.location;
            document.getElementById('carDescription').value = car.description;
            
            // Set edit mode
            form.dataset.editId = carId;
            
            // Scroll to form
            form.scrollIntoView({ behavior: 'smooth' });
        }
        
    } catch (error) {
        console.error('Error loading car for edit:', error);
        showNotification('Failed to load car details', 'error');
    }
}

async function removeCar(carId) {
    if (!confirm('Are you sure you want to remove this car?')) {
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        const { error } = await supabaseClient
            .from(DB_TABLES.CARS)
            .delete()
            .eq('id', carId)
            .eq('user_id', user.id); // 🔴 UPDATE: owner_id থেকে user_id
        
        if (error) throw error;
        
        showNotification('Car removed successfully', 'success');
        
        // Reload cars list
        await loadEarnerCars(user.id);
        
    } catch (error) {
        console.error('Error removing car:', error);
        showNotification('Failed to remove car', 'error');
    }
}

// Payout Functions
async function requestPayout() {
    try {
        const user = await getCurrentUser();
        
        // Get user's cars
        const { data: cars, error: carsError } = await supabaseClient
            .from(DB_TABLES.CARS)
            .select('id')
            .eq('user_id', user.id); // 🔴 UPDATE: owner_id থেকে user_id
        
        if (carsError) throw carsError;
        
        const carIds = cars.map(car => car.id);
        
        // Get completed bookings without payout
        const { data: bookings, error: bookingsError } = await supabaseClient
            .from(DB_TABLES.BOOKINGS)
            .select('*')
            .in('car_id', carIds)
            .eq('status', 'completed')
            .eq('payout_processed', false);
        
        if (bookingsError) throw bookingsError;
        
        const pendingPayout = bookings.reduce((sum, booking) => 
            sum + (parseFloat(booking.total_price) * 0.8), 0);
        
        if (pendingPayout === 0) {
            showNotification('No pending payout available', 'info');
            return;
        }
        
        // Create payout request
        const { data: payoutData, error: payoutError } = await supabaseClient
            .from('payout_requests')
            .insert([
                {
                    user_id: user.id,
                    amount: pendingPayout,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (payoutError) throw payoutError;
        
        // Mark bookings as payout requested
        const { error: updateError } = await supabaseClient
            .from(DB_TABLES.BOOKINGS)
            .update({ payout_processed: true, payout_request_id: payoutData.id })
            .in('id', bookings.map(b => b.id));
        
        if (updateError) throw updateError;
        
        showNotification(`Payout request of ৳${pendingPayout.toFixed(0)} submitted successfully!`, 'success');
        
        // Reload stats
        await loadEarnerStats(user.id);
        
    } catch (error) {
        console.error('Payout request error:', error);
        showNotification('Failed to request payout', 'error');
    }
}

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^01[3-9]\d{8}$/;
    return re.test(phone);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('earner-portal')) {
        initEarnerPortal();
    } else if (window.location.pathname.includes('earner-dashboard')) {
        loadEarnerDashboard();
    }
});