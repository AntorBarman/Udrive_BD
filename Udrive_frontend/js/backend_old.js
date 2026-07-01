require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ROUTES ====================
app.use('/api/payment', paymentRoutes);

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 MVC Structure: Models | Controllers | Routes`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ১. পেমেন্ট ইনিশিয়েলাইজ করা
app.post('/api/init', async (req, res) => {
    const { amount, carName, customerName, customerEmail, bookingId } = req.body;
    
    const data = {
        total_amount: amount,
        currency: 'BDT',
        tran_id: `REF-${Date.now()}`, 
        success_url: `${process.env.ROOT_URL}/api/success`,
        fail_url: `${process.env.ROOT_URL}/api/fail`,
        cancel_url: `${process.env.ROOT_URL}/api/cancel`,
        ipn_url: `${process.env.ROOT_URL}/api/ipn`,
        shipping_method: 'NO',
        product_name: String(carName || 'Car Rental'),
        product_category: 'Service',
        product_profile: 'general',
        cus_name: String(customerName || 'Customer'),
        cus_email: String(customerEmail || 'customer@test.com'),
        cus_add1: 'Dhaka',
        cus_city: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        value_a: String(bookingId) // UUID টিকে স্ট্রিং হিসেবে পাঠানো নিশ্চিত করা হলো
    };

    const sslcz = new SSLCommerzPayment(process.env.STORE_ID, process.env.STORE_PASSWORD, false);
    sslcz.init(data).then(apiResponse => {
        if (apiResponse.GatewayPageURL) {
            res.send({ url: apiResponse.GatewayPageURL });
        } else {
            res.status(500).send({ error: "SSLCommerz initialization failed" });
        }
    }).catch(error => {
        console.error("SSL Error:", error);
        res.status(500).send({ error: "Failed to connect to SSLCommerz" });
    });
});

// ২. পেমেন্ট সফল হলে ডাটাবেস আপডেট এবং রিডাইরেক্ট
app.post('/api/success', async (req, res) => {
    // SSLCommerz থেকে আসা ভ্যালুগুলো সংগ্রহ
    const bookingIdFromSSL = req.body.value_a; 
    const tranId = req.body.tran_id;

    console.log(`🔄 Attempting to update DB... ID: ${bookingIdFromSSL}`);

    try {
        // আপনার টেবিল স্কিমা অনুযায়ী 'booking_id' কলামে আপডেট করা হচ্ছে
        const { data, error } = await supabase
            .from('bookings')
            .update({ 
                status: 'confirmed', 
                transaction_id: String(tranId) 
            })
            .eq('booking_id', bookingIdFromSSL.trim()) // trim() যোগ করা হয়েছে যাতে কোনো স্পেস এরর না হয়
            .select();

        if (error) {
            console.error("❌ Supabase Update Error:", error.message);
            return res.status(500).send("Database update failed: " + error.message);
        }

        if (data && data.length > 0) {
            console.log(`✅ Success! Database Updated for Booking: ${bookingIdFromSSL}`);
        } else {
            console.log(`⚠️ Warning: No row matched booking_id: ${bookingIdFromSSL}`);
        }

        // আপনার ফোল্ডার স্ট্রাকচার অনুযায়ী রিডাইরেক্ট লিঙ্ক
        res.redirect('http://127.0.0.1:5500/Udrive_bangladesh/bookings.html'); 

    } catch (err) {
        console.error("❌ Internal Server Error:", err);
        res.status(500).send("Something went wrong");
    }
});

// ৩. পেমেন্ট ফেইল বা ক্যানসেল হলে
app.post('/api/fail', async (req, res) => {
    console.log("❌ Payment Failed");
    res.send("<h1>Payment Failed!</h1><a href='http://127.0.0.1:5500/Udrive_bangladesh/index.html'>Go Back</a>");
});

app.post('/api/cancel', async (req, res) => {
    console.log("⚠️ Payment Cancelled");
    res.send("<h1>Payment Cancelled!</h1><a href='http://127.0.0.1:5500/Udrive_bangladesh/index.html'>Go Back</a>");
});

// সার্ভার লিসেনিং
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));