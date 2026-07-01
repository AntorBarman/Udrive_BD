// js/liveDashboard.js

async function fetchLiveFleetData() {
    try {
        // js/liveDashboard.js
        // লিংকের শুরুতে http://localhost:5000 যুক্ত করুন
        const response = await fetch('http://localhost:5000/api/cars/live-status');
        const result = await response.json();

        if (result.success) {
            const tableBody = document.getElementById('live-table-body');
            tableBody.innerHTML = ''; // আগের ডেটা ক্লিয়ার করা

            result.data.forEach(car => {
                let statusHtml = '';
                let actionHtml = '';
                let timeHtml = car.expected_return === 'Now' ? 'Ready in Branch' : new Date(car.expected_return).toLocaleString();

                if (car.live_status === 'Available') {
                    statusHtml = '<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm">🟢 Available</span>';
                    actionHtml = `<a href="car-details.html?car_id=${car.car_id}" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Book Now</a>`;
                }
                else if (car.live_status === 'On Trip') {
                    statusHtml = '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-sm">🔴 On Trip</span>';
                    actionHtml = `<button class="bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed" disabled>Wait</button>`;
                }
                else {
                    statusHtml = '<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-sm">🟡 Maintenance</span>';
                    actionHtml = `<button class="bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed" disabled>Unavailable</button>`;
                }

                const row = `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="py-4 px-4 font-semibold text-gray-800">${car.brand} ${car.model}</td>
                        <td class="py-4 px-4">${statusHtml}</td>
                        <td class="py-4 px-4 text-gray-600">${timeHtml}</td>
                        <td class="py-4 px-4">${actionHtml}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        }
    } catch (error) {
        console.error("Failed to load dashboard:", error);
    }
}

// পেজ লোড হলে একবার ডেটা আনবে
fetchLiveFleetData();

// ম্যাজিক: প্রতি 30 সেকেন্ড পর পর অটো রিফ্রেশ হবে (পেজ রিলোড ছাড়া)
setInterval(fetchLiveFleetData, 30000);