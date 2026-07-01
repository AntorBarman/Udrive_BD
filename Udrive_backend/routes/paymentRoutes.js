const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/init', paymentController.initializePayment);

router.post('/success', paymentController.paymentSuccess);

router.post('/fail', paymentController.paymentFail);

router.post('/cancel', paymentController.paymentCancel);

router.post('/ipn', paymentController.paymentIPN);

module.exports = router;
