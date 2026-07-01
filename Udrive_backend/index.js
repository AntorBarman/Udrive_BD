require('dotenv').config();
const express = require('express');
const cors = require('cors');

// ======================== Startup Check ========================
console.log('🔍 Environment Variables Check:');
console.log('   PORT:', process.env.PORT || 5000);
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Found' : '❌ MISSING');
console.log('   SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Found' : '❌ MISSING');
console.log('   STORE_ID:', process.env.STORE_ID ? '✅ Found' : '❌ MISSING');
console.log('   STORE_PASSWORD:', process.env.STORE_PASSWORD ? '✅ Found' : '❌ MISSING');
console.log('   ROOT_URL:', process.env.ROOT_URL || '❌ MISSING');

// ======================== Routes Import ========================
let paymentRoutes;
try {
    paymentRoutes = require('./routes/paymentRoutes');
    console.log('✅ paymentRoutes loaded');
} catch (err) {
    console.error('❌ paymentRoutes load failed:', err.message);
    process.exit(1);
}

const app = express();

// ======================== Middleware ========================
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================== Request Logger ========================
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

// ======================== Routes ========================
app.use('/api/payment', paymentRoutes);



const carRoutes = require('./routes/carRoutes');


app.use('/api/cars', carRoutes);

// ======================== Health Check ========================
app.get('/api/health', (req, res) => {
    res.json({
        status: '✅ Server running',
        port: process.env.PORT || 5000,
        supabase: process.env.SUPABASE_URL ? 'connected' : 'missing',
        sslcommerz: process.env.STORE_ID ? 'configured' : 'missing',
        time: new Date().toISOString()
    });
});

// ======================== Error Handler ========================
app.use((err, req, res, next) => {
    console.error('❌ Express Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
});

// ======================== Server Start ========================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port: ${PORT}`);
    console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
    console.log(`💳 Payment: http://localhost:${PORT}/api/payment/init`);
    console.log(`\n⏳ Waiting for requests...\n`);
});

// ======================== Keep Alive ========================
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// ======================== Global Error Handlers ========================
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error(err.stack);
  
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('   Reason:', reason);
   
});

process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.log(`   Try: netstat -ano | findstr :${PORT}`);
        console.log(`   Then kill that process`);
    } else {
        console.error('❌ Server error:', err);
    }
});

module.exports = app;