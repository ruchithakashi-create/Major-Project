const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
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
    senderType: {
      type: String,
      enum: ['therapist', 'client'],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    attachments: [
      {
        url: String,
        fileName: String,
        fileType: String,
        fileSize: Number,
      }
    ],
  },
  { timestamps: true }
);

// Compound index for querying conversations
messageSchema.index({ therapist: 1, client: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
