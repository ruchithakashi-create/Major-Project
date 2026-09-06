import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('unfazed_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await API.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.therapist);
        }
      } catch (err) {
        console.error('Session expired or invalid:', err);
        localStorage.removeItem('unfazed_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('unfazed_token', res.data.token);
      localStorage.setItem('unfazed_user', JSON.stringify(res.data.therapist));
      setUser(res.data.therapist);
      addToast(`Welcome back, ${res.data.therapist.name}!`, 'success');
      return res.data;
    }
  };

  const register = async (data) => {
    const res = await API.post('/auth/register', data);
    if (res.data.success) {
      localStorage.setItem('unfazed_token', res.data.token);
      localStorage.setItem('unfazed_user', JSON.stringify(res.data.therapist));
      setUser(res.data.therapist);
      addToast('Practice registered successfully!', 'success');
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('unfazed_token');
    localStorage.removeItem('unfazed_user');
    setUser(null);
    addToast('Logged out successfully', 'info');
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem('unfazed_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
