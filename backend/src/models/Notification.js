const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    type: {
      type: String,
      enum: ['booking_confirmed', 'session_reminder_24h', 'payment_success', 'payment_failed', 'session_completed', 'message_received', 'tier_limit_reached'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    channel: {
      type: String,
      enum: ['in_app', 'email_stub', 'whatsapp_stub'],
      default: 'in_app',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
