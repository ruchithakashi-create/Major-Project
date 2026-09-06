const express = require('express');
const router = express.Router();
const { registerTherapist, loginTherapist, getMe, loginClient } = require('../controllers/authController');
const { protectTherapist } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, registerTherapist);
router.post('/login', authLimiter, loginTherapist);
router.post('/client-login', authLimiter, loginClient);
router.get('/me', protectTherapist, getMe);

module.exports = router;
