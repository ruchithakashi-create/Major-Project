const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Client email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['female', 'male', 'non-binary', 'prefer-not-to-say', 'other'],
      default: 'prefer-not-to-say',
    },
    status: {
      type: String,
      enum: ['active', 'lead', 'archived', 'inactive'],
      default: 'active',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      }
    ],
    notesSummary: {
      type: String,
      default: '',
    },
    // Intake details submitted during booking
    intakeData: {
      presentingConcern: { type: String, default: '' },
      previousTherapy: { type: Boolean, default: false },
      emergencyContactName: { type: String, default: '' },
      emergencyContactPhone: { type: String, default: '' },
      submittedAt: { type: Date, default: Date.now },
      version: { type: String, default: '1.0' },
    },
    // Auditable consent record
    consent: {
      hasConsented: { type: Boolean, default: false },
      consentTextReference: {
        type: String,
        default: 'Standard Informed Consent & Tele-psychotherapy Privacy Agreement v1.0',
      },
      consentedAt: { type: Date },
      ipAddress: { type: String },
    },
    // For client portal access
    portalAccessToken: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of client per therapist
clientSchema.index({ therapist: 1, email: 1 });

module.exports = mongoose.model('Client', clientSchema);
