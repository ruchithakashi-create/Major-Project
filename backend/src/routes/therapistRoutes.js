const express = require('express');
const router = express.Router();
const { getPublicProfile, checkSlugAvailability, updateProfile } = require('../controllers/therapistController');
const { protectTherapist } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

router.get('/public/:slug', getPublicProfile);
router.get('/check-slug/:slug', checkSlugAvailability);
router.put('/profile', protectTherapist, enforceTenantIsolation, updateProfile);

module.exports = router;
