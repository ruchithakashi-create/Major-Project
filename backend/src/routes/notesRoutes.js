const express = require('express');
const router = express.Router();
const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getClientSharedNotes,
} = require('../controllers/notesController');
const { protectTherapist, protectClient } = require('../middleware/authMiddleware');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Client portal route - strictly scoped to shared notes only
router.get('/client-view', protectClient, getClientSharedNotes);

// Therapist routes - full notes management
router.get('/', protectTherapist, enforceTenantIsolation, getNotes);
router.get('/:id', protectTherapist, enforceTenantIsolation, getNoteById);
router.post('/', protectTherapist, enforceTenantIsolation, createNote);
router.put('/:id', protectTherapist, enforceTenantIsolation, updateNote);
router.delete('/:id', protectTherapist, enforceTenantIsolation, deleteNote);

module.exports = router;
