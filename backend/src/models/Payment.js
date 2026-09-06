const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    clientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientPackage',
    },
    amount: {
      type: Number,
      required: true, // Gross amount in INR
    },
    currency: {
      type: String,
      default: 'INR',
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    orderId: {
      type: String, // Razorpay order id (order_...)
      required: true,
      index: true,
    },
    paymentId: {
      type: String, // Razorpay payment id (pay_...)
      index: true,
    },
    signature: {
      type: String,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceUrl: {
      type: String,
    },
    paymentMethod: {
      type: String,
      default: 'UPI / NetBanking',
    },
    taxAmount: {
      type: Number, // GST component if applicable
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
