// routes/carRoutes.js
const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');

// লাইভ ড্যাশবোর্ডের API
router.get('/live-status', carController.getLiveFleetStatus);

// গাড়ি সার্চ করার API
router.get('/search', carController.searchAvailableCars);

module.exports = router;