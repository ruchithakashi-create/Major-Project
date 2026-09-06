const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema(
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
      required: false,
      index: true,
    },
    title: {
      type: String,
      default: 'Session Notes',
    },
    content: {
      type: String, // Rich text HTML / JSON from TipTap
      required: true,
    },
    type: {
      type: String,
      enum: ['private', 'shared'],
      default: 'private',
      required: true,
      index: true,
    },
    templateType: {
      type: String,
      enum: ['standard', 'soap', 'dap', 'custom'],
      default: 'standard',
    },
    // Structured clinical sections for SOAP/DAP if utilized
    structuredData: {
      subjective: { type: String, default: '' },
      objective: { type: String, default: '' },
      assessment: { type: String, default: '' },
      plan: { type: String, default: '' },
      data: { type: String, default: '' },
      response: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Method to ensure safe client serialization (throws error if called on private note)
sessionNoteSchema.methods.toClientView = function () {
  if (this.type === 'private') {
    throw new Error('SECURITY VIOLATION: Attempted to serialize a private clinical note for client view');
  }
  return {
    _id: this._id,
    session: this.session,
    title: this.title,
    content: this.content,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('SessionNote', sessionNoteSchema);
