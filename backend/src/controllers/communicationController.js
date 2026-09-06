const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Client = require('../models/Client');

/**
 * @route   GET /api/communication/messages/:clientId
 * @desc    Get message history with a client (for therapist)
 * @access  Private (Therapist)
 */
const getMessagesForTherapist = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const messages = await Message.find({
      therapist: req.therapistId,
      client: clientId,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/communication/client-messages
 * @desc    Get message history for the logged-in client
 * @access  Private (Client Portal)
 */
const getMessagesForClient = async (req, res, next) => {
  try {
    const messages = await Message.find({
      therapist: req.therapistId,
      client: req.client._id,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/communication/notifications
 * @desc    Get recent notifications for therapist
 * @access  Private (Therapist)
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      therapist: req.therapistId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      therapist: req.therapistId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/communication/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private (Therapist)
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, therapist: req.therapistId },
      { isRead: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/communication/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (Therapist)
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ therapist: req.therapistId, isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessagesForTherapist,
  getMessagesForClient,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
