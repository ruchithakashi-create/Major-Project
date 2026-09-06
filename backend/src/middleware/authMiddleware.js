const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');
const Client = require('../models/Client');

const protectTherapist = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unfazed_dev_secret');
    if (decoded.role !== 'therapist' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Therapist privileges required.' });
    }

    const therapist = await Therapist.findById(decoded.id).select('-passwordHash');
    if (!therapist) {
      return res.status(401).json({ success: false, message: 'Invalid token. Therapist does not exist.' });
    }

    req.user = therapist;
    req.therapistId = therapist._id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired', error: error.message });
  }
};

// Middleware for client portal access (via client portal token)
const protectClient = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.portalToken) {
      token = req.query.portalToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Client portal token required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unfazed_dev_secret');
    if (decoded.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Access denied. Client token required.' });
    }

    const client = await Client.findById(decoded.clientId).populate(
      'therapist',
      'name slug title bio profilePhoto sessionPrice timezone registrationNumber specializations languages location cancellationPolicy'
    );
    if (!client) {
      return res.status(401).json({ success: false, message: 'Client account not found.' });
    }

    req.client = client;
    req.therapistId = client.therapist._id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired client portal token.' });
  }
};

module.exports = { protectTherapist, protectClient };
