const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      index: true,
    },
    action: {
      type: String, // e.g., 'CONSENT_SIGNED', 'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_VIEWED', 'PAYMENT_RECEIVED', 'REFUND_ISSUED'
      required: true,
      index: true,
    },
    performedBy: {
      id: mongoose.Schema.Types.ObjectId,
      role: { type: String, enum: ['therapist', 'client', 'system', 'admin'] },
    },
    targetResource: {
      resourceType: { type: String, enum: ['Client', 'Session', 'SessionNote', 'Payment', 'Package', 'Therapist'] },
      resourceId: mongoose.Schema.Types.ObjectId,
    },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
