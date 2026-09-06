const Therapist = require('../models/Therapist');
const SubscriptionTierConfig = require('../models/SubscriptionTierConfig');
const Client = require('../models/Client');
const Session = require('../models/Session');
const Package = require('../models/Package');
const entitlementService = require('../services/entitlementService');
const { DEFAULT_TIERS } = require('../config/tiers');

/**
 * @route   GET /api/subscriptions/tiers
 * @desc    Get all available subscription tiers configuration
 * @access  Public
 */
const getTiers = async (req, res, next) => {
  try {
    let tiers = await SubscriptionTierConfig.find().sort({ priceMonthly: 1 });
    if (!tiers || tiers.length === 0) {
      tiers = DEFAULT_TIERS;
    }
    res.status(200).json({ success: true, tiers });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current therapist tier, usage counts, and entitlements
 * @access  Private (Therapist)
 */
const getCurrentSubscription = async (req, res, next) => {
  try {
    const { therapist, tierConfig } = await entitlementService.getTherapistTier(req.therapistId);

    // Calculate current usage
    const activeClientsCount = await Client.countDocuments({ therapist: req.therapistId, status: 'active' });
    const packagesCount = await Package.countDocuments({ therapist: req.therapistId, isActive: true });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyBookingsCount = await Session.countDocuments({
      therapist: req.therapistId,
      createdAt: { $gte: startOfMonth },
      status: { $in: ['confirmed', 'completed'] },
    });

    res.status(200).json({
      success: true,
      currentTier: tierConfig,
      subscriptionStatus: therapist.subscriptionStatus,
      usage: {
        activeClients: {
          current: activeClientsCount,
          limit: tierConfig.caps?.activeClients ?? 10,
          isNearLimit: activeClientsCount >= (tierConfig.caps?.activeClients ?? 10) * 0.8,
        },
        monthlyBookings: {
          current: monthlyBookingsCount,
          limit: tierConfig.caps?.monthlyBookings ?? 30,
        },
        packagesCount: {
          current: packagesCount,
          limit: tierConfig.caps?.packagesCount ?? 1,
        },
      },
      features: tierConfig.features,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/subscriptions/upgrade
 * @desc    Upgrade or downgrade subscription tier
 * @access  Private (Therapist)
 */
const changeSubscriptionTier = async (req, res, next) => {
  try {
    const { targetTier } = req.body;
    const validTiers = ['starter', 'professional', 'enterprise'];

    if (!validTiers.includes(targetTier)) {
      return res.status(400).json({ success: false, message: 'Invalid target subscription tier' });
    }

    const therapist = await Therapist.findById(req.therapistId);
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    therapist.subscriptionTier = targetTier;
    therapist.subscriptionStatus = 'active';
    await therapist.save();

    const { tierConfig } = await entitlementService.getTherapistTier(req.therapistId);

    res.status(200).json({
      success: true,
      message: `Successfully updated subscription to ${tierConfig.name}`,
      tier: tierConfig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/subscriptions/check-entitlement/:featureKey
 * @desc    Check single entitlement dynamically
 * @access  Private (Therapist)
 */
const checkEntitlement = async (req, res, next) => {
  try {
    const { featureKey } = req.params;
    const check = await entitlementService.canAccess(req.therapistId, featureKey, req.query);
    res.status(200).json({ success: true, entitlement: check });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTiers,
  getCurrentSubscription,
  changeSubscriptionTier,
  checkEntitlement,
};
