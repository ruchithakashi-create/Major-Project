const express = require('express');
const router = express.Router();
const {
  getPublicSlots,
  bookSessionPublic,
  getTherapistSessions,
  updateSessionStatus,
  getAvailability,
  updateAvailability,
} = require('../controllers/schedulingController');
const { protectTherapist } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Public booking routes
router.get('/public/:slug/slots', getPublicSlots);
router.post('/public/:slug/book', bookSessionPublic);

// Private therapist scheduling routes
router.get('/sessions', protectTherapist, enforceTenantIsolation, getTherapistSessions);
router.put('/sessions/:id/status', protectTherapist, enforceTenantIsolation, updateSessionStatus);
router.get('/availability', protectTherapist, enforceTenantIsolation, getAvailability);
router.put('/availability', protectTherapist, enforceTenantIsolation, updateAvailability);

module.exports = router;
