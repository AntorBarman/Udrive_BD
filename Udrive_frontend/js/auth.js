// ==========================================
// auth.js - WITH PROPER UTILS VALIDATION
// ==========================================

let currentStep = 1;

function initAuth() {
    setupAuthEvents();
    checkAuthStatus();
}

async function checkAuthStatus() {
    if (typeof window.supabaseClient === 'undefined') return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session) {
        if (!localStorage.getItem('udrive_user')) {
            localStorage.setItem('udrive_user', JSON.stringify(session.user));
            localStorage.setItem('udrive_token', session.access_token);
        }
        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
            const role = session.user?.user_metadata?.role || 'renter';
            window.location.href = role === 'earner' ? 'earner-portal.html' : 'dashboard.html';
        }
    }
}

function setupAuthEvents() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // ==========================================
    // 🔴 REAL-TIME UI VALIDATION USING utils.js
    // ==========================================
    const regEmail = document.getElementById('regEmail');
    const phone = document.getElementById('phone');
    const regPassword = document.getElementById('regPassword');
    const loginEmail = document.getElementById('email');

    if (regEmail) regEmail.addEventListener('input', window.utils.debounce(function () {
        validateFieldUI(this, window.utils.validateEmail(this.value), 'Please enter a valid email address (e.g., user@mail.com)');
    }, 500));

    if (phone) phone.addEventListener('input', window.utils.debounce(function () {
        validateFieldUI(this, window.utils.validatePhone(this.value), 'Please enter a valid Bangladeshi phone number (e.g., 017...)');
    }, 500));

    if (regPassword) regPassword.addEventListener('input', window.utils.debounce(function () {
        validateFieldUI(this, window.utils.validatePassword(this.value), 'At least 6 characters, 1 letter, and 1 number required');
    }, 500));

    if (loginEmail) loginEmail.addEventListener('input', window.utils.debounce(function () {
        validateFieldUI(this, window.utils.validateEmail(this.value), 'Please enter a valid email format');
    }, 500));
}

// UI Error Show/Hide Helper
function validateFieldUI(input, isValid, errorMsg) {
    let errorSpan = input.parentElement.querySelector('.error-text');
    if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'error-text';
        errorSpan.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;';
        input.parentElement.appendChild(errorSpan);
    }

    if (!input.value) {
        errorSpan.textContent = '';
        input.style.borderColor = '#e2e8f0';
    } else if (!isValid) {
        errorSpan.textContent = errorMsg;
        input.style.borderColor = '#ef4444';
    } else {
        errorSpan.textContent = '';
        input.style.borderColor = '#10b981';
    }
}

// ==========================================
// 🔵 HANDLE LOGIN
// ==========================================
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button[type="submit"]') || document.getElementById('submitBtn');
    const originalText = btn ? btn.innerText : 'Sign In';

    // 🔴 FORM SUBMIT VALIDATION (Calling utils.js)
    if (!window.utils.validateEmail(email)) {
        window.utils.showNotification('Please enter a valid email address!', 'error');
        return;
    }
    if (!password) {
        window.utils.showNotification('Password is required!', 'error');
        return;
    }

    try {
        if (btn) { btn.innerText = 'Signing in...'; btn.disabled = true; }
        if (!window.supabaseClient) throw new Error("Supabase not connected!");

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.user) {
            localStorage.setItem('udrive_user', JSON.stringify(data.user));
            if (data.session) localStorage.setItem('udrive_token', data.session.access_token);
        }

        window.utils.showNotification('✅ Login successful!', 'success');

        const role = data.user?.user_metadata?.role || 'renter';
        setTimeout(() => {
            window.location.href = role === 'earner' ? 'earner-portal.html' : 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) msg = 'Wrong email or password!';
        if (msg.includes('Email not confirmed')) msg = 'Your email is not confirmed.';

        window.utils.showNotification('❌ Login Failed: ' + msg, 'error');
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
}

// ==========================================
// 🟢 HANDLE REGISTER
// ==========================================
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('fullName')?.value?.trim();
    const email = document.getElementById('regEmail')?.value?.trim();
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const phone = document.getElementById('phone')?.value?.trim() || '';
    const agreeTerms = document.getElementById('agreeTerms')?.checked;
    const role = document.getElementById('selectedRole')?.value || 'renter';

    // 🔴 STRICT FORM SUBMIT VALIDATION (Calling utils.js)
    if (!name) {
        window.utils.showNotification('Full Name is required', 'error'); return;
    }
    if (!window.utils.validateEmail(email)) {
        window.utils.showNotification('Invalid Email Format!', 'error'); return;
    }
    if (!window.utils.validatePhone(phone)) {
        window.utils.showNotification('Invalid BD Phone Number!', 'error'); return;
    }
    if (!window.utils.validatePassword(password)) {
        window.utils.showNotification('Password must be min 6 chars, 1 letter & 1 number', 'error'); return;
    }
    if (password !== confirmPassword) {
        window.utils.showNotification('Passwords do not match', 'error'); return;
    }
    if (!agreeTerms) {
        window.utils.showNotification('Please agree to the Terms & Conditions', 'error'); return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn ? submitBtn.textContent : 'Create Account';

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        if (!window.supabaseClient) throw new Error("Supabase not connected!");

        const { data, error } = await window.supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { data: { name: name, phone: phone, role: role } }
        });

        if (error) throw error;

        if (data.user) {
            await window.supabaseClient.from('profiles').upsert([{
                id: data.user.id, name: name, email: email, phone: phone, role: role
            }]);
        }

        window.utils.showNotification('🎉 Account created successfully!', 'success');

        if (data.session) {
            localStorage.setItem('udrive_user', JSON.stringify(data.user));
            localStorage.setItem('udrive_token', data.session.access_token);
            setTimeout(() => {
                window.location.href = role === 'earner' ? 'earner-portal.html' : 'dashboard.html';
            }, 1500);
        } else {
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }

    } catch (error) {
        console.error("Registration error:", error);
        let msg = error.message;
        if (msg.includes('already registered')) msg = 'This email is already registered!';
        window.utils.showNotification('❌ ' + msg, 'error');

    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
}

// ==========================================
// Social Login & Logout (Unchanged)
// ==========================================
async function loginWithGoogle() {
    await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}/index.html` }
    });
}

async function loginWithFacebook() {
    await window.supabaseClient.auth.signInWithOAuth({
        provider: 'facebook', options: { redirectTo: `${window.location.origin}/index.html` }
    });
}

window.logout = async function () {
    if (window.utils) window.utils.showNotification('Logging out...', 'info');
    try {
        if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    } catch (error) {
        console.warn('Supabase logout warning:', error);
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        if (window.utils) window.utils.showNotification('Logged out successfully', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', initAuth);