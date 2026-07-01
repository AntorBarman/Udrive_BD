// controllers/carController.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ── Helper: Bangladesh local time এ "YYYY-MM-DDTHH:mm" format ──
function getBDNow() {
    const utcDate = new Date();
    // UTC+6 = Bangladesh time
    const bdDate  = new Date(utcDate.getTime() + (6 * 60 * 60 * 1000));
    return bdDate.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

// ==========================================
// API 1: Live Fleet Dashboard
// ==========================================
exports.getLiveFleetStatus = async (req, res) => {
    try {
        const now = getBDNow();
        console.log("🕐 BD Time for live fleet:", now);

        // সব approved গাড়ি আনো
        const { data: fleetCars, error: carError } = await supabase
            .from('cars')
            .select('id, name, make, model, location, status');

        if (carError) throw carError;

        // এই মুহূর্তে চলমান confirmed bookings আনো
        const { data: activeBookings, error: bookingError } = await supabase
            .from('bookings')
            .select('car_id, return_date, pickup_date')
            .eq('status', 'confirmed')
            .lte('pickup_date', now)   // trip শুরু হয়ে গেছে
            .gte('return_date', now);  // trip এখনো শেষ হয়নি

        if (bookingError) throw bookingError;

        console.log(`📋 Active trips found: ${(activeBookings || []).length}`);

        // car_id → booking mapping
        const activeBookingMap = {};
        (activeBookings || []).forEach(booking => {
            activeBookingMap[String(booking.car_id)] = booking;
        });

        // প্রতিটি গাড়ির live status নির্ধারণ
        const liveDashboardData = fleetCars.map(car => {
            const activeTrip = activeBookingMap[String(car.id)];

            const carData = {
                ...car,
                car_id:            car.id,
                brand:             car.make,
                current_branch_id: car.location
            };

            const statusLower = (car.status || '').toLowerCase();

            if (statusLower === 'maintenance') {
                return { ...carData, live_status: 'Maintenance', expected_return: 'N/A' };
            }
            else if (activeTrip) {
                return {
                    ...carData,
                    live_status:     'On Trip',
                    expected_return: activeTrip.return_date
                };
            }
            else {
                return { ...carData, live_status: 'Available', expected_return: 'Now' };
            }
        });

        console.log(`✅ Fleet status: ${liveDashboardData.filter(c=>c.live_status==='Available').length} available, ${liveDashboardData.filter(c=>c.live_status==='On Trip').length} on trip`);

        res.status(200).json({ success: true, data: liveDashboardData });

    } catch (error) {
        console.error("Live Status Error:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ==========================================
// API 2: তারিখ অনুযায়ী গাড়ি সার্চ (Overlap Check)
// ==========================================
exports.searchAvailableCars = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "start_date এবং end_date আবশ্যক।"
            });
        }

        console.log(`🔍 Searching cars: ${start_date} → ${end_date}`);

        // সব approved গাড়ি আনো
        const { data: allCars, error: carErr } = await supabase
            .from('cars')
            .select('*')
            .eq('status', 'approved');

        if (carErr) throw carErr;

        // Overlap logic: যেসব confirmed booking এই date range এর সাথে overlap করে
        // Booking overlap condition:
        //   booking.pickup_date <= requested end_date
        //   AND booking.return_date >= requested start_date
        const { data: bookedCars, error: bookErr } = await supabase
            .from('bookings')
            .select('car_id')
            .eq('status', 'confirmed')
            .lte('pickup_date', end_date)   // booking শুরু হয় requested end এর আগে
            .gte('return_date', start_date); // booking শেষ হয় requested start এর পরে

        if (bookErr) throw bookErr;

        console.log(`🚫 Booked cars in range: ${(bookedCars || []).length}`);

        const bookedCarIds = new Set(
            (bookedCars || []).map(b => String(b.car_id))
        );

        // প্রতিটি গাড়ির availability নির্ধারণ
        const result = (allCars || []).map(car => ({
            ...car,
            car_id:       car.id,
            brand:        car.make,
            is_available: !bookedCarIds.has(String(car.id))
        }));

        const availableCount = result.filter(c => c.is_available).length;
        console.log(`✅ Available: ${availableCount} / ${result.length}`);

        res.status(200).json({ success: true, data: result });

    } catch (error) {
        console.error("Search Error:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};