const SessionNote = require('../models/SessionNote');
const Client = require('../models/Client');
const entitlementService = require('../services/entitlementService');

/**
 * @route   GET /api/notes
 * @desc    Get all notes for therapist (can filter by client or session)
 * @access  Private (Therapist)
 */
const getNotes = async (req, res, next) => {
  try {
    const { clientId, sessionId, type } = req.query;
    const query = { therapist: req.therapistId };

    if (clientId) query.client = clientId;
    if (sessionId) query.session = sessionId;
    if (type && ['private', 'shared'].includes(type)) query.type = type;

    const notes = await SessionNote.find(query)
      .populate('client', 'name email')
      .populate('session', 'startTime status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notes/:id
 * @desc    Get single note by ID
 * @access  Private (Therapist)
 */
const getNoteById = async (req, res, next) => {
  try {
    const note = await SessionNote.findOne({ _id: req.params.id, therapist: req.therapistId })
      .populate('client', 'name email')
      .populate('session', 'startTime status');

    if (!note) {
      return res.status(404).json({ success: false, message: 'Clinical note not found' });
    }

    res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/notes
 * @desc    Create new clinical note (private or shared, standard or SOAP/DAP)
 * @access  Private (Therapist)
 */
const createNote = async (req, res, next) => {
  try {
    const { clientId, sessionId, title, content, type = 'private', templateType = 'standard', structuredData } = req.body;

    if (!clientId || !content) {
      return res.status(400).json({ success: false, message: 'Client and content are required' });
    }

    // Verify client belongs to this therapist
    const client = await Client.findOne({ _id: clientId, therapist: req.therapistId });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found in your practice' });
    }

    // Entitlement Check: Note template gating (SOAP, DAP require Professional or Enterprise)
    if (templateType && templateType !== 'standard') {
      const templateCheck = await entitlementService.canAccess(req.therapistId, 'use_note_template', {
        templateType,
      });
      if (!templateCheck.allowed) {
        return res.status(403).json({
          success: false,
          entitlementBlocked: true,
          message: templateCheck.reason,
          tier: templateCheck.tier,
        });
      }
    }

    const note = await SessionNote.create({
      therapist: req.therapistId,
      client: clientId,
      session: sessionId || null,
      title: title || (type === 'shared' ? 'Shared Session Summary' : 'Confidential Clinical Note'),
      content,
      type: type === 'shared' ? 'shared' : 'private',
      templateType: templateType || 'standard',
      structuredData: structuredData || {},
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notes/:id
 * @desc    Update clinical note
 * @access  Private (Therapist)
 */
const updateNote = async (req, res, next) => {
  try {
    const { title, content, type, templateType, structuredData } = req.body;

    const note = await SessionNote.findOne({ _id: req.params.id, therapist: req.therapistId });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (templateType && templateType !== 'standard' && templateType !== note.templateType) {
      const templateCheck = await entitlementService.canAccess(req.therapistId, 'use_note_template', {
        templateType,
      });
      if (!templateCheck.allowed) {
        return res.status(403).json({
          success: false,
          entitlementBlocked: true,
          message: templateCheck.reason,
        });
      }
      note.templateType = templateType;
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (type !== undefined && ['private', 'shared'].includes(type)) note.type = type;
    if (structuredData !== undefined) note.structuredData = structuredData;

    await note.save();

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a clinical note
 * @access  Private (Therapist)
 */
const deleteNote = async (req, res, next) => {
  try {
    const note = await SessionNote.findOneAndDelete({ _id: req.params.id, therapist: req.therapistId });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notes/client-view
 * @desc    Strict client-facing route: ONLY returns shared notes.
 *          CRITICAL PRIVACY RULE: Backend query strictly filters `{ type: 'shared' }`
 *          and applies `toClientView()` serializer to guarantee zero leakage.
 * @access  Private (Client Portal)
 */
const getClientSharedNotes = async (req, res, next) => {
  try {
    const notes = await SessionNote.find({
      client: req.client._id,
      therapist: req.therapistId,
      type: 'shared', // MANDATORY HARD FILTER
    })
      .populate('session', 'startTime')
      .sort({ createdAt: -1 });

    const safeNotes = notes.map((note) => note.toClientView());

    res.status(200).json({
      success: true,
      count: safeNotes.length,
      notes: safeNotes,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getClientSharedNotes,
};
