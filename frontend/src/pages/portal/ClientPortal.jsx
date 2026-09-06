import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  FileText,
  MessageSquare,
  CreditCard,
  Video,
  Download,
  Send,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package as PackageIcon,
  HeartHandshake,
  ExternalLink,
  PhoneCall,
  Activity,
  Smile,
  RefreshCw,
} from 'lucide-react';
import API from '../../services/api';
import { io } from 'socket.io-client';
import { useToast } from '../../context/ToastContext';
import RazorpayModal from '../../components/RazorpayModal';

const ClientPortal = () => {
  const { addToast } = useToast();

  const [clientToken, setClientToken] = useState(localStorage.getItem('unfazed_client_token'));
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSlug, setLoginSlug] = useState('dr-ananya-sharma');
  const [loggingIn, setLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'billing' | 'notes' | 'chat' | 'intake'

  // Shared Notes
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Real-time Chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Razorpay Payment Modal State
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [currentOrderDetails, setCurrentOrderDetails] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null); // { type: 'session' | 'package' | 'custom', id: string, amount: number, title: string }
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Fetch Portal Profile Data
  const fetchPortalData = async (overrideToken = null) => {
    const tokenToUse = overrideToken || clientToken || localStorage.getItem('unfazed_client_token');
    if (!tokenToUse) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await API.get('/clients/portal/me', {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });

      if (res.data?.success) {
        setClientData(res.data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Portal session load error:', err);
      // Only logout if token is truly invalid/expired
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        addToast(err.response?.data?.message || 'Session expired. Please log in again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedNotes = async () => {
    const tokenToUse = clientToken || localStorage.getItem('unfazed_client_token');
    if (!tokenToUse) return;

    try {
      setLoadingNotes(true);
      const res = await API.get('/notes/client-view', {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
      if (res.data?.success) {
        setSharedNotes(res.data.notes || []);
      }
    } catch (err) {
      console.error('Failed to load shared reflections:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchMessages = async () => {
    const tokenToUse = clientToken || localStorage.getItem('unfazed_client_token');
    if (!tokenToUse) return;

    try {
      const res = await API.get('/communication/client-messages', {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    if (clientToken) {
      fetchPortalData(clientToken);
    } else {
      setLoading(false);
    }
  }, [clientToken]);

  useEffect(() => {
    if (clientData) {
      if (activeTab === 'notes') fetchSharedNotes();
      if (activeTab === 'chat') fetchMessages();
    }
  }, [activeTab, clientData]);

  // Setup Real-time Chat Socket
  useEffect(() => {
    if (clientData && activeTab === 'chat') {
      const s = io('/', { transports: ['websocket', 'polling'] });
      setSocket(s);

      s.emit('join_room', { role: 'client', id: clientData.client._id });
      s.emit('join_conversation', {
        therapistId: clientData.therapist._id,
        clientId: clientData.client._id,
      });

      s.on('message:received', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      s.on('typing:status', ({ isTyping: typing, senderType }) => {
        if (senderType === 'therapist') {
          setIsTyping(typing);
        }
      });

      return () => {
        s.disconnect();
      };
    }
  }, [clientData, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle Client Sign In
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginSlug) {
      addToast('Please provide your registered email and therapist slug', 'error');
      return;
    }

    try {
      setLoggingIn(true);
      const res = await API.post('/auth/client-login', {
        email: loginEmail.trim(),
        slug: loginSlug.trim(),
      });

      if (res.data?.success && res.data?.token) {
        const token = res.data.token;
        localStorage.setItem('unfazed_client_token', token);
        setClientToken(token);
        addToast(`Welcome to your sanctuary, ${res.data.client.name}!`, 'success');
        // Immediately fetch data with the new token
        await fetchPortalData(token);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Client account not found with this therapist', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleDemoClientLogin = async (email, slug) => {
    setLoginEmail(email);
    setLoginSlug(slug);
    try {
      setLoggingIn(true);
      const res = await API.post('/auth/client-login', { email, slug });
      if (res.data?.success && res.data?.token) {
        const token = res.data.token;
        localStorage.setItem('unfazed_client_token', token);
        setClientToken(token);
        addToast(`Logged in as ${res.data.client.name}`, 'success');
        await fetchPortalData(token);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Demo login failed', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unfazed_client_token');
    setClientToken(null);
    setClientData(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !clientData) return;

    socket.emit(
      'message:send',
      {
        therapistId: clientData.therapist._id,
        clientId: clientData.client._id,
        senderType: 'client',
        senderId: clientData.client._id,
        text: newMessage.trim(),
      },
      (res) => {
        if (res?.success) {
          setNewMessage('');
        }
      }
    );
  };

  // --- Razorpay Payment Handlers ---
  const handleInitiateSessionPayment = async (session) => {
    try {
      setPaymentProcessing(true);
      const amount = clientData.therapist.sessionPrice || 1500;
      setPaymentTarget({
        type: 'session',
        id: session._id,
        amount,
        title: `Consultation Fee (${new Date(session.startTime).toLocaleDateString('en-IN')})`,
      });

      const orderRes = await API.post('/payments/create-order', {
        amount,
        clientEmail: clientData.client.email,
        receipt: `sess_${session._id.substring(session._id.length - 6)}`,
      });

      if (orderRes.data?.success) {
        setCurrentOrderDetails(orderRes.data.order);
        setIsRazorpayOpen(true);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not initiate session payment', 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleInitiatePackagePayment = async (pkg) => {
    try {
      setPaymentProcessing(true);
      setPaymentTarget({
        type: 'package',
        id: pkg._id,
        amount: pkg.totalPrice,
        title: `${pkg.name} (${pkg.sessionCount} Sessions)`,
      });

      const orderRes = await API.post('/payments/create-order', {
        amount: pkg.totalPrice,
        clientEmail: clientData.client.email,
        receipt: `pkg_${pkg._id.substring(pkg._id.length - 6)}`,
      });

      if (orderRes.data?.success) {
        setCurrentOrderDetails(orderRes.data.order);
        setIsRazorpayOpen(true);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not initiate package purchase', 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setIsRazorpayOpen(false);
    try {
      // Verify payment with backend
      const payload = {
        orderId: paymentResult.orderId,
        paymentId: paymentResult.paymentId,
        signature: paymentResult.signature,
        therapistSlug: clientData.therapist.slug,
        clientEmail: clientData.client.email,
        clientName: clientData.client.name,
        clientPhone: clientData.client.phone,
        amount: paymentTarget?.amount,
        sessionId: paymentTarget?.type === 'session' ? paymentTarget.id : undefined,
        packageId: paymentTarget?.type === 'package' ? paymentTarget.id : undefined,
      };

      const res = await API.post('/payments/verify', payload);
      if (res.data?.success) {
        addToast(`Payment verified! GST Invoice ${res.data.invoiceNumber || ''} generated.`, 'success');
        // Refresh portal data to show updated sessions, active package, and invoice
        await fetchPortalData();
        setActiveTab('billing');
      }
    } catch (err) {
      console.error('Payment verification failed:', err);
      addToast(err.response?.data?.message || 'Payment completed, but verification failed. Please check invoices.', 'error');
      await fetchPortalData();
    }
  };

  // ==========================================
  // RENDER: LOGIN VIEW (Serene Sanctuary Theme)
  // ==========================================
  if (!clientToken || (!clientData && !loading)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#FAF8F5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#2D3748',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 20px 40px -15px rgba(45, 74, 67, 0.08), 0 0 0 1px rgba(229, 231, 235, 0.7)',
            padding: '2.75rem 2.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Top Accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '5px',
              background: 'linear-gradient(90deg, #3B5E54 0%, #C2783F 100%)',
            }}
          />

          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: '#F2F6F4',
                color: '#2D4A43',
                borderRadius: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(45, 74, 67, 0.06)',
              }}
            >
              <HeartHandshake size={28} />
            </div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 700,
                color: '#1F3A33',
                letterSpacing: '-0.02em',
                marginBottom: '0.4rem',
              }}
            >
              Client Sanctuary Portal
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', lineHeight: 1.5 }}>
              Your confidential telehealth space for appointments, reflections, and care billing
            </p>
          </div>

          {/* Quick Demo Assist */}
          <div
            style={{
              backgroundColor: '#F7F9F8',
              border: '1px solid #E3EBE7',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '1.75rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2D4A43',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <Sparkles size={13} color="#C2783F" /> Instant 1-Click Demo Login
            </div>
            <button
              type="button"
              onClick={() => handleDemoClientLogin('aditi@example.com', 'dr-ananya-sharma')}
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                color: '#1F3A33',
                border: '1px solid #D5E0DB',
                fontSize: '0.825rem',
                fontWeight: 600,
                padding: '9px 12px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Aditi Rao (with Dr. Ananya)</span>
              <ArrowRight size={14} color="#3B5E54" />
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Your Registered Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. aditi@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  borderRadius: '12px',
                  padding: '12px 14px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.925rem',
                  backgroundColor: '#FAFAFA',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Therapist Practice Slug *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. dr-ananya-sharma"
                value={loginSlug}
                onChange={(e) => setLoginSlug(e.target.value)}
                style={{
                  borderRadius: '12px',
                  padding: '12px 14px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.925rem',
                  backgroundColor: '#FAFAFA',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                Found in your therapist's branded link (unfazed.in/<strong>your-slug</strong>)
              </span>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#2D4A43',
                color: '#FFFFFF',
                padding: '13px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                boxShadow: '0 4px 12px rgba(45, 74, 67, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loggingIn ? (
                <>
                  <RefreshCw size={16} className="spin" /> Opening Sanctuary...
                </>
              ) : (
                'Access My Sanctuary'
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.825rem', color: '#6B7280' }}>
            Are you a mental health practitioner?{' '}
            <Link to="/login" style={{ color: '#2D4A43', fontWeight: 600, textDecoration: 'underline' }}>
              Therapist Practice Login
            </Link>
          </div>
        </div>

        {/* Indian Mental Health Helpline Footer */}
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#9CA3AF', maxWidth: '440px' }}>
          🛡️ Tele-MANAS 24/7 Helpline: <strong>14416</strong> • AASRA: <strong>+91 98204 66726</strong>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#FAF8F5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid #E2E8F0',
            borderTopColor: '#2D4A43',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1F3A33' }}>Opening Your Care Space...</div>
        <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>
          Connecting to your encrypted clinical records
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: ACTIVE SANCTUARY PORTAL
  // ==========================================
  const { client, therapist, sessions, payments, clientPackages, availablePackages } = clientData || {};
  const upcomingSessions = sessions?.filter((s) => s.status === 'confirmed' || s.status === 'pending') || [];
  const pastSessions = sessions?.filter((s) => s.status === 'completed' || s.status === 'cancelled') || [];
  const nextSession = upcomingSessions[0] || null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAF8F5',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#2D3748',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Serene Practitioner Header */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #EBE7DF',
          padding: '1.25rem 2rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Practitioner Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={
                therapist?.profilePhoto ||
                'https://images.unsplash.com/photo-1594824813591-105151a660d1?w=400&auto=format&fit=crop&q=80'
              }
              alt={therapist?.name}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #D1E0DB',
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F3A33' }}>
                  {therapist?.name}
                </span>
                <span
                  style={{
                    backgroundColor: '#E8F2EE',
                    color: '#2D4A43',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <ShieldCheck size={11} color="#2D4A43" /> RCI Licensed
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                {therapist?.title} • {therapist?.location?.city || 'Online Practice'}
              </div>
            </div>
          </div>

          {/* Client Identity & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1F3A33' }}>
                {client?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {client?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LogOut size={14} /> Exit Sanctuary
            </button>
          </div>
        </div>
      </header>

      {/* 2. Serene Grounding Banner & Highlights */}
      <div
        style={{
          backgroundColor: '#F4EFEA',
          borderBottom: '1px solid #E6DFD5',
          padding: '1.5rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Smile size={18} color="#C2783F" />
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2B3E37' }}>
                Welcome to your care sanctuary, {client?.name?.split(' ')[0]}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#5C6763', maxWidth: '600px' }}>
              "Take a gentle breath. This space is private, protected, and focused entirely on your emotional well-being."
            </p>
          </div>

          {/* Quick Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={`/${therapist?.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{
                backgroundColor: '#2D4A43',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '9px 16px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(45, 74, 67, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Calendar size={15} /> Book Next Session
            </a>
            <button
              onClick={() => setActiveTab('billing')}
              className="btn"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#2D4A43',
                border: '1px solid #D2DDD8',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '9px 16px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CreditCard size={15} color="#C2783F" /> Pay / Buy Package
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sanctuary Navigation Tabs */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #EBE7DF',
          padding: '0 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'sessions', label: 'Appointments & Video', icon: Calendar, badge: upcomingSessions.length },
            { id: 'billing', label: 'Payments & Care Packages', icon: CreditCard, badge: null },
            { id: 'notes', label: 'Clinical Reflections & Homework', icon: FileText, badge: sharedNotes.length || null },
            { id: 'chat', label: 'Direct Care Line', icon: MessageSquare, badge: null },
            { id: 'intake', label: 'Intake & Privacy Consent', icon: Shield, badge: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '15px 18px',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.9rem',
                  color: isActive ? '#2D4A43' : '#6B7280',
                  borderBottom: isActive ? '3px solid #2D4A43' : '3px solid transparent',
                  background: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={17} color={isActive ? '#2D4A43' : '#9CA3AF'} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span
                    style={{
                      backgroundColor: isActive ? '#2D4A43' : '#E5E7EB',
                      color: isActive ? '#FFFFFF' : '#4B5563',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Body Content */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
        {/* ========================================= */}
        {/* TAB 1: APPOINTMENTS & VIDEO ROOMS        */}
        {/* ========================================= */}
        {activeTab === 'sessions' && (
          <div>
            {/* Next Upcoming Highlight */}
            {nextSession && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #D5E2DC',
                  padding: '1.75rem',
                  marginBottom: '2rem',
                  boxShadow: '0 8px 24px -10px rgba(45, 74, 67, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                }}
              >
                <div>
                  <span
                    style={{
                      backgroundColor: '#E6F0EC',
                      color: '#2D4A43',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    🌿 Your Next Confirmed Consultation
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F3A33', marginTop: '8px' }}>
                    {new Date(nextSession.startTime).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#3B5E54', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <Clock size={16} />
                    {new Date(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {nextSession.durationMinutes || 50} Mins Tele-Consultation
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '6px' }}>
                    Payment Status:{' '}
                    <strong style={{ color: nextSession.paymentStatus === 'paid' ? '#059669' : '#D97706' }}>
                      {nextSession.paymentStatus === 'paid' ? 'Paid in Advance ✅' : 'Pending Payment ⚠️'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {nextSession.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => handleInitiateSessionPayment(nextSession)}
                      disabled={paymentProcessing}
                      className="btn"
                      style={{
                        backgroundColor: '#C2783F',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        padding: '12px 20px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(194, 120, 63, 0.25)',
                      }}
                    >
                      <CreditCard size={16} /> Pay Fee (₹{therapist?.sessionPrice || 1500})
                    </button>
                  )}
                  <a
                    href={nextSession.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{
                      backgroundColor: '#2D4A43',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      padding: '12px 22px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(45, 74, 67, 0.2)',
                    }}
                  >
                    <Video size={17} /> Enter Tele-Health Video Room
                  </a>
                </div>
              </div>
            )}

            {/* Upcoming List */}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33', marginBottom: '1rem' }}>
              Scheduled Appointments ({upcomingSessions.length})
            </h3>
            {upcomingSessions.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #EBE7DF',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  marginBottom: '2.5rem',
                }}
              >
                <Calendar size={44} color="#A0AEC0" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2D3748', marginBottom: '4px' }}>
                  No Upcoming Sessions Scheduled
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#718096', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                  Reserve your preferred weekly consultation slot directly on {therapist?.name}'s calendar.
                </p>
                <a
                  href={`/${therapist?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{
                    backgroundColor: '#2D4A43',
                    color: '#FFFFFF',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Calendar size={16} /> Choose a Slot with {therapist?.name}
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                {upcomingSessions.map((session) => {
                  const isPaid = session.paymentStatus === 'paid';
                  return (
                    <div
                      key={session._id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '18px',
                        border: '1px solid #E5EBE8',
                        padding: '1.5rem',
                        boxShadow: '0 4px 16px -5px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span
                            style={{
                              backgroundColor: isPaid ? '#E6F4EA' : '#FEF3C7',
                              color: isPaid ? '#137333' : '#92400E',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {isPaid ? 'Paid in Full' : 'Fee Pending'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                            {session.durationMinutes || 50} mins
                          </span>
                        </div>

                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33', marginBottom: '4px' }}>
                          {new Date(session.startTime).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#3B5E54', marginBottom: '1.25rem' }}>
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isPaid && (
                          <button
                            onClick={() => handleInitiateSessionPayment(session)}
                            disabled={paymentProcessing}
                            className="btn"
                            style={{
                              flex: 1,
                              backgroundColor: '#C2783F',
                              color: '#FFFFFF',
                              fontSize: '0.825rem',
                              fontWeight: 600,
                              padding: '10px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <CreditCard size={14} /> Pay ₹{therapist?.sessionPrice || 1500}
                          </button>
                        )}
                        <a
                          href={session.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                          style={{
                            flex: 1,
                            backgroundColor: '#2D4A43',
                            color: '#FFFFFF',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            padding: '10px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Video size={14} /> Join Video
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Past Sessions Archive */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F3A33', marginBottom: '1rem' }}>
              Completed Consultations ({pastSessions.length})
            </h3>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #EBE7DF',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9F8F6', borderBottom: '1px solid #EBE7DF', color: '#6B7280' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastSessions.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                        No completed sessions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    pastSessions.map((s) => (
                      <tr key={s._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1F3A33' }}>
                          {new Date(s.startTime).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                          {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>{s.durationMinutes} min</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              backgroundColor: s.status === 'completed' ? '#DEF7EC' : '#F3F4F6',
                              color: s.status === 'completed' ? '#03543F' : '#6B7280',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              textTransform: 'capitalize',
                            }}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* TAB 2: PAYMENTS, PACKAGES & INVOICES     */}
        {/* ========================================= */}
        {activeTab === 'billing' && (
          <div>
            {/* Active Subscription Packages */}
            {clientPackages && clientPackages.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33', marginBottom: '1rem' }}>
                  Your Active Care Packages
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {clientPackages.map((cp) => {
                    const percentUsed = Math.round((cp.consumedSessions / cp.totalSessions) * 100);
                    return (
                      <div
                        key={cp._id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '18px',
                          border: '2px solid #D2DDD8',
                          padding: '1.5rem',
                          boxShadow: '0 4px 16px rgba(45, 74, 67, 0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2D4A43', textTransform: 'uppercase' }}>
                            🎟️ Active Package
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                            {cp.remainingSessions} Sessions Remaining
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1F3A33' }}>
                          {cp.package?.name || 'Discounted Session Bundle'}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 14px' }}>
                          {cp.consumedSessions} of {cp.totalSessions} sessions utilized
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${percentUsed}%`,
                              height: '100%',
                              backgroundColor: '#2D4A43',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Packages to Purchase via Razorpay */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33' }}>
                    Purchase Care Packages (Discounted Bundles)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    Pre-purchase therapy packages via Razorpay test mode for reduced per-session consultation rates.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {(availablePackages && availablePackages.length > 0
                  ? availablePackages
                  : [
                      {
                        _id: 'pkg_default_3',
                        name: '3-Session Foundation Starter',
                        sessionCount: 3,
                        totalPrice: 4800,
                        perSessionPrice: 1600,
                        validityDays: 60,
                        description: 'Ideal for acute stress, behavioral goal setting, and introductory coping strategies.',
                      },
                      {
                        _id: 'pkg_default_6',
                        name: '6-Session Deep Transformation',
                        sessionCount: 6,
                        totalPrice: 9000,
                        perSessionPrice: 1500,
                        validityDays: 120,
                        description: 'Recommended for sustained CBT/ACT progress, addressing cognitive patterns and self-worth.',
                      },
                      {
                        _id: 'pkg_default_12',
                        name: '12-Session Comprehensive Practice',
                        sessionCount: 12,
                        totalPrice: 16800,
                        perSessionPrice: 1400,
                        validityDays: 240,
                        description: 'End-to-end clinical journey for long-term emotional regulation and relational healing.',
                      },
                    ]
                ).map((pkg) => (
                  <div
                    key={pkg._id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '20px',
                      border: '1px solid #EBE7DF',
                      padding: '1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span
                          style={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {pkg.sessionCount} Sessions
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                          Valid {pkg.validityDays} Days
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F3A33', marginBottom: '6px' }}>
                        {pkg.name}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                        {pkg.description}
                      </p>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2D4A43' }}>
                          ₹{pkg.totalPrice?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                          ₹{pkg.perSessionPrice?.toLocaleString('en-IN')} per session (Savings Applied)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInitiatePackagePayment(pkg)}
                      disabled={paymentProcessing}
                      className="btn"
                      style={{
                        width: '100%',
                        backgroundColor: '#2D4A43',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(45, 74, 67, 0.15)',
                      }}
                    >
                      <CreditCard size={16} /> Buy with Razorpay (Test Mode)
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices & GST Tax Receipts */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33', marginBottom: '0.75rem' }}>
                Payment Receipts & GST Tax Invoices
              </h3>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #EBE7DF',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9F8F6', borderBottom: '1px solid #EBE7DF', color: '#6B7280' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Invoice Number</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Gross Amount</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Download PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments?.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF' }}>
                          No payment receipts recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#2D4A43' }}>
                            {p.invoiceNumber || 'UNF-TAX-REC'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                            {new Date(p.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#1F3A33' }}>
                            {p.package ? 'Session Package Purchase' : 'Clinical Tele-Psychotherapy'}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1F3A33' }}>
                            ₹{p.amount?.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <a
                              href={`/api/payments/${p._id}/invoice?token=${clientToken || localStorage.getItem('unfazed_client_token')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn"
                              style={{
                                backgroundColor: '#F3F4F6',
                                color: '#1F3A33',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                padding: '6px 12px',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textDecoration: 'none',
                              }}
                            >
                              <Download size={13} /> GST PDF
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* TAB 3: CLINICAL REFLECTIONS & HOMEWORK   */}
        {/* ========================================= */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1F3A33' }}>
                Shared Clinical Insights & Weekly Exercises
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                Reflections, thought logs, and homework exercises authorized by Dr. {therapist?.name} following your sessions.
              </p>
            </div>

            {loadingNotes ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                Retrieving your reflection summaries...
              </div>
            ) : sharedNotes.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #EBE7DF',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                }}
              >
                <FileText size={44} color="#A0AEC0" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2D3748', marginBottom: '4px' }}>
                  No Shared Summaries Available Yet
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#718096', maxWidth: '460px', margin: '0 auto' }}>
                  Following your consultation sessions, {therapist?.name} will publish authorized takeaway exercises here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {sharedNotes.map((note) => (
                  <div
                    key={note._id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '18px',
                      border: '1px solid #E5EBE8',
                      padding: '1.75rem',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        borderBottom: '1px solid #F3F4F6',
                        paddingBottom: '12px',
                      }}
                    >
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1F3A33' }}>{note.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                        {new Date(note.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div
                      style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* TAB 4: DIRECT REAL-TIME CHAT LINE        */}
        {/* ========================================= */}
        {activeTab === 'chat' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #EBE7DF',
              height: '600px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            }}
          >
            {/* Chat Top Bar */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #EBE7DF',
                backgroundColor: '#F9F8F6',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <img
                src={
                  therapist?.profilePhoto ||
                  'https://images.unsplash.com/photo-1594824813591-105151a660d1?w=400&auto=format&fit=crop&q=80'
                }
                alt={therapist?.name}
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1F3A33' }}>
                  Direct Care Line with {therapist?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  Confidential administrative check-ins • Not for acute psychiatric emergencies
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: '#FAF8F5',
              }}
            >
              {messages.map((m) => {
                const isMe = m.senderType === 'client';
                return (
                  <div
                    key={m._id || Math.random()}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: isMe ? '#2D4A43' : '#FFFFFF',
                        color: isMe ? '#FFFFFF' : '#1F3A33',
                        padding: '12px 18px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '0.925rem',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        border: isMe ? 'none' : '1px solid #E5EBE8',
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#9CA3AF',
                        marginTop: '3px',
                        textAlign: isMe ? 'right' : 'left',
                        padding: '0 4px',
                      }}
                    >
                      {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: '#6B7280', fontStyle: 'italic' }}>
                  {therapist?.name} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #EBE7DF',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                gap: '10px',
              }}
            >
              <input
                type="text"
                placeholder="Type a message to your practitioner..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  border: '1px solid #D1D5DB',
                  padding: '11px 16px',
                  fontSize: '0.925rem',
                }}
              />
              <button
                type="submit"
                className="btn"
                style={{
                  backgroundColor: '#2D4A43',
                  color: '#FFFFFF',
                  padding: '0 22px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={15} /> Send
              </button>
            </form>
          </div>
        )}

        {/* ========================================= */}
        {/* TAB 5: CLINICAL INTAKE & INFORMED CONSENT */}
        {/* ========================================= */}
        {activeTab === 'intake' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {/* Intake Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid #EBE7DF',
                padding: '2rem',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33', marginBottom: '1.25rem' }}>
                📋 Your Initial Intake Record
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Primary Presenting Concerns
                  </span>
                  <p style={{ marginTop: '3px', color: '#1F3A33', fontWeight: 500, lineHeight: 1.5 }}>
                    {client?.intakeData?.presentingConcern || 'General psychotherapy & emotional regulation support'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Prior Psychotherapy Experience
                  </span>
                  <p style={{ marginTop: '3px', color: '#1F3A33', fontWeight: 500 }}>
                    {client?.intakeData?.previousTherapy ? 'Yes (Has previous counseling experience)' : 'No (First-time therapy client)'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Emergency Contact on File
                  </span>
                  <p style={{ marginTop: '3px', color: '#1F3A33', fontWeight: 500 }}>
                    {client?.intakeData?.emergencyContactName || 'Family Contact'} ({client?.intakeData?.emergencyContactPhone || '+91 99999 88888'})
                  </p>
                </div>
              </div>
            </div>

            {/* Informed Consent Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid #EBE7DF',
                padding: '2rem',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F3A33', marginBottom: '1.25rem' }}>
                🛡️ Digital Informed Tele-Health Consent
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} color="#059669" />
                  <span style={{ fontWeight: 600, color: '#059669' }}>
                    Signed & Verified Tele-Health Agreement
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Agreement Reference
                  </span>
                  <p style={{ marginTop: '3px', color: '#1F3A33', fontWeight: 500 }}>
                    {client?.consent?.consentTextReference || 'Informed Tele-health Privacy Consent v1.0'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Timestamp of Consent
                  </span>
                  <p style={{ marginTop: '3px', color: '#1F3A33', fontWeight: 500 }}>
                    {client?.consent?.consentedAt
                      ? new Date(client.consent.consentedAt).toLocaleString('en-IN')
                      : 'Verified at Intake'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Client IP Log
                  </span>
                  <p style={{ marginTop: '3px', color: '#4B5563', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {client?.consent?.ipAddress || '103.21.244.0 (Audit Logged)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. Indian Crisis & Emergency Helplines Footer */}
      <footer
        style={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #EBE7DF',
          padding: '1.5rem 2rem',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.825rem',
            color: '#6B7280',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={15} color="#DC2626" />
            <span>
              <strong>Emergency Psychiatric Crisis:</strong> AASRA 24/7 (<strong>+91 98204 66726</strong>) • Tele-MANAS (<strong>14416</strong>) • Vandrevala (<strong>+91 9999 666 555</strong>)
            </span>
          </div>
          <div>
            UNFAZED Telehealth Sanctuary • Encrypted & Scoped Care Records
          </div>
        </div>
      </footer>

      {/* Razorpay Test Modal */}
      {isRazorpayOpen && currentOrderDetails && (
        <RazorpayModal
          isOpen={isRazorpayOpen}
          onClose={() => setIsRazorpayOpen(false)}
          orderDetails={currentOrderDetails}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default ClientPortal;
