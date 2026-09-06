const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  getClientPortalData,
} = require('../controllers/clientController');
const { protectTherapist, protectClient } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Client portal self-service endpoint
router.get('/portal/me', protectClient, getClientPortalData);

// Therapist CRM endpoints
router.get('/', protectTherapist, enforceTenantIsolation, getClients);
router.get('/:id', protectTherapist, enforceTenantIsolation, getClientById);
router.post('/', protectTherapist, enforceTenantIsolation, createClient);
router.put('/:id', protectTherapist, enforceTenantIsolation, updateClient);

module.exports = router;
