// js/admin.js

// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin Panel Loaded");

    if (document.querySelector('.action-count')) {
        await initAdminDashboard();
    }

    if (document.getElementById('kycDocumentsList')) {
        await loadPendingKYC();
    }

    if (document.getElementById('carTableBody')) {
        await loadAdminCars();
    }
});

// --- 2. DASHBOARD STATS ---
async function initAdminDashboard() {
    try {
        const { count: pendingKYC } = await supabaseClient
            .from('kyc_verifications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const { count: pendingCars } = await supabaseClient
            .from('cars')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const kycBadge = document.querySelector('.action-count');
        if (kycBadge) kycBadge.textContent = pendingKYC || 0;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// --- 3. KYC MANAGEMENT ---
async function loadPendingKYC() {
    const container = document.getElementById('kycDocumentsList');
    if (!container) return;

    try {
        const { data: kycDocs, error } = await supabaseClient
            .from('kyc_verifications')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!kycDocs || kycDocs.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">No pending KYC requests found.</p>';
            return;
        }

        container.innerHTML = kycDocs.map(doc => `
            <div class="kyc-item" id="kyc-${doc.id}">
                <div class="kyc-user">
                    <h4>${doc.full_name || 'Unknown User'}</h4>
                    <p><strong>NID:</strong> ${doc.nid_number || 'N/A'}</p>
                    <p><small>Submitted: ${new Date(doc.created_at).toLocaleDateString()}</small></p>
                </div>
                <div class="kyc-actions">
                    <button onclick="viewKycDocuments('${doc.id}')" class="btn btn-outline btn-sm">
                        <i class="fas fa-eye"></i> View Documents
                    </button>
                    <button onclick="approveKYC('${doc.id}')" class="btn btn-primary btn-sm">Approve</button>
                    <button onclick="rejectKYC('${doc.id}')" class="btn btn-outline btn-sm" style="color:red; border-color:red">Reject</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading KYC:', error);
        container.innerHTML = '<p style="color:red; text-align:center;">Error loading data.</p>';
    }
}

// ✅ KYC Documents Modal
function viewKycDocuments(docId) {
    supabaseClient
        .from('kyc_verifications')
        .select('*')
        .eq('id', docId)
        .single()
        .then(({ data: doc, error }) => {
            if (error || !doc) { alert('Document not found!'); return; }

            const documents = [
                { label: '🪪 NID Front', url: doc.nid_front_url },
                { label: '🪪 NID Back', url: doc.nid_back_url },
                { label: '🚗 License Front', url: doc.license_front_url },
                { label: '🚗 License Back', url: doc.license_back_url },
            ].filter(d => d.url);

            showDocumentModal(`📄 ${doc.full_name} - KYC Documents`, documents, 'docModal');
        });
}

async function approveKYC(recordId) {
    if (!confirm('Approve this user?')) return;
    try {
        const { error } = await supabaseClient
            .from('kyc_verifications')
            .update({ status: 'verified' })
            .eq('id', recordId);

        if (error) throw error;
        alert('✅ User Verified Successfully!');
        document.getElementById(`kyc-${recordId}`).remove();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function rejectKYC(recordId) {
    if (!confirm('Reject this user?')) return;
    try {
        const { error } = await supabaseClient
            .from('kyc_verifications')
            .update({ status: 'rejected' })
            .eq('id', recordId);

        if (error) throw error;
        alert('User Rejected.');
        document.getElementById(`kyc-${recordId}`).remove();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// --- 4. CAR MANAGEMENT ---
async function loadAdminCars() {
    const tbody = document.getElementById('carTableBody');
    if (!tbody) return;

    try {
        const { data: cars, error } = await supabaseClient
            .from('cars')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cars || cars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No cars found.</td></tr>';
            return;
        }

        tbody.innerHTML = cars.map(car => {
            const carName = car.make ? `${car.make} ${car.model}` : (car.name || 'Unnamed Car');
            const carPrice = car.daily_rate || car.dailyPrice || car.price || 0;

            // ✅ Image সঠিকভাবে নেওয়া
            let imageUrl = 'https://via.placeholder.com/60';
            if (car.image_url) {
                imageUrl = car.image_url;
            } else if (car.images && Array.isArray(car.images) && car.images.length > 0) {
                imageUrl = car.images[0];
            }

            return `
            <tr id="car-row-${car.id}">
                <td>
                    <img src="${imageUrl}" alt="Car" 
                        style="width:70px; height:50px; object-fit:cover; border-radius:6px;">
                </td>
                <td>
                    <strong>${carName}</strong> (${car.year || 'N/A'})<br>
                    <small>Reg: ${car.description?.match(/Reg: ([^\)]+)/)?.[1] || 'N/A'}</small><br>
                    <small>${car.location || 'Dhaka'}</small>
                </td>
                <td>৳${carPrice}/day</td>
                <td>
                    <span id="status-${car.id}" class="status-badge status-${(car.status || 'pending').toLowerCase()}">
                        ${car.status || 'Pending'}
                    </span>
                </td>
                <td>
                    <button onclick="viewCarDocuments('${car.id}')" 
                        class="btn btn-sm" 
                        style="background:#2563eb; color:white; border:none; margin-right:5px; padding:6px 10px; border-radius:5px; cursor:pointer;"
                        title="View Documents">
                        <i class="fas fa-file-alt"></i> Docs
                    </button>
                    ${car.status !== 'approved' ? `
                        <button onclick="approveCar('${car.id}')" 
                            class="btn btn-sm" 
                            style="background:#28a745; color:white; border:none; margin-right:5px; padding:6px 10px; border-radius:5px; cursor:pointer;">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button onclick="deleteCar('${car.id}')" 
                        class="btn btn-sm" 
                        style="background:#dc3545; color:white; border:none; padding:6px 10px; border-radius:5px; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error('Error loading cars:', error);
    }
}

// ✅ Car Documents Modal
async function viewCarDocuments(carId) {
    try {
        const { data: doc, error } = await supabaseClient
            .from('car_documents')
            .select('*')
            .eq('car_id', carId)
            .single();

        if (error || !doc) {
            alert('এই গাড়ির কোনো document পাওয়া যায়নি!');
            return;
        }

        const documents = [
            { label: '📋 Registration Certificate', url: doc.registration_url },
            { label: '🏥 Fitness Certificate', url: doc.fitness_url },
            { label: '🪙 Tax Token', url: doc.tax_token_url },
            { label: '🛡️ Insurance Papers', url: doc.insurance_url },
        ].filter(d => d.url);

        showDocumentModal('🚗 Car Documents', documents, 'carDocModal');

    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ✅ Universal Modal Function (KYC ও Car দুটোর জন্যই কাজ করবে)
function showDocumentModal(title, documents, modalId) {
    // আগের modal থাকলে সরিয়ে দাও
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const docsHTML = documents.length > 0
        ? documents.map(d => {
            const isImage = d.url.match(/\.(jpg|jpeg|png|gif|webp)/i);
            return `
                <div style="text-align:center;">
                    <p style="font-weight:600; margin-bottom:8px;">${d.label}</p>
                    ${isImage
                        ? `<a href="${d.url}" target="_blank">
                               <img src="${d.url}" 
                                   style="width:100%; max-width:280px; height:180px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer; transition:0.3s;"
                                   onmouseover="this.style.opacity='0.8'"
                                   onmouseout="this.style.opacity='1'">
                           </a>`
                        : `<a href="${d.url}" target="_blank" 
                               style="display:inline-flex; align-items:center; gap:8px; padding:12px 20px; background:#2563eb; color:white; border-radius:8px; text-decoration:none; font-weight:500;">
                               <i class="fas fa-file-pdf"></i> View / Download
                           </a>`
                    }
                </div>`;
        }).join('')
        : '<p style="color:red; text-align:center; grid-column:1/-1;">কোনো document আপলোড হয়নি!</p>';

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.75); z-index:9999;
        display:flex; align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:white; border-radius:14px; padding:30px; width:92%; max-width:800px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid #e2e8f0;">
                <h3 style="margin:0; font-size:1.3rem; color:#1e293b;">${title}</h3>
                <button onclick="document.getElementById('${modalId}').remove()"
                    style="background:#f1f5f9; border:none; border-radius:50%; width:36px; height:36px; font-size:1.1rem; cursor:pointer; color:#64748b;">✕</button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:25px;">
                ${docsHTML}
            </div>
        </div>`;

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

async function approveCar(carId) {
    if (!confirm('Approve this car?')) return;
    try {
        const { error } = await supabaseClient
            .from('cars')
            .update({ status: 'approved' })
            .eq('id', carId);
        if (error) throw error;
        alert('✅ Car Approved!');
        loadAdminCars();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function deleteCar(carId) {
    if (!confirm('Delete this car permanently?')) return;
    try {
        // car_documents ও delete করুন
        await supabaseClient
            .from('car_documents')
            .delete()
            .eq('car_id', carId);

        const { error } = await supabaseClient
            .from('cars')
            .delete()
            .eq('id', carId);

        if (error) throw error;
        alert('Car Deleted.');
        const row = document.getElementById(`car-row-${carId}`);
        if (row) row.remove();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}