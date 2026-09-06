const Availability = require('../models/Availability');
const Session = require('../models/Session');
const Therapist = require('../models/Therapist');
const Client = require('../models/Client');
const notificationService = require('../services/notificationService');
const entitlementService = require('../services/entitlementService');

/**
 * Helper to format date string YYYY-MM-DD
 */
const getDayOfWeekIndex = (dateStr) => {
  const d = new Date(dateStr);
  return d.getUTCDay();
};

/**
 * Generate available time slots for a given therapist on a specific date (YYYY-MM-DD)
 */
const computeAvailableSlots = async (therapistId, dateStr, clientTz = 'Asia/Kolkata') => {
  const availability = await Availability.findOne({ therapist: therapistId });
  if (!availability) return [];

  // Parse target date range in UTC (00:00:00 to 23:59:59)
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay();

  // Check date overrides
  const override = availability.dateOverrides.find((o) => o.date === dateStr);
  if (override && override.isBlocked) {
    return [];
  }

  // Find weekly schedule for this day
  const scheduleDay = availability.weeklySchedule.find((s) => s.dayOfWeek === dayOfWeek && s.isEnabled);
  if (!scheduleDay && (!override || !override.customSlots || override.customSlots.length === 0)) {
    return [];
  }

  const slotDuration = availability.slotDurationMinutes || 50;
  const buffer = availability.bufferMinutes || 10;
  const startHourMin = override?.customSlots?.[0]?.startTime || scheduleDay?.startTime || '09:00';
  const endHourMin = override?.customSlots?.[0]?.endTime || scheduleDay?.endTime || '17:00';

  const [startH, startM] = startHourMin.split(':').map(Number);
  const [endH, endM] = endHourMin.split(':').map(Number);

  // Fetch all existing active sessions on that date
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const bookedSessions = await Session.find({
    therapist: therapistId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $gte: startOfDay, $lte: endOfDay },
  }).select('startTime endTime');

  const slots = [];
  let current = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00.000Z`);
  const dayEnd = new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000Z`);

  const now = new Date();
  const advanceNoticeMs = (availability.advanceNoticeHours || 2) * 60 * 60 * 1000;

  while (current.getTime() + slotDuration * 60 * 1000 <= dayEnd.getTime()) {
    const slotStart = new Date(current);
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

    // Filter out past slots or slots within advance notice window
    const isPastOrTooSoon = slotStart.getTime() - now.getTime() < advanceNoticeMs;

    // Check collision with booked sessions
    const isBooked = bookedSessions.some((b) => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
    });

    if (!isPastOrTooSoon && !isBooked) {
      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        timeLabel: `${String(slotStart.getUTCHours()).padStart(2, '0')}:${String(slotStart.getUTCMinutes()).padStart(2, '0')}`,
        durationMinutes: slotDuration,
      });
    }

    // Step forward by slot duration + buffer
    current = new Date(current.getTime() + (slotDuration + buffer) * 60 * 1000);
  }

  return slots;
};

/**
 * @route   GET /api/scheduling/public/:slug/slots
 * @desc    Public route to get open slots for a date
 * @access  Public
 */
const getPublicSlots = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { date, timezone } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Query param `date` (YYYY-MM-DD) is required' });
    }

    const therapist = await Therapist.findOne({ slug: slug.toLowerCase() });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    const slots = await computeAvailableSlots(therapist._id, date, timezone);

    res.status(200).json({
      success: true,
      therapist: {
        _id: therapist._id,
        name: therapist.name,
        slug: therapist.slug,
        sessionPrice: therapist.sessionPrice,
      },
      date,
      slots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/scheduling/public/:slug/book
 * @desc    Book a slot with intake and consent (Instant confirmation / double-booking protected)
 * @access  Public
 */
const bookSessionPublic = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const {
      clientName,
      clientEmail,
      clientPhone,
      startTime,
      durationMinutes,
      intakeConcern,
      previousTherapy,
      consentAccepted,
      clientTimezone,
      paymentId,
      packageId,
    } = req.body;

    if (!clientName || !clientEmail || !startTime) {
      return res.status(400).json({ success: false, message: 'Name, email, and start time are required' });
    }

    if (!consentAccepted) {
      return res.status(400).json({ success: false, message: 'Informed consent acceptance is required for booking' });
    }

    const therapist = await Therapist.findOne({ slug: slug.toLowerCase() });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    // Check therapist monthly booking cap
    const bookingCapCheck = await entitlementService.canAccess(therapist._id, 'monthly_booking_cap');
    if (!bookingCapCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: 'This therapist has reached booking capacity for the month. Please contact them directly.',
      });
    }

    // Atomic double-booking check
    const start = new Date(startTime);
    const duration = durationMinutes || 50;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const collision = await Session.findOne({
      therapist: therapist._id,
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (collision) {
      return res.status(409).json({
        success: false,
        message: 'This time slot was just taken by another client. Please select another slot.',
      });
    }

    // Find or create client under this therapist
    let client = await Client.findOne({ therapist: therapist._id, email: clientEmail.toLowerCase() });
    if (!client) {
      // Check active clients cap if creating new client
      const capCheck = await entitlementService.canAccess(therapist._id, 'create_client');
      if (!capCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: 'The therapist has reached their current client capacity. Please check back later.',
        });
      }

      client = await Client.create({
        therapist: therapist._id,
        name: clientName,
        email: clientEmail.toLowerCase(),
        phone: clientPhone || '',
        status: 'active',
        intakeData: {
          presentingConcern: intakeConcern || '',
          previousTherapy: !!previousTherapy,
          submittedAt: new Date(),
        },
        consent: {
          hasConsented: true,
          consentedAt: new Date(),
          consentTextReference: 'Informed Consent & Privacy Acknowledgement v1.0',
          ipAddress: req.ip,
        },
      });
    } else {
      // Update intake details
      client.intakeData = {
        presentingConcern: intakeConcern || client.intakeData?.presentingConcern || '',
        previousTherapy: previousTherapy !== undefined ? !!previousTherapy : client.intakeData?.previousTherapy,
        submittedAt: new Date(),
      };
      client.consent = {
        hasConsented: true,
        consentedAt: new Date(),
        consentTextReference: 'Informed Consent & Privacy Acknowledgement v1.0',
        ipAddress: req.ip,
      };
      await client.save();
    }

    // Create session
    const meetingRoomId = `unfazed-${therapist.slug}-${Date.now().toString(36)}`;
    const session = await Session.create({
      therapist: therapist._id,
      client: client._id,
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      status: 'confirmed',
      paymentStatus: paymentId ? 'paid' : 'unpaid',
      meetingLink: `https://meet.jit.si/${meetingRoomId}`,
      clientTimezone: clientTimezone || 'Asia/Kolkata',
      price: therapist.sessionPrice || 1500,
    });

    // Dispatch notifications
    await notificationService.notify({
      therapistId: therapist._id,
      clientId: client._id,
      type: 'booking_confirmed',
      title: 'New Session Booked',
      message: `${client.name} booked a session for ${start.toLocaleDateString('en-IN')} at ${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`,
      metadata: { sessionId: session._id, clientEmail: client.email },
    });

    res.status(201).json({
      success: true,
      message: 'Session successfully booked and confirmed!',
      session: {
        _id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        meetingLink: session.meetingLink,
        status: session.status,
      },
      client: {
        _id: client._id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (error) {
    // If Mongo unique index triggers
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This slot has already been booked. Please pick another available time.',
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/scheduling/sessions
 * @desc    Get therapist sessions with filtering by date / status
 * @access  Private (Therapist)
 */
const getTherapistSessions = async (req, res, next) => {
  try {
    const { status, startDate, endDate, clientId } = req.query;
    const query = { therapist: req.therapistId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (clientId) {
      query.client = clientId;
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const sessions = await Session.find(query)
      .populate('client', 'name email phone status intakeData')
      .populate('payment', 'amount status invoiceNumber')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/scheduling/sessions/:id/status
 * @desc    Update session lifecycle status (completed, cancelled, no-show)
 * @access  Private (Therapist)
 */
const updateSessionStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid session status' });
    }

    const session = await Session.findOne({ _id: req.params.id, therapist: req.therapistId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = status;
    if (status === 'cancelled') {
      session.cancellationReason = cancellationReason || 'Cancelled by therapist';
      session.cancelledBy = 'therapist';
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: `Session status updated to ${status}`,
      session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/scheduling/availability
 * @desc    Get therapist availability settings
 * @access  Private (Therapist)
 */
const getAvailability = async (req, res, next) => {
  try {
    let availability = await Availability.findOne({ therapist: req.therapistId });
    if (!availability) {
      // Create standard default
      const defaultSchedule = [1, 2, 3, 4, 5].map((day) => ({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: true,
      }));
      availability = await Availability.create({
        therapist: req.therapistId,
        weeklySchedule: defaultSchedule,
        slotDurationMinutes: 50,
        bufferMinutes: 10,
      });
    }

    res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/scheduling/availability
 * @desc    Update therapist availability settings
 * @access  Private (Therapist)
 */
const updateAvailability = async (req, res, next) => {
  try {
    const { weeklySchedule, slotDurationMinutes, bufferMinutes, advanceNoticeHours, bookingHorizonDays, dateOverrides } = req.body;

    let availability = await Availability.findOne({ therapist: req.therapistId });
    if (!availability) {
      availability = new Availability({ therapist: req.therapistId });
    }

    if (weeklySchedule) availability.weeklySchedule = weeklySchedule;
    if (slotDurationMinutes) availability.slotDurationMinutes = slotDurationMinutes;
    if (bufferMinutes !== undefined) availability.bufferMinutes = bufferMinutes;
    if (advanceNoticeHours !== undefined) availability.advanceNoticeHours = advanceNoticeHours;
    if (bookingHorizonDays !== undefined) availability.bookingHorizonDays = bookingHorizonDays;
    if (dateOverrides !== undefined) availability.dateOverrides = dateOverrides;

    await availability.save();

    res.status(200).json({
      success: true,
      message: 'Availability schedule saved successfully',
      availability,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicSlots,
  bookSessionPublic,
  getTherapistSessions,
  updateSessionStatus,
  getAvailability,
  updateAvailability,
};
