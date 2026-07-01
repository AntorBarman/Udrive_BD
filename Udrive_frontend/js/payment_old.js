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
                message: 'Payment successful via Card'
            });
        }, 3000);
    });
}

// Wallet Payment
async function processWalletPayment(amount, bookingId) {
    return new Promise(async (resolve, reject) => {
        const user = getUserData();
        if (!user) {
            reject(new Error('Please login to use wallet'));
            return;
        }
        
        // Check wallet balance
        const walletBalance = await getWalletBalance(user.id);
        
        if (walletBalance < amount) {
            reject(new Error(`Insufficient wallet balance. Available: ৳${walletBalance}`));
            return;
        }
        
        // Confirm wallet payment
        if (!confirm(`Pay ৳${amount} from your wallet? Available balance: ৳${walletBalance}`)) {
            reject(new Error('Payment cancelled'));
            return;
        }
        
        // Process wallet payment
        try {
            const transactionId = 'WALLET' + Date.now().toString().slice(-10);
            
            // Deduct from wallet
            await deductFromWallet(user.id, amount, bookingId);
            
            resolve({
                success: true,
                transactionId: transactionId,
                method: 'wallet',
                amount: amount,
                message: 'Payment successful from Wallet'
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

// Validate Card Number (Luhn algorithm)
function validateCardNumber(cardNumber) {
    // Remove spaces and non-digits
    cardNumber = cardNumber.replace(/\D/g, '');
    
    // Check if it's a valid length
    if (cardNumber.length < 13 || cardNumber.length > 19) {
        return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));
        
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    
    return (sum % 10) === 0;
}

// Validate Card Expiry
function validateCardExpiry(expiry) {
    const [month, year] = expiry.split('/').map(Number);
    
    if (!month || !year || month < 1 || month > 12) {
        return false;
    }
    
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return false;
    }
    
    return true;
}

// Validate Card CVC
function validateCardCVC(cvc) {
    return /^\d{3,4}$/.test(cvc);
}

// Save Payment Record
async function savePaymentRecord(paymentData) {
    // In real app, send to API
    const payments = JSON.parse(localStorage.getItem('payments') || '[]');
    payments.push(paymentData);
    localStorage.setItem('payments', JSON.stringify(payments));
    
    // Also save to user's payment history
    const user = getUserData();
    if (user) {
        const userPayments = JSON.parse(localStorage.getItem(`payments_${user.id}`) || '[]');
        userPayments.push(paymentData);
        localStorage.setItem(`payments_${user.id}`, JSON.stringify(userPayments));
    }
    
    return paymentData;
}

// Update Booking Status
async function updateBookingStatus(bookingId, status) {
    const user = getUserData();
    if (!user) return;
    
    const userBookings = JSON.parse(localStorage.getItem(`bookings_${user.id}`) || '[]');
    const bookingIndex = userBookings.findIndex(b => b.id === bookingId);
    
    if (bookingIndex !== -1) {
        userBookings[bookingIndex].status = status;
        userBookings[bookingIndex].paid = true;
        userBookings[bookingIndex].paymentDate = new Date().toISOString();
        
        localStorage.setItem(`bookings_${user.id}`, JSON.stringify(userBookings));
    }
}

// Show Payment Success
function showPaymentSuccess(paymentResult) {
    // Hide payment form
    document.getElementById('paymentFormContainer').style.display = 'none';
    
    // Show success message
    const successHtml = `
        <div class="payment-success">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2>Payment Successful!</h2>
            <p>Your payment has been processed successfully.</p>
            
            <div class="payment-details">
                <div class="detail-row">
                    <span>Transaction ID:</span>
                    <span>${paymentResult.transactionId}</span>
                </div>
                <div class="detail-row">
                    <span>Amount Paid:</span>
                    <span>৳${paymentResult.amount}</span>
                </div>
                <div class="detail-row">
                    <span>Payment Method:</span>
                    <span>${paymentResult.method}</span>
                </div>
                <div class="detail-row">
                    <span>Date & Time:</span>
                    <span>${new Date().toLocaleString()}</span>
                </div>
            </div>
            
            <div class="success-actions">
                <button class="btn btn-primary" onclick="downloadReceipt('${paymentResult.transactionId}')">
                    <i class="fas fa-download"></i> Download Receipt
                </button>
                <button class="btn btn-outline" onclick="goToDashboard()">
                    <i class="fas fa-tachometer-alt"></i> Go to Dashboard
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('paymentContainer').innerHTML = successHtml;
    
    // Show notification
    showNotification('Payment completed successfully!', 'success');
}

// Download Receipt
function downloadReceipt(transactionId) {
    // Generate receipt content
    const user = getUserData();
    const payment = getPaymentDetails(transactionId);
    
    const receiptContent = `
        Udrive Bangladesh
        =====================
        
        Payment Receipt
        ----------------
        Receipt No: ${transactionId}
        Date: ${new Date().toLocaleDateString()}
        Time: ${new Date().toLocaleTimeString()}
        
        Customer Details:
        -----------------
        Name: ${user?.name || 'N/A'}
        Email: ${user?.email || 'N/A'}
        Phone: ${user?.phone || 'N/A'}
        
        Payment Details:
        -----------------
        Amount: ৳${payment?.amount || '0'}
        Method: ${payment?.method || 'N/A'}
        Status: ${payment?.status || 'N/A'}
        
        Booking Details:
        -----------------
        Booking ID: ${payment?.bookingId || 'N/A'}
        
        Thank you for choosing Udrive!
        ==============================
        
        For any queries, contact:
        support@udrive.com
        +880 1711-223344
    `;
    
    // Create and download file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Udrive_Receipt_${transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Receipt downloaded', 'success');
}

// Get Payment Details
function getPaymentDetails(transactionId) {
    const payments = JSON.parse(localStorage.getItem('payments') || '[]');
    return payments.find(p => p.id === transactionId);
}

// Go to Dashboard
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Wallet Management Functions
async function getWalletBalance(userId) {
    // In real app, fetch from API
    const wallet = JSON.parse(localStorage.getItem(`wallet_${userId}`) || '{"balance": 0}');
    return wallet.balance || 0;
}

async function deductFromWallet(userId, amount, reference) {
    const wallet = JSON.parse(localStorage.getItem(`wallet_${userId}`) || '{"balance": 0, "transactions": []}');
    
    if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    // Deduct amount
    wallet.balance -= amount;
    
    // Add transaction record
    const transaction = {
        id: generateId(),
        type: 'debit',
        amount: amount,
        reference: reference,
        description: 'Car booking payment',
        balanceAfter: wallet.balance,
        date: new Date().toISOString()
    };
    
    wallet.transactions.push(transaction);
    
    // Save updated wallet
    localStorage.setItem(`wallet_${userId}`, JSON.stringify(wallet));
    
    return transaction;
}

async function addToWallet(userId, amount, method = 'topup') {
    const wallet = JSON.parse(localStorage.getItem(`wallet_${userId}`) || '{"balance": 0, "transactions": []}');
    
    // Add amount
    wallet.balance += amount;
    
    // Add transaction record
    const transaction = {
        id: generateId(),
        type: 'credit',
        amount: amount,
        method: method,
        description: 'Wallet top-up',
        balanceAfter: wallet.balance,
        date: new Date().toISOString()
    };
    
    wallet.transactions.push(transaction);
    
    // Save updated wallet
    localStorage.setItem(`wallet_${userId}`, JSON.stringify(wallet));
    
    return transaction;
}

// Top-up Wallet
async function topUpWallet(amount, method) {
    const user = getUserData();
    if (!user) {
        showNotification('Please login to add money to wallet', 'error');
        return;
    }
    
    if (amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    // Process top-up payment
    try {
        // For demo, simulate payment
        showNotification(`Processing ${method} payment of ৳${amount}...`, 'info');
        
        setTimeout(async () => {
            try {
                // Add to wallet
                await addToWallet(user.id, amount, method);
                
                showNotification(`Successfully added ৳${amount} to your wallet`, 'success');
                
                // Refresh wallet balance display
                if (typeof loadWalletBalance === 'function') {
                    loadWalletBalance();
                }
                
            } catch (error) {
                showNotification('Failed to add money to wallet', 'error');
            }
        }, 2000);
        
    } catch (error) {
        showNotification('Top-up failed: ' + error.message, 'error');
    }
}

// Get Payment History
function getPaymentHistory(userId, limit = 10) {
    const payments = JSON.parse(localStorage.getItem(`payments_${userId}`) || '[]');
    return payments.slice(-limit).reverse();
}

// Initialize payment system on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if on payment-related page
    if (document.getElementById('paymentMethods') || 
        document.getElementById('paymentForm')) {
        initPaymentSystem();
    }
});