// Branches Page Functions
let map = null;
let markers = [];

function initBranchesPage() {
    initializeMap();
    loadBranches();
    setupBranchEvents();
}

function initializeMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    // Initialize map centered on Bangladesh
    map = L.map('map').setView([23.6850, 90.3563], 7);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function loadBranches() {
    const branches = [
        {
            id: 'gulshan',
            name: 'Dhaka - Gulshan',
            lat: 23.7940,
            lng: 90.4154,
            phone: '+880 1711-223344',
            address: 'Road 12, Block C, Gulshan 1, Dhaka 1212',
            hours: '8:00 AM - 10:00 PM',
            status: 'active'
        },
        {
            id: 'banani',
            name: 'Dhaka - Banani',
            lat: 23.7930,
            lng: 90.4054,
            phone: '+880 1711-223355',
            address: 'Road 11, Block F, Banani, Dhaka 1213',
            hours: '8:00 AM - 10:00 PM',
            status: 'active'
        },
        {
            id: 'chittagong',
            name: 'Chittagong',
            lat: 22.3569,
            lng: 91.7832,
            phone: '+880 1811-223366',
            address: 'Agrabad Commercial Area, Chittagong 4100',
            hours: '9:00 AM - 9:00 PM',
            status: 'active'
        },
        {
            id: 'sylhet',
            name: 'Sylhet',
            lat: 24.8949,
            lng: 91.8687,
            phone: '+880 1711-223377',
            address: 'Zindabazar, Sylhet 3100',
            hours: '9:00 AM - 8:00 PM',
            status: 'active'
        },
        {
            id: 'khulna',
            name: 'Khulna',
            lat: 22.8456,
            lng: 89.5403,
            phone: '+880 1711-223388',
            address: 'Sonadanga R/A, Khulna 9100',
            hours: '9:00 AM - 8:00 PM',
            status: 'active'
        },
        {
            id: 'rajshahi',
            name: 'Rajshahi',
            lat: 24.3745,
            lng: 88.6042,
            phone: '+880 1711-223399',
            address: 'Shaheb Bazar, Rajshahi 6000',
            hours: '9:00 AM - 8:00 PM',
            status: 'active'
        }
    ];
    
    // Add markers to map
    branches.forEach(branch => {
        const marker = L.marker([branch.lat, branch.lng]).addTo(map);
        
        // Custom icon based on status
        const iconColor = branch.status === 'active' ? '#006A4E' : '#F42A41';
        marker.setIcon(L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${iconColor}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">U</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        }));
        
        // Add popup
        marker.bindPopup(`
            <div class="map-popup">
                <h4>${branch.name}</h4>
                <p><i class="fas fa-phone"></i> ${branch.phone}</p>
                <p><i class="fas fa-clock"></i> ${branch.hours}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${branch.address}</p>
                <button onclick="selectBranch('${branch.id}')" class="btn btn-sm btn-primary">Select Branch</button>
            </div>
        `);
        
        markers.push(marker);
        
        // Add click event to branch cards
        const branchCard = document.querySelector(`[onclick*="${branch.id}"]`);
        if (branchCard) {
            branchCard.addEventListener('click', () => {
                map.setView([branch.lat, branch.lng], 15);
                marker.openPopup();
            });
        }
    });
}

function setupBranchEvents() {
    // Branch selection
    document.querySelectorAll('.branch-card button').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            selectBranch(branchId);
        });
    });
    
    // Branch search
    const searchInput = document.getElementById('branchSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchBranches);
    }
}

function selectBranch(branchId) {
    // Get branch data
    const branches = {
        gulshan: {
            name: 'Dhaka - Gulshan',
            phone: '+880 1711-223344',
            address: 'Road 12, Block C, Gulshan 1, Dhaka 1212'
        },
        banani: {
            name: 'Dhaka - Banani',
            phone: '+880 1711-223355',
            address: 'Road 11, Block F, Banani, Dhaka 1213'
        },
        chittagong: {
            name: 'Chittagong',
            phone: '+880 1811-223366',
            address: 'Agrabad Commercial Area, Chittagong 4100'
        },
        sylhet: {
            name: 'Sylhet',
            phone: '+880 1711-223377',
            address: 'Zindabazar, Sylhet 3100'
        },
        khulna: {
            name: 'Khulna',
            phone: '+880 1711-223388',
            address: 'Sonadanga R/A, Khulna 9100'
        },
        rajshahi: {
            name: 'Rajshahi',
            phone: '+880 1711-223399',
            address: 'Shaheb Bazar, Rajshahi 6000'
        }
    };
    
    const branch = branches[branchId];
    if (!branch) return;
    
    // Save selected branch to localStorage
    localStorage.setItem('selectedBranch', JSON.stringify({
        id: branchId,
        ...branch
    }));
    
    // Show success message
    showNotification(`${branch.name} selected as your preferred branch`, 'success');
    
    // If on booking page, update the branch selection
    if (window.location.pathname.includes('reservation.html') || 
        window.location.pathname.includes('car-details.html')) {
        const branchSelect = document.getElementById('pickupLocation');
        if (branchSelect) {
            branchSelect.value = branch.name;
        }
    }
}

function searchBranches(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // Filter branch cards
    document.querySelectorAll('.branch-card').forEach(card => {
        const branchName = card.querySelector('h3').textContent.toLowerCase();
        const branchAddress = card.querySelector('.branch-info').textContent.toLowerCase();
        
        if (branchName.includes(searchTerm) || branchAddress.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Filter map markers
    markers.forEach(marker => {
        const branchName = marker.getPopup().getContent().toLowerCase();
        if (branchName.includes(searchTerm)) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

// Get current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Add user location marker
                L.marker([userLat, userLng])
                    .addTo(map)
                    .bindPopup('Your Location')
                    .openPopup();
                
                // Center map on user location
                map.setView([userLat, userLng], 12);
                
                // Find nearest branch
                findNearestBranch(userLat, userLng);
            },
            (error) => {
                console.error('Geolocation error:', error);
                showNotification('Unable to get your location', 'error');
            }
        );
    } else {
        showNotification('Geolocation is not supported by your browser', 'error');
    }
}

function findNearestBranch(userLat, userLng) {
    const branches = [
        { id: 'gulshan', lat: 23.7940, lng: 90.4154, name: 'Gulshan Branch' },
        { id: 'banani', lat: 23.7930, lng: 90.4054, name: 'Banani Branch' },
        { id: 'chittagong', lat: 22.3569, lng: 91.7832, name: 'Chittagong Branch' },
        { id: 'sylhet', lat: 24.8949, lng: 91.8687, name: 'Sylhet Branch' },
        { id: 'khulna', lat: 22.8456, lng: 89.5403, name: 'Khulna Branch' },
        { id: 'rajshahi', lat: 24.3745, lng: 88.6042, name: 'Rajshahi Branch' }
    ];
    
    let nearestBranch = null;
    let shortestDistance = Infinity;
    
    branches.forEach(branch => {
        const distance = calculateDistance(userLat, userLng, branch.lat, branch.lng);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestBranch = branch;
        }
    });
    
    if (nearestBranch) {
        showNotification(`Nearest branch: ${nearestBranch.name} (${Math.round(shortestDistance)} km away)`, 'info');
        
        // Draw line to nearest branch
        L.polyline([
            [userLat, userLng],
            [nearestBranch.lat, nearestBranch.lng]
        ], { color: 'blue' }).addTo(map);
    }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Branch hours checking
function checkBranchStatus(branchId) {
    const branchHours = {
        gulshan: { open: 8, close: 22 },
        banani: { open: 8, close: 22 },
        chittagong: { open: 9, close: 21 },
        sylhet: { open: 9, close: 20 },
        khulna: { open: 9, close: 20 },
        rajshahi: { open: 9, close: 20 }
    };
    
    const hours = branchHours[branchId];
    if (!hours) return 'Unknown';
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= hours.open && currentHour < hours.close) {
        return 'Open Now';
    } else {
        return 'Closed Now';
    }
}