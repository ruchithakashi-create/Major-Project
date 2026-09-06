const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getPayments,
  downloadInvoice,
  getPackages,
  createPackage,
  deletePackage,
} = require('../controllers/paymentController');
const { protectTherapist, protectClient } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Public checkout routes
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.post('/webhook', handleRazorpayWebhook);

// Invoice download (accessible by therapist or client)
router.get('/:id/invoice', async (req, res, next) => {
  // Try therapist auth first, then client auth
  try {
    if (req.headers.authorization) {
      const jwt = require('jsonwebtoken');
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unfazed_dev_secret');
      if (decoded.role === 'therapist') {
        req.therapistId = decoded.id;
      } else if (decoded.role === 'client') {
        req.client = { _id: decoded.clientId };
      }
    }
  } catch (err) {
    // Ignored, proceed to controller authorization check
  }
  downloadInvoice(req, res, next);
});

// Private therapist financial routes
router.get('/', protectTherapist, enforceTenantIsolation, getPayments);
router.get('/packages', protectTherapist, enforceTenantIsolation, getPackages);
router.post('/packages', protectTherapist, enforceTenantIsolation, createPackage);
router.delete('/packages/:id', protectTherapist, enforceTenantIsolation, deletePackage);

module.exports = router;
