const Client = require('../models/Client');
const Session = require('../models/Session');
const SessionNote = require('../models/SessionNote');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const entitlementService = require('../services/entitlementService');

/**
 * @route   GET /api/clients
 * @desc    Get all clients for the authenticated therapist (with search, filter, sort, pagination)
 * @access  Private (Therapist)
 */
const getClients = async (req, res, next) => {
  try {
    const { search, status, tag, sortBy = 'createdAt', order = 'desc', page = 1, limit = 50 } = req.query;

    const query = { therapist: req.therapistId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Client.countDocuments(query);
    const clients = await Client.find(query).sort(sortOptions).skip(skip).limit(parseInt(limit));

    // Aggregate last session info for each client
    const clientIds = clients.map((c) => c._id);
    const lastSessions = await Session.aggregate([
      { $match: { client: { $in: clientIds }, status: { $in: ['confirmed', 'completed'] } } },
      { $sort: { startTime: -1 } },
      { $group: { _id: '$client', lastSessionDate: { $first: '$startTime' }, totalSessions: { $sum: 1 } } },
    ]);

    const sessionMap = {};
    lastSessions.forEach((item) => {
      sessionMap[item._id.toString()] = item;
    });

    const enrichedClients = clients.map((client) => {
      const sess = sessionMap[client._id.toString()];
      return {
        ...client.toObject(),
        lastSessionDate: sess ? sess.lastSessionDate : null,
        totalSessions: sess ? sess.totalSessions : 0,
      };
    });

    res.status(200).json({
      success: true,
      count: clients.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      clients: enrichedClients,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/clients/:id
 * @desc    Get detailed client profile (intake, consent, sessions, payments, notes)
 * @access  Private (Therapist)
 */
const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, therapist: req.therapistId });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found in your practice' });
    }

    // Aggregate client history
    const sessions = await Session.find({ client: client._id, therapist: req.therapistId }).sort({ startTime: -1 });
    const notes = await SessionNote.find({ client: client._id, therapist: req.therapistId }).sort({ createdAt: -1 });
    const payments = await Payment.find({ client: client._id, therapist: req.therapistId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      client,
      sessions,
      notes,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/clients
 * @desc    Create/add new client manually
 * @access  Private (Therapist)
 */
const createClient = async (req, res, next) => {
  try {
    // Check active client entitlement cap
    const check = await entitlementService.canAccess(req.therapistId, 'create_client');
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        entitlementBlocked: true,
        message: check.reason,
        currentUsage: check.currentUsage,
        limit: check.limit,
      });
    }

    const { name, email, phone, dateOfBirth, gender, tags, notesSummary } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await Client.findOne({ therapist: req.therapistId, email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A client with this email already exists in your practice' });
    }

    const client = await Client.create({
      therapist: req.therapistId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      dateOfBirth,
      gender: gender || 'prefer-not-to-say',
      tags: tags || [],
      notesSummary: notesSummary || '',
      status: 'active',
      consent: {
        hasConsented: true,
        consentedAt: new Date(),
        consentTextReference: 'Practitioner Registered Direct Intake Consent v1.0',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Client added successfully',
      client,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client information/tags/status
 * @access  Private (Therapist)
 */
const updateClient = async (req, res, next) => {
  try {
    const { name, email, phone, dateOfBirth, gender, tags, status, notesSummary } = req.body;

    const client = await Client.findOne({ _id: req.params.id, therapist: req.therapistId });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (name) client.name = name;
    if (email) client.email = email.toLowerCase();
    if (phone !== undefined) client.phone = phone;
    if (dateOfBirth !== undefined) client.dateOfBirth = dateOfBirth;
    if (gender !== undefined) client.gender = gender;
    if (tags !== undefined) client.tags = tags;
    if (status !== undefined) client.status = status;
    if (notesSummary !== undefined) client.notesSummary = notesSummary;

    await client.save();

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      client,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/clients/portal/me
 * @desc    Get client self profile, therapist info, and sessions for Client Portal
 * @access  Private (Client Portal)
 */
const getClientPortalData = async (req, res, next) => {
  try {
    const client = req.client;
    const sessions = await Session.find({ client: client._id }).sort({ startTime: -1 });
    const payments = await Payment.find({ client: client._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      client: {
        _id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        intakeData: client.intakeData,
        consent: client.consent,
      },
      therapist: client.therapist,
      sessions,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  getClientPortalData,
};

