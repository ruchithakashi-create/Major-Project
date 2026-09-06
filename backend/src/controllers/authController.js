const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');
const Client = require('../models/Client');
const Availability = require('../models/Availability');

// Generate JWT token
const generateToken = (id, role = 'therapist') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'unfazed_dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Generate slug from name (e.g. "Dr. Ananya Sharma" -> "dr-ananya-sharma")
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new therapist
 * @access  Public
 */
const registerTherapist = async (req, res, next) => {
  try {
    const { name, email, password, desiredSlug, title, sessionPrice, specializations, languages } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingEmail = await Therapist.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email is already registered. Please login.' });
    }

    // Determine unique slug
    let baseSlug = desiredSlug ? slugify(desiredSlug) : slugify(name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await Therapist.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const therapist = await Therapist.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      slug: finalSlug,
      title: title || 'Licensed Clinical Psychologist',
      sessionPrice: sessionPrice || 1500,
      specializations: specializations || ['Anxiety & Depression', 'Cognitive Behavioral Therapy (CBT)'],
      languages: languages || ['English', 'Hindi'],
      subscriptionTier: 'starter',
    });

    // Create default availability schedule (Monday - Friday 09:00 - 17:00)
    const defaultSchedule = [1, 2, 3, 4, 5].map((day) => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isEnabled: true,
    }));

    await Availability.create({
      therapist: therapist._id,
      weeklySchedule: defaultSchedule,
      slotDurationMinutes: 50,
      bufferMinutes: 10,
    });

    const token = generateToken(therapist._id, 'therapist');

    res.status(201).json({
      success: true,
      message: 'Therapist registered successfully',
      token,
      therapist: therapist.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Therapist login
 * @access  Public
 */
const loginTherapist = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const therapist = await Therapist.findOne({ email: email.toLowerCase() });
    if (!therapist) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await therapist.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(therapist._id, therapist.role || 'therapist');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      therapist: therapist.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated therapist
 * @access  Private (Therapist)
 */
const getMe = async (req, res, next) => {
  try {
    const therapist = await Therapist.findById(req.therapistId).select('-passwordHash');
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    res.status(200).json({
      success: true,
      therapist: therapist.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/client-login
 * @desc    Client login to client portal (via email and therapist slug)
 * @access  Public
 */
const loginClient = async (req, res, next) => {
  try {
    const { email, slug } = req.body;

    if (!email || !slug) {
      return res.status(400).json({ success: false, message: 'Email and therapist slug are required' });
    }

    const therapist = await Therapist.findOne({ slug: slug.toLowerCase() });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist practice not found' });
    }

    const client = await Client.findOne({
      therapist: therapist._id,
      email: email.toLowerCase(),
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'No client records found under this email with Dr. ' + therapist.name,
      });
    }

    const token = jwt.sign(
      { clientId: client._id, therapistId: therapist._id, role: 'client' },
      process.env.JWT_SECRET || 'unfazed_dev_secret',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      client: {
        _id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        therapist: {
          _id: therapist._id,
          name: therapist.name,
          slug: therapist.slug,
          title: therapist.title,
          profilePhoto: therapist.profilePhoto,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerTherapist,
  loginTherapist,
  getMe,
  loginClient,
};
