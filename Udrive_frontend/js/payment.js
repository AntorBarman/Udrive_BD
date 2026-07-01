// Payment Integration Functions with SSLCommerz
const PAYMENT_CONFIG = {
    sslcommerz: {
        store_id: 'YOUR_SSL_STORE_ID',
        store_passwd: 'YOUR_SSL_STORE_PASSWORD',
        sandbox: true, // Set to false for production
        success_url: window.location.origin + '/api/payment/success',
        fail_url: window.location.origin + '/api/payment/fail',
        cancel_url: window.location.origin + '/api/payment/cancel',
        ipn_url: window.location.origin + '/api/payment/ipn'
    }
};

let currentPaymentMethod = null;
let paymentInProgress = false;

// Initialize Payment System
function initPaymentSystem() {
    setupPaymentEvents();
    loadPaymentMethods();
}

// Setup Payment Event Listeners
function setupPaymentEvents() {
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            selectPaymentMethod(this.dataset.method);
        });
    });
}

// Load Available Payment Methods
function loadPaymentMethods() {
    // Payment methods for Bangladesh
    const methods = [
        { id: 'bkash', name: 'bKash', icon: 'mobile-alt', available: true },
        { id: 'nagad', name: 'Nagad', icon: 'wallet', available: true },
        { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card', available: true },
        { id: 'bank', name: 'Bank Transfer', icon: 'university', available: true }
    ];

    const container = document.getElementById('paymentMethods');
    if (!container) return;

    container.innerHTML = methods.map(method => `
        <div class="payment-method ${method.available ? '' : 'disabled'}"
             data-method="${method.id}">
            <div class="method-icon">
                <i class="fas fa-${method.icon}"></i>
            </div>
            <div class="method-info">
                <h4>${method.name}</h4>
                <p>${method.available ? 'Available' : 'Coming Soon'}</p>
            </div>
        </div>
    `).join('');
}

// Select Payment Method
function selectPaymentMethod(method) {
    currentPaymentMethod = method;

    // Update UI
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });

    const selectedMethod = document.querySelector(`[data-method="${method}"]`);
    if (selectedMethod) {
        selectedMethod.classList.add('selected');
    }

    // Show corresponding form
    document.querySelectorAll('.payment-form').forEach(form => {
        form.style.display = 'none';
    });

    const form = document.getElementById(`${method}Form`);
    if (form) form.style.display = 'block';

    // Update payment button text
    const payButton = document.getElementById('payButton');
    if (payButton) {
        payButton.textContent = `Pay with ${method.charAt(0).toUpperCase() + method.slice(1)}`;
    }
}

// Initiate Payment Process (Step 1-2: Frontend to Backend)
async function initiatePayment(amount, paymentMethod, userId, description = 'Payment') {
    if (paymentInProgress) return;
    paymentInProgress = true;

    try {
        const paymentData = {
            amount: amount,
            currency: 'BDT',
            payment_method: paymentMethod,
            user_id: userId,
            description: description,
            success_url: PAYMENT_CONFIG.sslcommerz.success_url,
            fail_url: PAYMENT_CONFIG.sslcommerz.fail_url,
            cancel_url: PAYMENT_CONFIG.sslcommerz.cancel_url,
            ipn_url: PAYMENT_CONFIG.sslcommerz.ipn_url
        };

        // Send to backend API (Step 2)
        const response = await fetch('/api/payment/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            throw new Error('Payment initialization failed');
        }

        const result = await response.json();

        // Step 3-4: Redirect to SSLCommerz Gateway
        if (result.gateway_url) {
            window.location.href = result.gateway_url;
        } else {
            throw new Error('No gateway URL received');
        }

    } catch (error) {
        console.error('Payment initiation error:', error);
        alert('Payment failed to initialize. Please try again.');
        paymentInProgress = false;
    }
}

// Process Top-up (Wallet Add Money)
async function processTopUp() {
    const amount = parseFloat(document.getElementById('addAmount').value);
    const user = JSON.parse(localStorage.getItem('udrive_user'));

    if (!amount || amount < 100 || amount > 50000) {
        alert('Please enter a valid amount between ৳100 and ৳50,000');
        return;
    }

    if (!currentPaymentMethod) {
        alert('Please select a payment method');
        return;
    }

    // Initiate payment with backend
    await initiatePayment(amount, currentPaymentMethod, user.id, 'Wallet Top-up');
}

// Process Booking Payment
async function processBookingPayment(bookingId, amount) {
    const user = JSON.parse(localStorage.getItem('udrive_user'));

    if (!user || !user.id) {
        alert('Please login to make payment');
        return;
    }

    await initiatePayment(amount, currentPaymentMethod || 'card', user.id, `Booking Payment - ${bookingId}`);
}

// Handle Payment Success (Called from success page)
function handlePaymentSuccess(transactionId, amount, method) {
    // Update UI or redirect
    alert(`Payment successful! Amount: ৳${amount}`);
    // Refresh wallet or booking data
    if (typeof loadWallet === 'function') loadWallet();
}

// Handle Payment Failure
function handlePaymentFailure(reason) {
    alert(`Payment failed: ${reason}`);
    paymentInProgress = false;
}

// Utility Functions
function formatCurrency(amount) {
    return `৳${amount.toLocaleString('en-BD')}`;
}

function validatePaymentAmount(amount) {
    return amount >= 10 && amount <= 100000; // SSLCommerz limits
}

function validatePhone(phone) {
    return /^01[3-9]\d{8}$/.test(phone);
}

function validateCardNumber(cardNumber) {
    return /^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''));
}

function validateCardExpiry(expiry) {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
}

function validateCardCVC(cvc) {
    return /^\d{3,4}$/.test(cvc);
}

// Legacy functions for backward compatibility
async function processBkashPayment(amount, bookingId) {
    return await initiatePayment(amount, 'bkash', null, `Booking ${bookingId}`);
}

async function processNagadPayment(amount, bookingId) {
    return await initiatePayment(amount, 'nagad', null, `Booking ${bookingId}`);
}

async function processCardPayment(amount, bookingId) {
    return await initiatePayment(amount, 'card', null, `Booking ${bookingId}`);
}

async function processWalletPayment(amount, bookingId) {
    // This would be handled differently - deduct from wallet balance
    console.log('Wallet payment not implemented yet');
    return { success: false, message: 'Wallet payment not available' };
}