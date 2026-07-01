// ==========================================
// js/wallet.js (Dynamic with Supabase)
// ==========================================

let globalTransactions = [];
let currentWalletBalance = 0;

async function loadWallet() {
    const userStr = localStorage.getItem('udrive_user');
    if (!userStr) {
        showWalletError('Please login to view your wallet data.');
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (err) {
        console.error('Invalid wallet user data:', err);
        localStorage.removeItem('udrive_user');
        showWalletError('Invalid session. Please login again.');
        return;
    }

    if (!user || !user.id) {
        showWalletError('Invalid user session. Please login again.');
        return;
    }

    // Load user profile in sidebar
    const name = user.user_metadata?.name || user.name || 'User';
    document.getElementById('earnerNameDisplay').textContent = name;
    document.getElementById('profileInitial').textContent = name.charAt(0).toUpperCase();
    const emailElement = document.getElementById('userEmail');
    if (emailElement) emailElement.textContent = user.email || 'user@email.com';

    try {
        if (!window.supabaseClient) throw new Error('Supabase is not connected!');

        const walletTable = window.DB_TABLES?.WALLETS || 'wallet_transactions';

        console.log('Loading wallet for user:', user.id, 'from table:', walletTable);

        const { data: transactions, error } = await window.supabaseClient
            .from(walletTable)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Wallet query error:', error);
            // If table doesn't exist, show setup message
            if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
                console.warn('Wallet transactions table does not exist yet.');
                showWalletSetupMessage();
                return;
            }
            throw error;
        }

        console.log('Wallet transactions loaded:', transactions?.length || 0);
        globalTransactions = transactions || [];

        // ২. ব্যালেন্স হিসাব করা (Credit - Debit)
        currentWalletBalance = globalTransactions.reduce((acc, txn) => {
            const amount = parseFloat(txn.amount) || 0;
            if (txn.type === 'credit') return acc + amount;
            if (txn.type === 'debit') return acc - amount;
            return acc;
        }, 0);

        // ৩. আপনার UI আপডেট ফাংশনগুলো কল করা
        loadWalletBalanceUI();
        loadRecentTransactionsUI();
        loadWalletStatsUI();
        setupWalletEvents();

        if (globalTransactions.length === 0) {
            showWalletMessage(`
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-wallet" style="font-size: 48px; color: #e5e7eb; margin-bottom: 15px;"></i>
                    <h3 style="color: #6b7280; margin-bottom: 10px;">No Transactions Yet</h3>
                    <p style="color: #9ca3af; margin-bottom: 20px;">Your wallet is ready! Earnings from car rentals will appear here.</p>
                    <button onclick="testWalletConnection()" class="btn btn-primary" style="background: #10b981; border: none; padding: 10px 20px; border-radius: 5px; color: white; cursor: pointer;">Test Connection</button>
                </div>
            `);
        }
    } catch (err) {
        console.error('Wallet Load Error:', err);
        console.error('Error details:', err.message);
        console.error('User ID:', user.id);
        console.error('Table name:', walletTable);
        showWalletError(`Unable to load wallet data: ${err.message}`);
    }
}

function showWalletMessage(message) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-info-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

function showWalletError(message) {
    const balanceElement = document.getElementById('currentBalance');
    if (balanceElement) {
        balanceElement.textContent = '৳0.00';
    }
    const totalAddedElement = document.getElementById('totalAdded');
    const totalSpentElement = document.getElementById('totalSpentWallet');
    const totalTxElement = document.getElementById('totalTransactions');
    if (totalAddedElement) totalAddedElement.textContent = '৳0';
    if (totalSpentElement) totalSpentElement.textContent = '৳0';
    if (totalTxElement) totalTxElement.textContent = '0';
    showWalletMessage(message);
}

// Test wallet connection and table existence
async function testWalletConnection() {
    const userStr = localStorage.getItem('udrive_user');
    if (!userStr) {
        alert('Please login first');
        return;
    }

    const user = JSON.parse(userStr);
    const walletTable = window.DB_TABLES?.WALLETS || 'wallet_transactions';

    try {
        alert(`Testing connection...\nUser ID: ${user.id}\nTable: ${walletTable}`);

        // Try to select from the table
        const { data, error } = await window.supabaseClient
            .from(walletTable)
            .select('count', { count: 'exact', head: true });

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
                alert(`❌ Table '${walletTable}' does not exist in database!\n\nPlease create the table in Supabase dashboard with columns:\n- user_id (text/uuid)\n- amount (numeric)\n- type (text: 'credit'/'debit')\n- description (text)\n- transaction_id (text, optional)\n- booking_id (text, optional)\n- created_at (timestamp)`);
            } else {
                alert(`❌ Database error: ${error.message}\nCode: ${error.code}`);
            }
        } else {
            alert(`✅ Connection successful!\nTable exists with ${data || 0} records accessible.`);
        }
    } catch (err) {
        alert(`❌ Connection failed: ${err.message}`);
    }
}

// Show setup message when table doesn't exist
function showWalletSetupMessage() {
    const message = `
        <div style="text-align: center; padding: 30px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; margin: 20px 0;">
            <i class="fas fa-tools" style="font-size: 48px; color: #f59e0b; margin-bottom: 15px;"></i>
            <h3 style="color: #92400e; margin-bottom: 10px;">Wallet System Setup Required</h3>
            <p style="color: #78350f; margin-bottom: 20px; line-height: 1.5;">
                The wallet transactions table needs to be created in your Supabase database.<br>
                Please run the SQL script located at: <code>wallet_table_setup.sql</code>
            </p>
            <button onclick="testWalletConnection()" class="btn btn-primary" style="background: #f59e0b; border: none; padding: 10px 20px; border-radius: 5px; color: white; cursor: pointer; margin-right: 10px;">Test Connection</button>
            <button onclick="loadWallet()" class="btn btn-secondary" style="background: #6b7280; border: none; padding: 10px 20px; border-radius: 5px; color: white; cursor: pointer;">Retry</button>
        </div>
    `;
    showWalletMessage(message);

    // Reset balance display
    const balanceElement = document.getElementById('currentBalance');
    if (balanceElement) balanceElement.textContent = 'Setup Required';

    const totalAddedElement = document.getElementById('totalAdded');
    const totalSpentElement = document.getElementById('totalSpentWallet');
    const totalTxElement = document.getElementById('totalTransactions');
    if (totalAddedElement) totalAddedElement.textContent = '৳0';
    if (totalSpentElement) totalSpentElement.textContent = '৳0';
    if (totalTxElement) totalTxElement.textContent = '0';
}

function loadWalletBalanceUI() {
    document.getElementById('currentBalance').textContent = `৳${currentWalletBalance.toLocaleString('en-BD')}`;
}

function loadRecentTransactionsUI() {
    const recentTransactions = globalTransactions.slice(0, 5); // সর্বশেষ ৫টি
    
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    if (recentTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <p>No transactions yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-row">
                <div class="transaction-icon">
                    <i class="fas fa-${transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'} ${transaction.type}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.description || 'Transaction'}</h4>
                    <p>${formatDate(transaction.created_at)}</p>
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                <span>${transaction.type === 'credit' ? '+' : '-'}৳${transaction.amount}</span>
            </div>
        </div>
    `).join('');
}

function loadWalletStatsUI() {
    const totalAdded = globalTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalSpent = globalTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    document.getElementById('totalAdded').textContent = `৳${totalAdded}`;
    document.getElementById('totalSpentWallet').textContent = `৳${totalSpent}`;
    document.getElementById('totalTransactions').textContent = globalTransactions.length;
}

function setupWalletEvents() {
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            const method = this.dataset.method;
            document.querySelectorAll('[id$="Details"]').forEach(form => form.style.display = 'none');
            
            const detailsForm = document.getElementById(`${method}Details`);
            if (detailsForm) detailsForm.style.display = 'block';
        });
    });
}

function showAddMoneyModal() {
    document.getElementById('addMoneyModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAddMoneyModal() {
    document.getElementById('addMoneyModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ==========================================
// 🚀 DYNAMIC TRANSACTIONS (ADD, WITHDRAW, SEND)
// ==========================================

async function processTopUp() {
    const amount = parseFloat(document.getElementById('addAmount').value);
    const selectedMethod = document.querySelector('.payment-option.selected');
    const user = JSON.parse(localStorage.getItem('udrive_user'));
    
    if (!amount || amount < 100 || amount > 50000) {
        alert('Please enter a valid amount between ৳100 and ৳50,000'); return;
    }
    if (!selectedMethod) {
        alert('Please select a payment method'); return;
    }
    
    const method = selectedMethod.dataset.method;
    
    // Use payment.js to initiate SSLCommerz payment
    if (typeof initiatePayment === 'function') {
        await initiatePayment(amount, method, user.id, 'Wallet Top-up');
    } else {
        alert('Payment system not loaded. Please refresh the page.');
    }
}

function showWithdrawModal() {
    if (currentWalletBalance < 100) {
        alert('Minimum withdrawal amount is ৳100'); return;
    }
    // ... [আপনার আগের মোডালের HTML হুবহু এক থাকবে, শুধু ${balance} এর জায়গায় ${currentWalletBalance} হবে] ...
    const modalHtml = `
        <div class="modal active" id="withdrawModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Withdraw Money</h3>
                    <button class="modal-close" onclick="closeModal('withdrawModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Available Balance: <strong>৳${currentWalletBalance}</strong></label>
                    </div>
                    <div class="form-group">
                        <label>Amount to Withdraw</label>
                        <div class="input-group">
                            <span class="input-group-text">৳</span>
                            <input type="number" id="withdrawAmount" placeholder="Enter amount" min="100" max="${currentWalletBalance}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Withdraw to</label>
                        <select id="withdrawMethod" onchange="updateWithdrawDetails()">
                            <option value="bkash">bKash</option>
                            <option value="nagad">Nagad</option>
                        </select>
                    </div>
                    <div id="withdrawDetails">
                        <div class="form-group">
                            <label>Mobile Number</label>
                            <input type="tel" id="withdrawNumber" placeholder="01XXXXXXXXX">
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="processWithdrawal()">Withdraw</button>
                </div>
            </div>
        </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
}

async function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const user = JSON.parse(localStorage.getItem('udrive_user'));
    
    if (!amount || amount < 100) { alert('Minimum ৳100'); return; }
    if (currentWalletBalance < amount + 10) { alert(`Insufficient balance (including ৳10 fee)`); return; }
    
    try {
        // Supabase এ Debit এন্ট্রি করা
        const { error } = await window.supabaseClient.from('wallet_transactions').insert([{
            user_id: user.id,
            amount: amount + 10, // উইথড্র অ্যামাউন্ট + ১০ টাকা ফি
            type: 'debit',
            description: `Withdrawal via ${method.toUpperCase()} (incl. fee)`
        }]);

        if (error) throw error;

        alert('Withdrawal request submitted successfully!');
        closeModal('withdrawModal');
        loadWallet(); // ডাটা রিফ্রেশ
    } catch (err) {
        alert('Withdrawal failed: ' + err.message);
    }
}

function showSendMoneyModal() {
    // ... [আপনার আগের Send Money Modal HTML] ...
    const modalHtml = `
        <div class="modal active" id="sendMoneyModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Send Money</h3>
                    <button class="modal-close" onclick="closeModal('sendMoneyModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Recipient Phone or Email</label>
                        <input type="text" id="recipientInfo" placeholder="Enter recipient info">
                    </div>
                    <div class="form-group">
                        <label>Amount</label>
                        <div class="input-group">
                            <span class="input-group-text">৳</span>
                            <input type="number" id="sendAmount" placeholder="Enter amount">
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="sendMoney()">Send Money</button>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
}

async function sendMoney() {
    const recipient = document.getElementById('recipientInfo').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const user = JSON.parse(localStorage.getItem('udrive_user'));
    
    if (!recipient || amount < 10) { alert('Valid info and minimum ৳10 required'); return; }
    if (currentWalletBalance < amount) { alert('Insufficient balance'); return; }
    
    try {
        // Supabase এ Debit এন্ট্রি করা
        const { error } = await window.supabaseClient.from('wallet_transactions').insert([{
            user_id: user.id,
            amount: amount,
            type: 'debit',
            description: `Sent Money to ${recipient}`
        }]);

        if (error) throw error;

        alert(`৳${amount} sent successfully to ${recipient}`);
        closeModal('sendMoneyModal');
        loadWallet(); // ডাটা রিফ্রেশ
    } catch (err) {
        alert('Send failed: ' + err.message);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function updateWithdrawDetails() { /* UI update logic */ }

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}