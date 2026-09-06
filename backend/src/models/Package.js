const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sessionCount: {
      type: Number,
      enum: [3, 6, 12],
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    perSessionPrice: {
      type: Number,
      required: true,
    },
    validityDays: {
      type: Number,
      default: 90,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);
