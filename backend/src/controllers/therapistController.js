const Therapist = require('../models/Therapist');
const Package = require('../models/Package');
const Availability = require('../models/Availability');

/**
 * @route   GET /api/therapists/public/:slug
 * @desc    Fetch public therapist profile by unique slug (for branded link unfazed.in/:slug)
 * @access  Public
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const therapist = await Therapist.findOne({ slug: slug.toLowerCase() }).select(
      'name slug title bio profilePhoto qualifications experienceYears sessionPrice specializations languages location timezone cancellationPolicy registrationNumber'
    );

    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist profile not found' });
    }

    // Fetch active session packages offered by this therapist
    const packages = await Package.find({ therapist: therapist._id, isActive: true }).select(
      'name sessionCount totalPrice perSessionPrice validityDays description'
    );

    // Fetch slot duration
    const availability = await Availability.findOne({ therapist: therapist._id }).select(
      'slotDurationMinutes bufferMinutes'
    );

    res.status(200).json({
      success: true,
      therapist,
      packages,
      slotDurationMinutes: availability ? availability.slotDurationMinutes : 50,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/therapists/check-slug/:slug
 * @desc    Check if a slug is available
 * @access  Public
 */
const checkSlugAvailability = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const formatted = slug.toLowerCase().trim();
    const existing = await Therapist.findOne({ slug: formatted });

    // If current authenticated therapist is checking their own slug
    if (existing && req.therapistId && existing._id.toString() === req.therapistId.toString()) {
      return res.status(200).json({ success: true, available: true, message: 'This is your current slug' });
    }

    res.status(200).json({
      success: true,
      available: !existing,
      message: existing ? 'Slug is already taken' : 'Slug is available',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/therapists/profile
 * @desc    Update therapist profile
 * @access  Private (Therapist)
 */
const updateProfile = async (req, res, next) => {
  try {
    const therapist = await Therapist.findById(req.therapistId);
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    const {
      name,
      title,
      bio,
      profilePhoto,
      sessionPrice,
      specializations,
      languages,
      location,
      cancellationPolicy,
      registrationNumber,
      slug,
      experienceYears,
    } = req.body;

    if (slug && slug.toLowerCase() !== therapist.slug) {
      const slugTaken = await Therapist.findOne({ slug: slug.toLowerCase() });
      if (slugTaken) {
        return res.status(409).json({ success: false, message: 'Requested slug is already taken' });
      }
      therapist.slug = slug.toLowerCase();
    }

    if (name) therapist.name = name;
    if (title !== undefined) therapist.title = title;
    if (bio !== undefined) therapist.bio = bio;
    if (profilePhoto !== undefined) therapist.profilePhoto = profilePhoto;
    if (sessionPrice !== undefined) therapist.sessionPrice = sessionPrice;
    if (specializations !== undefined) therapist.specializations = specializations;
    if (languages !== undefined) therapist.languages = languages;
    if (location !== undefined) therapist.location = location;
    if (cancellationPolicy !== undefined) therapist.cancellationPolicy = cancellationPolicy;
    if (registrationNumber !== undefined) therapist.registrationNumber = registrationNumber;
    if (experienceYears !== undefined) therapist.experienceYears = experienceYears;

    await therapist.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      therapist: therapist.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicProfile,
  checkSlugAvailability,
  updateProfile,
};
