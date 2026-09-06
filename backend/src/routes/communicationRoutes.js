const express = require('express');
const router = express.Router();
const {
  getMessagesForTherapist,
  getMessagesForClient,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/communicationController');
const { protectTherapist, protectClient } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Client portal message route
router.get('/client-messages', protectClient, getMessagesForClient);

// Therapist message and notification routes
router.get('/messages/:clientId', protectTherapist, enforceTenantIsolation, getMessagesForTherapist);
router.get('/notifications', protectTherapist, enforceTenantIsolation, getNotifications);
router.put('/notifications/:id/read', protectTherapist, enforceTenantIsolation, markNotificationRead);
router.put('/notifications/mark-all-read', protectTherapist, enforceTenantIsolation, markAllNotificationsRead);

module.exports = router;
