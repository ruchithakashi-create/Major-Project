const express = require('express');
const router = express.Router();
const {
  getTiers,
  getCurrentSubscription,
  changeSubscriptionTier,
  checkEntitlement,
} = require('../controllers/subscriptionController');
const { protectTherapist } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Public tier pricing list
router.get('/tiers', getTiers);

// Private therapist subscription management
router.get('/current', protectTherapist, enforceTenantIsolation, getCurrentSubscription);
router.post('/upgrade', protectTherapist, enforceTenantIsolation, changeSubscriptionTier);
router.get('/check-entitlement/:featureKey', protectTherapist, enforceTenantIsolation, checkEntitlement);

module.exports = router;
