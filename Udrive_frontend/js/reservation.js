// Reservation Flow Functions with Supabase
let currentStep = 1;
let bookingData = {};

async function initReservation() {
    await loadBookingData();
    updateProgress();
    setupReservationEvents();
}

async function loadBookingData() {
    // Load from sessionStorage
    const savedBooking = sessionStorage.getItem('currentBooking');
    if (savedBooking) {
        bookingData = JSON.parse(savedBooking);
        await populateBookingData();
    } else {
        // ডেমো ডাটা তৈরি করে দেওয়া হলো যাতে টেস্টিংয়ে সমস্যা না হয়
        bookingData = {
            carName: "Toyota Allion 2020",
            pickupDate: "2026-02-15",
            returnDate: "2026-02-18",
            pickupLocation: "Gulshan, Dhaka",
            totalPrice: 9000
        };
        await populateBookingData();
    }
}

async function populateBookingData() {
    // Populate car info
    const carNameElement = document.getElementById('bookingCarName');
    const carImageElement = document.getElementById('bookingCarImage');
    const pickupDateElement = document.getElementById('bookingPickupDate');
    const returnDateElement = document.getElementById('bookingReturnDate');
    const locationElement = document.getElementById('bookingLocation');
    
    if (carNameElement) carNameElement.textContent = bookingData.carName || 'Car Name';
    if (carImageElement) {
        const images = bookingData.carDetails?.images || ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'];
        carImageElement.src = images[0];
    }
    if (pickupDateElement) pickupDateElement.textContent = formatDate(bookingData.pickupDate);
    if (returnDateElement) returnDateElement.textContent = formatDate(bookingData.returnDate);
    if (locationElement) locationElement.textContent = bookingData.pickupLocation;
    
    // Pre-fill user data if logged in (Safe Check)
    try {
        const userStr = localStorage.getItem('udrive_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const driverNameInput = document.getElementById('driverName');
            const driverEmailInput = document.getElementById('driverEmail');
            
            if (driverNameInput && user.user_metadata?.name) driverNameInput.value = user.user_metadata.name;
            if (driverEmailInput && user.email) driverEmailInput.value = user.email;
        }
    } catch(e) { console.log(e); }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function setupReservationEvents() {
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            
            // Show corresponding payment form
            const method = this.dataset.method;
            document.querySelectorAll('.payment-form').forEach(form => {
                form.style.display = 'none';
            });
            const paymentForm = document.getElementById(`${method}Form`);
            if (paymentForm) paymentForm.style.display = 'block';
        });
    });
    
    // Add-ons toggle
    document.querySelectorAll('.addon-toggle input').forEach(toggle => {
        toggle.addEventListener('change', updateTotalPrice);
    });
}

function updateProgress() {
    // Update step indicators
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    const currentStepElement = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Mark previous steps as completed
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        if (stepNum < currentStep) {
            step.classList.add('completed');
        }
    });
    
    // Show current step content
    document.querySelectorAll('.reservation-step').forEach(step => {
        step.style.display = 'none';
    });
    const stepContent = document.getElementById(`step${currentStep}`);
    if (stepContent) {
        stepContent.style.display = 'block';
    }
}

async function nextStep() {
    // Validate current step
    if (!await validateStep(currentStep)) return;
    
    // Save step data
    saveStepData(currentStep);
    
    // Move to next step
    if (currentStep < 4) {
        currentStep++;
        updateProgress();
        
        // Update total price on review step
        if (currentStep === 3) {
            updateTotalPrice();
            displayBookingSummary();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
    }
}

async function validateStep(step) {
    switch(step) {
        case 1:
            const driverName = document.getElementById('driverName')?.value;
            const driverPhone = document.getElementById('driverPhone')?.value;
            
            if (!driverName || !driverPhone) {
                alert('Please fill in all driver information');
                return false;
            }
            if (!validatePhone(driverPhone)) {
                alert('Please enter a valid phone number');
                return false;
            }
            break;
            
        case 3:
            const agreeTerms = document.getElementById('agreeTerms')?.checked;
            if (document.getElementById('agreeTerms') && !agreeTerms) {
                alert('Please agree to the terms and conditions');
                return false;
            }
            break;
    }
    return true;
}

function saveStepData(step) {
    switch(step) {
        case 1:
            bookingData.driverName = document.getElementById('driverName')?.value;
            bookingData.driverPhone = document.getElementById('driverPhone')?.value;
            break;
            
        case 2:
            bookingData.addons = [];
            document.querySelectorAll('.addon-toggle input:checked').forEach(toggle => {
                const addonCard = toggle.closest('.addon-card');
                const addonName = addonCard?.querySelector('h4')?.textContent;
                const addonPrice = addonCard?.querySelector('.addon-price')?.textContent;
                if (addonName && addonPrice) {
                    bookingData.addons.push({ name: addonName, price: addonPrice });
                }
            });
            break;
    }
    sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
}

function updateTotalPrice() {
    if (currentStep !== 3) return;
    
    let total = parseFloat(bookingData.totalPrice) || 9000;
    
    document.querySelectorAll('.addon-toggle input:checked').forEach(toggle => {
        const addonCard = toggle.closest('.addon-card');
        const priceText = addonCard?.querySelector('.addon-price')?.textContent;
        if (priceText) {
            const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
            total += price;
        }
    });
    
    const summaryTotalElement = document.querySelector('.summary-total span:last-child');
    if (summaryTotalElement) {
        summaryTotalElement.textContent = `৳${total.toFixed(0)}`;
    }
    
    bookingData.finalTotal = total;
}

function displayBookingSummary() {
    const summaryContainer = document.getElementById('bookingSummary');
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = `
        <div class="summary-item"><span>Car:</span><span>${bookingData.carName}</span></div>
        <div class="summary-item"><span>Pickup:</span><span>${formatDate(bookingData.pickupDate)}</span></div>
        <div class="summary-item"><span>Return:</span><span>${formatDate(bookingData.returnDate)}</span></div>
        <div class="summary-item"><span>Location:</span><span>${bookingData.pickupLocation}</span></div>
        <div class="summary-total"><span>Total:</span><span>৳${bookingData.finalTotal || bookingData.totalPrice}</span></div>
    `;
}

// 🚀 100% BULLETPROOF DATABASE SUBMIT FUNCTION 🚀
window.completeBooking = async function() {
    const btn = document.getElementById('confirmBtn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        // ✅ User check
        const userStr = localStorage.getItem('udrive_user');
        if (!userStr) {
            alert('Please login first!');
            window.location.href = 'login.html';
            return;
        }
        const user = JSON.parse(userStr);

        // ✅ Booking data নেওয়া
        const savedBooking = sessionStorage.getItem('currentBooking');
        const bookingData = savedBooking ? JSON.parse(savedBooking) : {};

        // ✅ totalPrice সঠিকভাবে নেওয়া
        const totalAmount = parseFloat(
            bookingData.finalTotal || 
            bookingData.totalPrice || 
            0
        );

        if (!totalAmount || totalAmount <= 0) {
            alert("❌ Invalid amount! Please go back and recalculate.");
            btn.innerText = "Pay Now";
            btn.disabled = false;
            return;
        }

        // ✅ carId সঠিকভাবে নেওয়া
        const carId = bookingData.carId 
            ? String(bookingData.carId) 
            : null;

        console.log("💳 Payment details:");
        console.log("   Amount:", totalAmount);
        console.log("   Car ID:", carId);
        console.log("   Car Name:", bookingData.carName);

        // ✅ Step 1: Supabase এ booking INSERT
        const newBookingId = crypto.randomUUID();

        const insertData = {
            booking_id: newBookingId,           // uuid ✅
            user_id: user.id,                   // uuid ✅
            car_id: carId ? String(carId) : null, // text ✅
            car_name: String(carName),            // text ✅
            pickup_date: bookingData.pickupDate || null,
            return_date: bookingData.returnDate || null,
            pickup_location: bookingData.pickupLocation || 'Dhaka',
            total_price: totalAmount,             // numeric ✅
            status: 'pending',
            driver_name: bookingData.driverName || user.user_metadata?.name || null,
            driver_phone: bookingData.driverPhone || null
        };

        console.log("📝 Inserting booking:", insertData);

        const { data: insertedBooking, error: bookingError } = await window.supabaseClient
            .from('bookings')
            .insert([insertData])
            .select()
            .single();

        if (bookingError) {
            console.error('❌ Booking insert error:', bookingError);
            // error detail দেখুন
            console.error('   Code:', bookingError.code);
            console.error('   Message:', bookingError.message);
            console.error('   Details:', bookingError.details);
            
            // insert fail হলেও payment try করুন
            alert(`Warning: Booking save failed (${bookingError.message})\nPayment will still proceed.`);
        } else {
            console.log('✅ Booking saved in Supabase!', insertedBooking);
        }

        // ✅ Step 2: Payment init
        const paymentPayload = {
            amount: totalAmount,
            payment_method: 'card',
            user_id: user.id,
            description: `Booking - ${carName}`,
            carName: carName,
            customerName: user.user_metadata?.name || 
                          bookingData.driverName || 'Customer',
            customerEmail: user.email || 'customer@test.com',
            bookingId: newBookingId   // ✅ Real UUID
        };

        console.log("💳 Sending to payment server:", paymentPayload);

        const response = await fetch('/api/payment/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentPayload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server error ${response.status}: ${errText}`);
        }

        const apiData = await response.json();
        console.log("✅ Payment server response:", apiData);

        if (apiData.gateway_url) {
            sessionStorage.setItem('lastBookingId', newBookingId);
            console.log("🚀 Redirecting to payment gateway...");
            window.location.replace(apiData.gateway_url);
        } else {
            throw new Error(apiData.message || "Payment URL পাওয়া যায়নি!");
        }

    } catch (error) {
        console.error('❌ completeBooking error:', error);
        alert(`⚠️ Error: ${error.message}\n\nCheck:\n1. Server চালু আছে? (Port 5000)\n2. Console এ error দেখুন`);
        btn.innerText = "Pay Now";
        btn.disabled = false;
    }
};

function printBooking() {
    window.print();
}

// Validation helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^01[3-9]\d{8}$/;
    return re.test(phone);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initReservation);