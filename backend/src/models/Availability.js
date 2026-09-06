const mongoose = require('mongoose');

const weeklySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String, // e.g. "09:00" (24h)
      required: true,
    },
    endTime: {
      type: String, // e.g. "17:00" (24h)
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const dateOverrideSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      default: 'Blocked slot / Holiday',
    },
    customSlots: [
      {
        startTime: String,
        endTime: String,
      }
    ],
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      unique: true,
      index: true,
    },
    weeklySchedule: [weeklySlotSchema],
    slotDurationMinutes: {
      type: Number,
      enum: [30, 45, 50, 60, 90],
      default: 50,
    },
    bufferMinutes: {
      type: Number,
      default: 10,
    },
    advanceNoticeHours: {
      type: Number,
      default: 4,
    },
    bookingHorizonDays: {
      type: Number,
      default: 30,
    },
    dateOverrides: [dateOverrideSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Availability', availabilitySchema);
