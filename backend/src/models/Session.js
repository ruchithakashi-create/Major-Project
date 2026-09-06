const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'confirmed',
      index: true,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    cancelledBy: {
      type: String,
      enum: ['therapist', 'client', null],
      default: null,
    },
    meetingLink: {
      type: String,
      default: 'https://meet.jit.si/unfazed-session-',
    },
    clientTimezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    sessionMode: {
      type: String,
      enum: ['online', 'in-person'],
      default: 'online',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'package_credit'],
      default: 'unpaid',
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    packageUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientPackage',
    },
    price: {
      type: Number,
      default: 1500,
    },
  },
  { timestamps: true }
);

// Prevent double booking at the database level using compound unique index on therapist and active startTime
sessionSchema.index(
  { therapist: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

module.exports = mongoose.model('Session', sessionSchema);
