// Car Management Functions with Supabase
let currentCar = null;

async function loadCarDetails() {
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('id');
    
    if (!carId) {
        window.location.href = 'search.html';
        return;
    }
    
    try {
        if (!window.supabaseClient) throw new Error("Supabase Client not found!");

        const { data: car, error } = await window.supabaseClient
            .from('cars') 
            .select(`*, users:user_id (id, name, phone)`)
            .eq('id', carId)
            .single();
        
        if (error) throw error;
        
        if (!car) {
            alert('Car not found');
            window.location.href = 'search.html';
            return;
        }
        
        currentCar = car;
        displayCarDetails(car);
        setupBooking();
        await loadCarReviews(carId);
        
    } catch (error) {
        console.error('Error loading car details:', error);
    }
}

function displayCarDetails(car) {
    const safeText = (id, text) => { if(document.getElementById(id)) document.getElementById(id).textContent = text; };

    safeText('carName', car.name || car.make + ' ' + car.model);
    safeText('carRating', car.rating || '4.5');
    safeText('carSeats', `${car.seats || 4} Seats`);
    safeText('carTransmission', car.transmission || 'Automatic');
    safeText('carFuel', car.fuel_type || 'Octane');
    safeText('carType', car.type || 'Sedan');
    safeText('carDescription', car.description || 'No description available.');
    
    const mainImage = document.getElementById('mainCarImage');
    const images = car.images && car.images.length > 0 ? car.images : [car.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'];
    
    if (mainImage) {
        mainImage.src = images[0]?.data || images[0];
        mainImage.alt = car.name || 'Car';
    }
    
    const thumbnailsContainer = document.getElementById('thumbnails');
    if (thumbnailsContainer && images.length > 1) {
        thumbnailsContainer.innerHTML = images.map((img, index) => {
            const imgSrc = img.data || img;
            return `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${imgSrc}', event)">
                    <img src="${imgSrc}" alt="Thumbnail ${index + 1}">
                </div>
            `;
        }).join('');
    }
    
    const dailyRate = parseFloat(car.daily_rate || car.price) || 0;
    safeText('rentalPrice', `৳${(dailyRate * 1).toFixed(0)}`);
    safeText('totalPrice', `৳${(dailyRate * 1 + 800).toFixed(0)}`); 
    
    const featuresContainer = document.getElementById('carFeatures');
    if (featuresContainer) {
        const featuresList = car.features || ['AC', 'Bluetooth', 'Power Steering'];
        featuresContainer.innerHTML = featuresList.map(feature => `
            <li><i class="fas fa-check" style="color:#10b981; margin-right:8px;"></i> ${feature}</li>
        `).join('');
    }
}

window.changeMainImage = function(imageSrc, event) {
    document.getElementById('mainCarImage').src = imageSrc;
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    if(event && event.target) event.target.closest('.thumbnail').classList.add('active');
};

function setupBooking() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    if(document.getElementById('pickupDate')) document.getElementById('pickupDate').value = formatDate(today);
    if(document.getElementById('returnDate')) document.getElementById('returnDate').value = formatDate(tomorrow);
    
    const bookBtn = document.getElementById('bookNowBtn');
    if(bookBtn) bookBtn.addEventListener('click', bookCar);
    
    const pickupDateEl = document.getElementById('pickupDate');
    const returnDateEl = document.getElementById('returnDate');
    
    if(pickupDateEl) pickupDateEl.addEventListener('change', updatePrice);
    if(returnDateEl) returnDateEl.addEventListener('change', updatePrice);
}

function updatePrice() {
    if(!currentCar) return;

    const pickupDateStr = document.getElementById('pickupDate')?.value;
    const returnDateStr = document.getElementById('returnDate')?.value;
    
    if(!pickupDateStr || !returnDateStr) return;

    const pickupDate = new Date(pickupDateStr);
    const returnDate = new Date(returnDateStr);
    
    const diffTime = returnDate - pickupDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
        alert("Return date must be after pickup date");
        return;
    }
    
    const dailyPrice = parseFloat(currentCar.daily_rate || currentCar.price) || 0;
    const rentalPrice = dailyPrice * diffDays;
    const serviceFee = 300;
    const insurance = 500;
    const totalPrice = rentalPrice + serviceFee + insurance;
    
    if(document.getElementById('rentalPrice')) document.getElementById('rentalPrice').textContent = `৳${rentalPrice.toFixed(0)}`;
    if(document.getElementById('totalPrice')) document.getElementById('totalPrice').textContent = `৳${totalPrice.toFixed(0)}`;
}

// 🚀 KYC CHECK COMPLETELY REMOVED - DIRECT BOOKING 🚀
window.bookCar = async function() {
    try {
        const btn = document.getElementById('bookNowBtn');
        const originalText = btn.innerText;
        btn.innerText = "Processing...";
        btn.disabled = true;

        // ১. শুধু লগিন চেক করবে
        const userStr = localStorage.getItem('udrive_user');
        if (!userStr) {
            alert("Please login to book a car");
            window.location.href = "login.html";
            return;
        }

        // ২. তারিখ এবং লোকেশন সংগ্রহ
        const pickupDate = document.getElementById('pickupDate')?.value;
        const returnDate = document.getElementById('returnDate')?.value;
        const pickupLocation = document.getElementById('pickupLocation')?.value || 'Dhaka';
        
        if (!pickupDate || !returnDate) {
            alert("Please select pickup and return dates");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        // ৩. ডাটা প্যাকেজিং
        const bookingData = {
            carId: currentCar.id,
            carName: currentCar.name || currentCar.make + ' ' + currentCar.model,
            pickupDate: pickupDate,
            returnDate: returnDate,
            pickupLocation: pickupLocation,
            totalPrice: document.getElementById('totalPrice')?.textContent.replace('৳', '') || 9000,
            carDetails: currentCar
        };
        
        // ৪. Session Storage এ সেভ করে সোজা Reservation পেজে পাঠানো
        sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
        window.location.href = "reservation.html";

    } catch (error) {
        console.error("Booking Error:", error);
        alert("An error occurred. Please try again.");
        const btn = document.getElementById('bookNowBtn');
        if(btn) {
            btn.innerText = "Book Now";
            btn.disabled = false;
        }
    }
};

async function loadCarReviews(carId) {
    try {
        const { data: reviews, error } = await window.supabaseClient
            .from('reviews')
            .select(`*, users (name)`)
            .eq('car_id', carId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const reviewsContainer = document.getElementById('carReviews');
        if (!reviewsContainer) return;
        
        if (!reviews || reviews.length === 0) {
            reviewsContainer.innerHTML = '<p style="color:#64748b;">No reviews yet. Be the first to review!</p>';
            return;
        }
        
        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-card" style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:15px;">
                <div class="review-header" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div>
                        <h5 style="margin:0; color:#1e293b;">${review.users?.name || 'User'}</h5>
                        <div style="color:#fbbf24; font-size:0.9rem;">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                        </div>
                    </div>
                    <span style="color:#94a3b8; font-size:0.8rem;">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <p style="margin:0; color:#475569; font-size:0.95rem;">${review.comment}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.log('No reviews found.');
    }
}

document.addEventListener('DOMContentLoaded', loadCarDetails);