const Therapist = require('../models/Therapist');
const SubscriptionTierConfig = require('../models/SubscriptionTierConfig');
const Client = require('../models/Client');
const Session = require('../models/Session');
const Package = require('../models/Package');
const { DEFAULT_TIERS } = require('../config/tiers');

/**
 * Centralized Entitlement Service
 * Single source of truth for feature access and usage caps
 */
class EntitlementService {
  /**
   * Get effective tier config for a therapist
   */
  async getTherapistTier(therapistId) {
    const therapist = await Therapist.findById(therapistId).select('subscriptionTier subscriptionStatus');
    if (!therapist) {
      throw new Error('Therapist not found');
    }

    const tierKey = therapist.subscriptionTier || 'starter';
    let tierConfig = await SubscriptionTierConfig.findOne({ tierKey });

    // Fallback to default in-memory config if DB record not yet populated
    if (!tierConfig) {
      tierConfig = DEFAULT_TIERS.find((t) => t.tierKey === tierKey) || DEFAULT_TIERS[0];
    }

    return { therapist, tierConfig };
  }

  /**
   * Central canAccess method required by spec:
   * canAccess(therapistId, featureKey, context)
   * Returns { allowed: boolean, reason?: string, currentUsage?: number, limit?: number }
   */
  async canAccess(therapistId, featureKey, context = {}) {
    const { therapist, tierConfig } = await this.getTherapistTier(therapistId);

    switch (featureKey) {
      // Gated Feature 1: Active-client cap
      case 'active_clients':
      case 'create_client': {
        const cap = tierConfig.caps?.activeClients ?? 10;
        const currentActiveCount = await Client.countDocuments({
          therapist: therapistId,
          status: 'active',
        });

        if (currentActiveCount >= cap) {
          return {
            allowed: false,
            reason: `Active client limit reached for ${tierConfig.name} (${currentActiveCount}/${cap}). Upgrade to add more active clients.`,
            currentUsage: currentActiveCount,
            limit: cap,
            tier: tierConfig.tierKey,
          };
        }
        return { allowed: true, currentUsage: currentActiveCount, limit: cap };
      }

      // Gated Feature 2: Note template types (standard vs soap vs dap vs custom)
      case 'note_templates':
      case 'use_note_template': {
        const requestedTemplate = context.templateType || 'standard';
        const allowedTemplates = tierConfig.features?.noteTemplates || ['standard'];

        if (!allowedTemplates.includes(requestedTemplate)) {
          return {
            allowed: false,
            reason: `The '${requestedTemplate.toUpperCase()}' clinical note template is not available on the ${tierConfig.name}. Please upgrade to Professional or Enterprise.`,
            tier: tierConfig.tierKey,
          };
        }
        return { allowed: true, allowedTemplates };
      }

      // Gated Feature 3: Analytics depth (basic vs advanced)
      case 'analytics_depth':
      case 'advanced_analytics': {
        const depth = tierConfig.features?.analyticsDepth || 'basic';
        if (depth !== 'advanced') {
          return {
            allowed: false,
            reason: `Advanced analytics (retention graphs, no-show trends, and revenue forecasting) are available only on the Professional and Enterprise tiers.`,
            tier: tierConfig.tierKey,
          };
        }
        return { allowed: true };
      }

      // Gated Feature 4: Package creation
      case 'create_package': {
        const packageCap = tierConfig.caps?.packagesCount ?? 1;
        const currentPackages = await Package.countDocuments({
          therapist: therapistId,
          isActive: true,
        });

        if (currentPackages >= packageCap) {
          return {
            allowed: false,
            reason: `Your plan allows a maximum of ${packageCap} active session package(s). Upgrade to create more packages.`,
            currentUsage: currentPackages,
            limit: packageCap,
            tier: tierConfig.tierKey,
          };
        }
        return { allowed: true, currentUsage: currentPackages, limit: packageCap };
      }

      // Gated Feature 5: Monthly booking cap
      case 'monthly_booking_cap': {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const bookingCap = tierConfig.caps?.monthlyBookings ?? 30;
        const currentMonthBookings = await Session.countDocuments({
          therapist: therapistId,
          createdAt: { $gte: startOfMonth },
          status: { $in: ['confirmed', 'completed'] },
        });

        if (currentMonthBookings >= bookingCap) {
          return {
            allowed: false,
            reason: `Monthly booking capacity (${bookingCap} bookings) reached for this billing cycle. Upgrade to accept more appointments.`,
            currentUsage: currentMonthBookings,
            limit: bookingCap,
            tier: tierConfig.tierKey,
          };
        }
        return { allowed: true, currentUsage: currentMonthBookings, limit: bookingCap };
      }

      // Gated Feature 6: Custom Branding
      case 'custom_branding': {
        const allowed = !!tierConfig.features?.customBranding;
        return {
          allowed,
          reason: allowed ? undefined : 'Custom domain and custom branding require the Professional plan.',
          tier: tierConfig.tierKey,
        };
      }

      // General feature flag check
      default: {
        const featureAllowed = tierConfig.features?.[featureKey] ?? true;
        return {
          allowed: !!featureAllowed,
          reason: featureAllowed ? undefined : `Feature '${featureKey}' is not enabled in your current plan.`,
          tier: tierConfig.tierKey,
        };
      }
    }
  }

  /**
   * Express middleware factory for route guards
   */
  guard(featureKey, getContextFn = null) {
    return async (req, res, next) => {
      try {
        const context = getContextFn ? getContextFn(req) : req.body;
        const check = await this.canAccess(req.therapistId, featureKey, context);

        if (!check.allowed) {
          return res.status(403).json({
            success: false,
            entitlementBlocked: true,
            featureKey,
            message: check.reason,
            currentUsage: check.currentUsage,
            limit: check.limit,
            tier: check.tier,
          });
        }

        req.entitlement = check;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = new EntitlementService();
