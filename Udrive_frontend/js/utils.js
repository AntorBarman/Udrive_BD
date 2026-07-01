// Utility Functions

// Format currency
function formatCurrency(amount) {
    return `৳${parseFloat(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone number (Bangladesh)
function validatePhone(phone) {
    const re = /^01[3-9]\d{8}$/;
    return re.test(phone.replace(/[\s-]/g, ''));
}
// Validate Password (অন্তত ৬ ক্যারেক্টার, ১টি অক্ষর ও ১টি সংখ্যা)
function validatePassword(password) {
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return re.test(password);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

// Set URL parameters
function setUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
    });
    window.history.pushState({}, '', url);
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

// Generate random ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Set loading state
function setLoading(element, isLoading) {
    if (!element) return;
    
    if (isLoading) {
        element.classList.add('loading');
        element.disabled = true;
        
        // Save original text
        if (!element.dataset.originalText) {
            element.dataset.originalText = element.textContent;
        }
        element.textContent = 'Loading...';
    } else {
        element.classList.remove('loading');
        element.disabled = false;
        
        // Restore original text
        if (element.dataset.originalText) {
            element.textContent = element.dataset.originalText;
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function getNotificationColor(type) {
    switch(type) {
        case 'success': return '#006A4E';
        case 'error': return '#F42A41';
        case 'warning': return '#F39C12';
        default: return '#3498DB';
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
    
    .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.8;
        line-height: 1;
        padding: 0;
        width: 24px;
        height: 24px;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        showNotification('Failed to copy', 'error');
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Calculate days between dates
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

// Check if date is in past
function isPastDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
}

// Check if date is in future
function isFutureDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
}

// Truncate text
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Slugify text
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Generate booking ID
function generateBookingId() {
    const prefix = 'UD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// Calculate total price with dates
function calculateTotalPrice(dailyRate, pickupDate, returnDate, addons = []) {
    const days = daysBetween(pickupDate, returnDate);
    if (days < 1) return 0;
    
    const basePrice = parseFloat(dailyRate) * days;
    const addonPrice = addons.reduce((sum, addon) => sum + parseFloat(addon.price || 0), 0);
    
    return basePrice + addonPrice;
}

// Storage helpers for Supabase
async function uploadFile(bucket, path, file) {
    try {
        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

async function getPublicUrl(bucket, path) {
    const { data } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(path);
    
    return data.publicUrl;
}

async function deleteFile(bucket, path) {
    try {
        const { error } = await supabaseClient.storage
            .from(bucket)
            .remove([path]);
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Delete error:', error);
        throw error;
    }
}

// Local storage helpers (fallback)
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('LocalStorage save error:', error);
        return false;
    }
}

function getFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('LocalStorage get error:', error);
        return defaultValue;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('LocalStorage remove error:', error);
        return false;
    }
}

// Export functions for use in other files
window.utils = {
    formatCurrency,
    formatDate,
    formatDateTime,
    validateEmail,
    validatePhone,
    debounce,
    getUrlParams,
    setUrlParams,
    togglePassword,
    generateId,
    setLoading,
    showNotification,
    copyToClipboard,
    formatFileSize,
    daysBetween,
    isPastDate,
    isFutureDate,
    truncateText,
    slugify,
    generateBookingId,
    calculateTotalPrice,
    uploadFile,
    getPublicUrl,
    deleteFile,
    saveToLocalStorage,
    getFromLocalStorage,
    removeFromLocalStorage,
    validatePassword
};