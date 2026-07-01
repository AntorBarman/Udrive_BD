// Search Page Functionality with Supabase
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};
let allCars = [];
const ITEMS_PER_PAGE = 6;

async function initSearchPage() {
    await loadCars();
    setupSearchEvents();
    applyUrlFilters();
}

async function loadCars() {
    try {
        let query = supabaseClient
            .from(DB_TABLES.CARS)
            .select('*')
            .eq('status', 'approved');
        
        // Apply filters if any
        if (currentFilters.location) {
            query = query.eq('location', currentFilters.location);
        }
        
        if (currentFilters.type) {
            query = query.eq('type', currentFilters.type);
        }
        
        if (currentFilters.maxPrice) {
            query = query.lte('daily_rate', currentFilters.maxPrice);
        }
        
        if (currentFilters.transmission) {
            query = query.eq('transmission', currentFilters.transmission);
        }
        
        const { data: cars, error } = await query;
        
        if (error) throw error;
        
        allCars = cars || [];
        applyFilters();
        
    } catch (error) {
        console.error('Error loading cars:', error);
        showNotification('Failed to load cars', 'error');
    }
}

function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const location = params.get('location');
    const pickupDate = params.get('pickup');
    
    if (location) {
        currentFilters.location = location;
        const locationSelect = document.querySelector('[name="location"]');
        if (locationSelect) locationSelect.value = location;
    }
    
    if (pickupDate) {
        currentFilters.pickupDate = pickupDate;
        const dateInput = document.querySelector('[name="pickupDate"]');
        if (dateInput) dateInput.value = pickupDate;
    }
}

function setupSearchEvents() {
    // Filter buttons
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Sort options
    const sortBySelect = document.getElementById('sortBy');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', sortResults);
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) prevPageBtn.addEventListener('click', goToPrevPage);
    if (nextPageBtn) nextPageBtn.addEventListener('click', goToNextPage);
    
    // Price slider
    const priceSlider = document.querySelector('.price-slider');
    if (priceSlider) {
        priceSlider.addEventListener('input', function() {
            const currentPriceElement = document.getElementById('currentPrice');
            if (currentPriceElement) {
                currentPriceElement.textContent = `৳${this.value}`;
            }
        });
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    currentFilters.search = searchTerm;
    applyFilters();
}

function applyFilters() {
    // Get filter values
    const priceSlider = document.querySelector('.price-slider');
    const price = priceSlider ? parseInt(priceSlider.value) : 10000;
    
    const carTypes = Array.from(document.querySelectorAll('input[name="carType"]:checked'))
        .map(cb => cb.value);
    
    const transmissions = Array.from(document.querySelectorAll('input[name="transmission"]:checked'))
        .map(cb => cb.value);
    
    // Apply filters
    let filteredCars = allCars.filter(car => {
        // Price filter
        if (parseFloat(car.daily_rate) > price) return false;
        
        // Type filter
        if (carTypes.length > 0 && !carTypes.includes(car.type)) return false;
        
        // Transmission filter
        if (transmissions.length > 0 && !transmissions.includes(car.transmission)) return false;
        
        // Search filter
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            return car.name.toLowerCase().includes(searchLower) ||
                   car.type.toLowerCase().includes(searchLower) ||
                   (car.location && car.location.toLowerCase().includes(searchLower));
        }
        
        return true;
    });
    
    // Sort results
    sortCars(filteredCars);
    
    // Display results
    displayResults(filteredCars);
}

function resetFilters() {
    // Reset all filters
    const priceSlider = document.querySelector('.price-slider');
    if (priceSlider) {
        priceSlider.value = 10000;
        const currentPriceElement = document.getElementById('currentPrice');
        if (currentPriceElement) currentPriceElement.textContent = '৳10000';
    }
    
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    const sortBySelect = document.getElementById('sortBy');
    if (sortBySelect) sortBySelect.value = 'price-low';
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    currentFilters = {};
    currentPage = 1;
    applyFilters();
}

function sortResults() {
    const sortBy = document.getElementById('sortBy').value;
    let sortedCars = [...allCars];
    
    sortCars(sortedCars);
    displayResults(sortedCars);
}

function sortCars(cars) {
    const sortBySelect = document.getElementById('sortBy');
    const sortBy = sortBySelect ? sortBySelect.value : 'price-low';
    
    switch(sortBy) {
        case 'price-low':
            cars.sort((a, b) => parseFloat(a.daily_rate) - parseFloat(b.daily_rate));
            break;
        case 'price-high':
            cars.sort((a, b) => parseFloat(b.daily_rate) - parseFloat(a.daily_rate));
            break;
        case 'rating':
            cars.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'name':
            cars.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    return cars;
}

function displayResults(cars) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageCars = cars.slice(startIndex, endIndex);
    
    totalPages = Math.ceil(cars.length / ITEMS_PER_PAGE);
    
    if (pageCars.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                <i class="fas fa-car" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No cars found</h3>
                <p>Try adjusting your filters</p>
                <button onclick="resetFilters()" class="btn btn-primary" style="margin-top: 1rem;">Reset Filters</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pageCars.map(car => `
        <div class="car-card-search">
            <div class="car-image-search">
                <img src="${car.images?.[0] || 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop'}" alt="${car.name}">
            </div>
            <div class="car-details-search">
                <h3>${car.name}</h3>
                <div class="car-meta">
                    <span><i class="fas fa-user-friends"></i> ${car.seats} seats</span>
                    <span><i class="fas fa-cog"></i> ${car.transmission}</span>
                    <span><i class="fas fa-gas-pump"></i> ${car.fuel_type}</span>
                </div>
                <div class="car-rating">
                    <i class="fas fa-star"></i> ${car.rating || '4.5'}
                </div>
                <div class="car-location">
                    <i class="fas fa-map-marker-alt"></i> ${car.location || 'Dhaka'}
                </div>
                <div class="car-footer">
                    <div class="car-price-search">৳${parseFloat(car.daily_rate).toFixed(0)}/day</div>
                    <a href="car-details.html?id=${car.id}" class="btn btn-primary">Book Now</a>
                </div>
            </div>
        </div>
    `).join('');
    
    // Update pagination info
    const currentPageElement = document.getElementById('currentPage');
    const totalPagesElement = document.getElementById('totalPages');
    const resultsCountElement = document.getElementById('resultsCount');
    
    if (currentPageElement) currentPageElement.textContent = currentPage;
    if (totalPagesElement) totalPagesElement.textContent = totalPages;
    if (resultsCountElement) resultsCountElement.textContent = `${cars.length} cars found`;
    
    // Update pagination buttons
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Debounce helper function
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

// js/search.js

// ফর্মে সাবমিট করলে এই ফাংশন কল হবে
document.getElementById('search-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    
    // API কল করা হচ্ছে
    const response = await fetch(`/api/cars/search?start_date=${startDate}&end_date=${endDate}`);
    const result = await response.json();
    
    const carContainer = document.getElementById('car-results-container');
    carContainer.innerHTML = ''; 

    if (result.success) {
        result.data.forEach(car => {
            // কার্ডের ডিজাইন
            const isAvailable = car.is_available;
            
            const card = `
                <div class="border rounded-lg p-4 shadow relative ${!isAvailable ? 'opacity-70' : ''}">
                    ${!isAvailable ? '<div class="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">NOT AVAILABLE</div>' : ''}
                    
                    <h3 class="text-xl font-bold">${car.brand} ${car.model}</h3>
                    <p class="text-gray-600">Price: ৳${car.daily_price} / day</p>
                    
                    <button class="mt-4 w-full py-2 rounded text-white font-bold transition 
                        ${isAvailable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}" 
                        ${!isAvailable ? 'disabled' : `onclick="window.location.href='/book?car_id=${car.car_id}'"`}>
                        ${isAvailable ? 'Proceed to Book' : 'Already Booked for these dates'}
                    </button>
                </div>
            `;
            carContainer.insertAdjacentHTML('beforeend', card);
        });
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSearchPage);