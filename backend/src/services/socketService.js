const Message = require('../models/Message');

const initSocketIO = (io) => {
  io.on('connection', (socket) => {
    // Join private room (e.g. therapist_123 or client_456)
    socket.on('join_room', ({ role, id }) => {
      const roomName = `${role}_${id}`;
      socket.join(roomName);
      console.log(`🔌 Socket ${socket.id} joined room: ${roomName}`);
    });

    // Join shared conversation channel
    socket.on('join_conversation', ({ therapistId, clientId }) => {
      const convRoom = `conv_${therapistId}_${clientId}`;
      socket.join(convRoom);
      console.log(`💬 Socket ${socket.id} joined conversation room: ${convRoom}`);
    });

    // Handle real-time chat message
    socket.on('message:send', async (data, callback) => {
      try {
        const { therapistId, clientId, senderType, senderId, text, attachments } = data;
        if (!therapistId || !clientId || !text) {
          if (callback) callback({ success: false, error: 'Missing required message parameters' });
          return;
        }

        const message = await Message.create({
          therapist: therapistId,
          client: clientId,
          senderType,
          senderId,
          text,
          attachments: attachments || [],
        });

        const convRoom = `conv_${therapistId}_${clientId}`;
        // Broadcast to both parties in the conversation room
        io.to(convRoom).emit('message:received', message);

        // Also ping personal rooms for badge/unread notification
        const targetRoom = senderType === 'therapist' ? `client_${clientId}` : `therapist_${therapistId}`;
        io.to(targetRoom).emit('message:alert', {
          title: 'New message',
          message: text.substring(0, 50),
          therapistId,
          clientId,
        });

        if (callback) callback({ success: true, message });
      } catch (err) {
        console.error('Socket message error:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ therapistId, clientId, senderType }) => {
      socket.to(`conv_${therapistId}_${clientId}`).emit('typing:status', {
        isTyping: true,
        senderType,
      });
    });

    socket.on('typing:stop', ({ therapistId, clientId, senderType }) => {
      socket.to(`conv_${therapistId}_${clientId}`).emit('typing:status', {
        isTyping: false,
        senderType,
      });
    });

    socket.on('disconnect', () => {
      // Disconnected
    });
  });
};

module.exports = { initSocketIO };
