import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected to server');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Join user room when authenticated therapist
  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('join_room', { role: 'therapist', id: user._id });

      const handleNotification = (notif) => {
        addToast(`${notif.title}: ${notif.message}`, 'info');
      };

      socket.on('notification:new', handleNotification);

      return () => {
        socket.off('notification:new', handleNotification);
      };
    }
  }, [socket, user]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
