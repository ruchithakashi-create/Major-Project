const Notification = require('../models/Notification');

class NotificationService {
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Dispatch an in-app notification and stub WhatsApp/Email logs
   */
  async notify({ therapistId, clientId, type, title, message, metadata = {} }) {
    try {
      const notification = await Notification.create({
        therapist: therapistId,
        client: clientId,
        type,
        title,
        message,
        metadata,
      });

      // Emit socket notification if socket.io is active
      if (this.io) {
        this.io.to(`therapist_${therapistId}`).emit('notification:new', notification);
        if (clientId) {
          this.io.to(`client_${clientId}`).emit('notification:new', notification);
        }
      }

      // WhatsApp Delivery Stub
      console.log(`\n📱 [WhatsApp Stub Log] To Client/Therapist:`);
      console.log(`   Type: ${type} | ${title}`);
      console.log(`   Content: "${message}"`);

      // Email Delivery Stub
      console.log(`📧 [Email Stub Log]`);
      console.log(`   Subject: [UNFAZED] ${title}`);
      console.log(`   Body: ${message}\n`);

      return notification;
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }
}

module.exports = new NotificationService();
