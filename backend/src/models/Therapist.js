const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const therapistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Therapist name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    slug: {
      type: String,
      required: [true, 'Unique slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      default: '',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: 'Licensed Clinical Psychologist',
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      }
    ],
    experienceYears: {
      type: Number,
      default: 5,
    },
    sessionPrice: {
      type: Number,
      default: 1500, // INR
    },
    specializations: [
      {
        type: String,
        trim: true,
      }
    ],
    languages: [
      {
        type: String,
        trim: true,
      }
    ],
    location: {
      city: { type: String, default: 'Bengaluru' },
      state: { type: String, default: 'Karnataka' },
      country: { type: String, default: 'India' },
      mode: { type: String, enum: ['online', 'in-person', 'hybrid'], default: 'online' },
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    cancellationPolicy: {
      type: String,
      default: 'Free cancellation up to 24 hours before the session. Within 24 hours, 50% fee applies.',
    },
    registrationNumber: {
      type: String,
      default: 'RCI-CRR/2022/49102',
    },
    subscriptionTier: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      default: 'starter',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'cancelled'],
      default: 'active',
    },
    role: {
      type: String,
      enum: ['therapist', 'admin'],
      default: 'therapist',
    },
  },
  { timestamps: true }
);

// Method to verify password
therapistSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Safe JSON serialization excluding password hash
therapistSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Therapist', therapistSchema);
