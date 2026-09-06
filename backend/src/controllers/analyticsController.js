const mongoose = require('mongoose');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const entitlementService = require('../services/entitlementService');

/**
 * @route   GET /api/analytics
 * @desc    Get dashboard metrics and aggregation statistics
 * @access  Private (Therapist)
 */
const getTherapistAnalytics = async (req, res, next) => {
  try {
    const therapistId = new mongoose.Types.ObjectId(req.therapistId);

    // Check entitlement for analytics depth
    const { tierConfig } = await entitlementService.getTherapistTier(req.therapistId);
    const isAdvanced = tierConfig.features?.analyticsDepth === 'advanced';

    // 1. Client counts
    const totalClients = await Client.countDocuments({ therapist: therapistId });
    const activeClients = await Client.countDocuments({ therapist: therapistId, status: 'active' });

    // 2. Session counts & status breakdown
    const sessionStats = await Session.aggregate([
      { $match: { therapist: therapistId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts = {
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      'no-show': 0,
      pending: 0,
    };
    let totalSessions = 0;

    sessionStats.forEach((item) => {
      if (statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
      totalSessions += item.count;
    });

    const noShowRate = totalSessions > 0 ? Math.round((statusCounts['no-show'] / totalSessions) * 100) : 0;
    const completionRate = totalSessions > 0 ? Math.round((statusCounts['completed'] / totalSessions) * 100) : 0;
    const cancellationRate = totalSessions > 0 ? Math.round((statusCounts['cancelled'] / totalSessions) * 100) : 0;

    // 3. Total & Net Revenue
    const revenueAgg = await Payment.aggregate([
      { $match: { therapist: therapistId, status: 'captured' } },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$amount' },
          totalNet: { $sum: '$netAmount' },
          paymentCount: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalGross : 0;
    const netRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalNet : 0;
    const averageRevenuePerSession =
      statusCounts.completed > 0 ? Math.round(totalRevenue / statusCounts.completed) : 1500;

    // 4. Monthly Revenue Trend (MongoDB aggregation)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          therapist: therapistId,
          status: 'captured',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format monthly trend for charts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrend = monthlyRevenue.map((item) => ({
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      revenue: item.revenue,
      sessions: item.count,
    }));

    // 5. Advanced analytics (only populated if tier allows)
    let advancedData = null;
    if (isAdvanced) {
      // New clients over time
      const newClientsTrend = await Client.aggregate([
        {
          $match: {
            therapist: therapistId,
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      advancedData = {
        newClientsTrend: newClientsTrend.map((item) => ({
          label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
          clients: item.count,
        })),
        retentionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 100,
        averageRevenuePerSession,
      };
    }

    res.status(200).json({
      success: true,
      analyticsTier: tierConfig.features?.analyticsDepth || 'basic',
      isAdvanced,
      overview: {
        totalRevenue,
        netRevenue,
        activeClients,
        totalClients,
        totalSessions,
        completedSessions: statusCounts.completed,
        upcomingSessions: statusCounts.confirmed,
        noShowRate,
        completionRate,
        cancellationRate,
      },
      statusDistribution: statusCounts,
      revenueTrend,
      advancedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTherapistAnalytics,
};
