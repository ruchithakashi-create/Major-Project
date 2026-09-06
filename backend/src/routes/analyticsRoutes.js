const express = require('express');
const router = express.Router();
const { getTherapistAnalytics } = require('../controllers/analyticsController');
const { protectTherapist } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

router.get('/', protectTherapist, enforceTenantIsolation, getTherapistAnalytics);

module.exports = router;
