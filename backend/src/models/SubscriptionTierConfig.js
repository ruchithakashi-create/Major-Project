const mongoose = require('mongoose');

const subscriptionTierConfigSchema = new mongoose.Schema(
  {
    tierKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    priceMonthly: {
      type: Number,
      required: true,
    },
    priceAnnually: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    caps: {
      activeClients: { type: Number, default: 10 },
      monthlyBookings: { type: Number, default: 30 },
      packagesCount: { type: Number, default: 1 },
    },
    features: {
      noteTemplates: [{ type: String }],
      analyticsDepth: { type: String, enum: ['basic', 'advanced'], default: 'basic' },
      customBranding: { type: Boolean, default: false },
      chatEnabled: { type: Boolean, default: true },
      chatAttachments: { type: Boolean, default: false },
      automatedReminders: { type: Boolean, default: false },
      gstInvoicing: { type: Boolean, default: true },
      publicBookingPage: { type: Boolean, default: true },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionTierConfig', subscriptionTierConfigSchema);
