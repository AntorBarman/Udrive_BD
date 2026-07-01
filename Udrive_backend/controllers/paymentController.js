const SSLCommerzPayment = require('sslcommerz-lts');
const { createClient } = require('@supabase/supabase-js');
const { generateTransactionId } = require('../utils/helpers');

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ১. পেমেন্ট initialize
const initializePayment = async (req, res) => {
    try {
        const {
            amount,
            user_id,
            description,
            carName,
            customerName,
            customerEmail,
            bookingId
        } = req.body;

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: amount'
            });
        }

        const isWalletPayment = !!user_id && !bookingId;
        const isBookingPayment = !!bookingId;

        if (!isWalletPayment && !isBookingPayment) {
            return res.status(400).json({
                success: false,
                message: 'Either user_id or bookingId is required'
            });
        }

        const tran_id = generateTransactionId();

        let paymentData = {
            total_amount: amount,
            currency: 'BDT',
            tran_id: tran_id,
            success_url: `${process.env.ROOT_URL}/api/payment/success`,
            fail_url: `${process.env.ROOT_URL}/api/payment/fail`,
            cancel_url: `${process.env.ROOT_URL}/api/payment/cancel`,
            ipn_url: `${process.env.ROOT_URL}/api/payment/ipn`,
            shipping_method: 'NO',
            product_name: String(description || carName || 'Payment'),
            product_category: 'Service',
            product_profile: 'general',
            cus_name: String(customerName || 'Customer'),
            cus_email: String(customerEmail || 'customer@test.com'),
            cus_add1: 'Dhaka',
            cus_city: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: '01711111111',
            value_a: isBookingPayment ? String(bookingId) : String(user_id),
            value_b: isBookingPayment ? 'booking' : 'wallet',
            value_c: String(description || 'Payment')
        };

        const sslcz = new SSLCommerzPayment(
            process.env.STORE_ID,
            process.env.STORE_PASSWORD,
            false // false = sandbox
        );

        const apiResponse = await sslcz.init(paymentData);

        if (apiResponse.GatewayPageURL) {
            console.log(`✅ Payment URL generated | Type: ${paymentData.value_b} | ID: ${paymentData.value_a}`);
            return res.json({
                success: true,
                gateway_url: apiResponse.GatewayPageURL,
                tran_id: tran_id
            });
        } else {
            console.error('SSLCommerz response:', apiResponse);
            return res.status(500).json({
                success: false,
                message: 'SSLCommerz initialization failed'
            });
        }

    } catch (error) {
        console.error('Payment init error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ২. পেমেন্ট সফল
const paymentSuccess = async (req, res) => {
    try {
        const idFromSSL = req.body.value_a;
        const paymentType = req.body.value_b;
        const tranId = req.body.tran_id;
        const amount = parseFloat(req.body.amount || req.body.total_amount || 0);

        console.log(`\n✅ Payment Success!`);
        console.log(`   Type: ${paymentType}`);
        console.log(`   ID: ${idFromSSL}`);
        console.log(`   Tran ID: ${tranId}`);
        console.log(`   Amount: ৳${amount}`);

        // ===== WALLET TOP-UP =====
        if (paymentType === 'wallet') {

            const { error } = await supabase
                .from('wallet_transactions')
                .insert([{
                    user_id: String(idFromSSL),
                    amount: amount,
                    type: 'credit',
                    description: req.body.value_c || 'Wallet Top-up via SSLCommerz',
                    transaction_id: String(tranId)
                }]);

            if (error) {
                console.error('❌ Wallet insert error:', error.message);
                return res.status(500).send(`
                    <h2>Wallet update failed!</h2>
                    <p>${error.message}</p>
                    <a href="http://127.0.0.1:5500/Udrive_bangladesh/earner-portal.html">Go back</a>
                `);
            }

            console.log(`💰 Wallet topped up! User: ${idFromSSL}, Amount: ৳${amount}`);
            return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/earner-portal.html?section=wallet&success=true');
        }

        // ===== BOOKING PAYMENT =====
        if (paymentType === 'booking') {

            // ধাপ ১: Booking confirm করা
            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .update({
                    status: 'confirmed',
                    transaction_id: String(tranId)
                })
                .eq('booking_id', String(idFromSSL).trim())  // ✅ uuid match
                .select('*')
                .single();

            if (bookingError) {
                console.error('❌ Booking update error:', bookingError.message);
                console.error('   Tried booking_id:', idFromSSL);
            }

            return handleBookingWallet(res, bookingData, tranId, amount, idFromSSL);
        }

        return res.status(400).send('<h2>Invalid payment type!</h2>');

    } catch (error) {
        console.error('❌ Payment success handler error:', error);
        return res.status(500).send(`<h2>Error: ${error.message}</h2>`);
    }
};

// ===== Booking Wallet Helper =====
// ===== Platform Commission Config =====
const PLATFORM_COMMISSION_PERCENT = 15; // ১৫% প্ল্যাটফর্ম নেবে
const PLATFORM_WALLET_USER_ID = process.env.PLATFORM_USER_ID; // .env এ রাখো

async function handleBookingWallet(res, bookingData, tranId, amount, bookingId) {
    try {
        const finalAmount = parseFloat(bookingData?.total_price || amount);

        // ✅ Commission calculation
        const platformCut = parseFloat((finalAmount * PLATFORM_COMMISSION_PERCENT / 100).toFixed(2));
        const earnerAmount = parseFloat((finalAmount - platformCut).toFixed(2));

        console.log(`\n💰 Commission Breakdown:`);
        console.log(`   Total Amount   : ৳${finalAmount}`);
        console.log(`   Platform (${PLATFORM_COMMISSION_PERCENT}%): ৳${platformCut}`);
        console.log(`   Earner (${100 - PLATFORM_COMMISSION_PERCENT}%) : ৳${earnerAmount}`);

        console.log(`✅ Booking confirmed: ${bookingData?.booking_id || bookingId}`);

        const shortBookingId = String(bookingId).substring(0, 8);

        if (!bookingData?.car_id) {
            console.warn('⚠️ car_id not found in booking!');
            return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/bookings.html?success=true');
        }

        const carIdStr = String(bookingData.car_id).trim();
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(carIdStr);

        if (!isValidUUID) {
            console.warn(`⚠️ Static car detected. Skipping wallet split.`);
            // Static গাড়ির জন্য শুধু platform এ পুরো টাকা যাবে
            if (PLATFORM_WALLET_USER_ID) {
                await supabase.from('wallet_transactions').insert([{
                    user_id: String(PLATFORM_WALLET_USER_ID),
                    amount: finalAmount,
                    type: 'credit',
                    description: `Platform revenue - Static car (#${shortBookingId})`,
                    transaction_id: String(tranId),
                    booking_id: String(bookingId)
                }]);
            }
            return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/bookings.html?success=true');
        }

        // ধাপ ১: Car owner খোঁজা
        const { data: carData, error: carError } = await supabase
            .from('cars')
            .select('user_id, name, make, model')
            .eq('id', carIdStr)
            .maybeSingle();

        if (carError) console.error('❌ Car lookup error:', carError.message);

        if (!carData || !carData.user_id) {
            console.warn('⚠️ Car owner not found!');
            return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/bookings.html?success=true');
        }

        const carName = carData.name || `${carData.make} ${carData.model}`;

        // ধাপ ২: Earner এর wallet এ কাটছাঁট করা টাকা দেওয়া
        const { error: earnerWalletError } = await supabase
            .from('wallet_transactions')
            .insert([{
                user_id: String(carData.user_id),
                amount: earnerAmount,           // ✅ পুরো টাকা নয়, কাটার পর
                type: 'credit',
                description: `Booking payment (after ${PLATFORM_COMMISSION_PERCENT}% platform fee) - ${carName} (#${shortBookingId})`,
                transaction_id: String(tranId),
                booking_id: String(bookingId)
            }]);

        if (earnerWalletError) {
            console.error('❌ Earner wallet error:', earnerWalletError.message);
        } else {
            console.log(`✅ Earner received: ৳${earnerAmount}`);
        }

        // ধাপ ৩: Platform এর wallet এ commission জমা
        if (PLATFORM_WALLET_USER_ID) {
            const { error: platformWalletError } = await supabase
                .from('wallet_transactions')
                .insert([{
                    user_id: String(PLATFORM_WALLET_USER_ID),
                    amount: platformCut,
                    type: 'credit',
                    description: `Platform commission (${PLATFORM_COMMISSION_PERCENT}%) - ${carName} (#${shortBookingId})`,
                    transaction_id: String(tranId),
                    booking_id: String(bookingId)
                }]);

            if (platformWalletError) {
                console.error('❌ Platform wallet error:', platformWalletError.message);
            } else {
                console.log(`✅ Platform received: ৳${platformCut}`);
            }
        } else {
            console.warn('⚠️ PLATFORM_USER_ID not set in .env — commission not recorded!');
        }

        // ধাপ ৪: Renter এর debit record
        const renterId = bookingData.user_id;
        if (renterId) {
            const { error: renterError } = await supabase
                .from('wallet_transactions')
                .insert([{
                    user_id: String(renterId),
                    amount: finalAmount,
                    type: 'debit',
                    description: `Car booking payment - ${carName} (#${shortBookingId})`,
                    transaction_id: String(tranId),
                    booking_id: String(bookingId)
                }]);

            if (renterError) {
                console.error('❌ Renter debit error:', renterError.message);
            } else {
                console.log(`💸 Renter debited: ৳${finalAmount}`);
            }
        }

        console.log(`\n📊 Final Summary:`);
        console.log(`   Renter paid  : ৳${finalAmount}`);
        console.log(`   Earner got   : ৳${earnerAmount}`);
        console.log(`   Platform got : ৳${platformCut}`);

        return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/bookings.html?success=true');

    } catch (err) {
        console.error('❌ handleBookingWallet error:', err);
        return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/bookings.html?success=true');
    }
}

// ৩. পেমেন্ট fail
const paymentFail = async (req, res) => {
    console.log('❌ Payment failed:', req.body);
    return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/reservation.html?payment=failed');
};

// ৪. পেমেন্ট cancel
const paymentCancel = async (req, res) => {
    console.log('⚠️ Payment cancelled:', req.body);
    return res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/reservation.html?payment=cancelled');
};

// ৫. IPN
const paymentIPN = async (req, res) => {
    console.log('📨 IPN received:', req.body);
    return res.json({ success: true });
};

module.exports = {
    initializePayment,
    paymentSuccess,
    paymentFail,
    paymentCancel,
    paymentIPN
};