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
  ArrowRight,
} from 'lucide-react';
import API from '../../services/api';
import { io } from 'socket.io-client';
import { useToast } from '../../context/ToastContext';

const ClientPortal = () => {
  const { addToast } = useToast();

  const [clientToken, setClientToken] = useState(localStorage.getItem('unfazed_client_token'));
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSlug, setLoginSlug] = useState('dr-ananya-sharma');
  const [loggingIn, setLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'notes' | 'chat' | 'invoices'

  // Shared Notes
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Real-time Chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/clients/portal/me');
      if (res.data.success) {
        setClientData(res.data);
      }
    } catch (err) {
      console.error('Portal session error:', err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedNotes = async () => {
    try {
      setLoadingNotes(true);
      const res = await API.get('/notes/client-view');
      if (res.data.success) {
        setSharedNotes(res.data.notes);
      }
    } catch (err) {
      console.error('Failed to load shared notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await API.get('/communication/client-messages');
      if (res.data.success) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    if (clientToken) {
      fetchPortalData();
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

  // Setup Socket for Chat
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

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      const res = await API.post('/auth/client-login', {
        email: loginEmail,
        slug: loginSlug,
      });
      if (res.data.success) {
        localStorage.setItem('unfazed_client_token', res.data.token);
        setClientToken(res.data.token);
        addToast(`Welcome to your client portal, ${res.data.client.name}!`, 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Client account not found', 'error');
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
      if (res.data.success) {
        localStorage.setItem('unfazed_client_token', res.data.token);
        setClientToken(res.data.token);
        addToast(`Logged in as ${res.data.client.name}`, 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Client login failed', 'error');
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

  // If not logged in, render client portal sign in
  if (!clientToken || (!clientData && !loading)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #042f2e 0%, #0d9488 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '2.5rem',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                margin: '0 auto 12px',
              }}
            >
              <Sparkles size={24} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Client Sanctuary Portal</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Access your appointments, shared notes, and therapist messages
            </p>
          </div>

          {/* Quick Demo Helper */}
          <div
            style={{
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '6px' }}>
              ⚡ Instant Client Demo
            </div>
            <button
              type="button"
              onClick={() => handleDemoClientLogin('aditi@example.com', 'dr-ananya-sharma')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>Login as Aditi Rao (with Dr. Ananya)</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Your Registered Email *
              </label>
              <input
                type="email"
                required
                placeholder="aditi@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Therapist Practice Slug *
              </label>
              <input
                type="text"
                required
                placeholder="dr-ananya-sharma"
                value={loginSlug}
                onChange={(e) => setLoginSlug(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '12px' }}
            >
              {loggingIn ? 'Entering Portal...' : 'Access My Sanctuary'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <Link to="/login" style={{ color: 'var(--text-muted)' }}>
              Are you a therapist? Login to practice dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--primary)' }}>Opening Your Portal...</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Connecting to your care record</div>
        </div>
      </div>
    );
  }

  const { client, therapist, sessions, payments } = clientData || {};
  const upcomingSessions = sessions?.filter((s) => s.status === 'confirmed') || [];
  const pastSessions = sessions?.filter((s) => s.status === 'completed' || s.status === 'cancelled') || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Client Portal Header */}
      <header
        style={{
          backgroundColor: '#092c28',
          color: 'white',
          padding: '1.25rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>Client Portal</div>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>
              Practitioner: {therapist?.name} ({therapist?.title})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>Hello, {client?.name}</span>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'white', border: 'none' }}
          >
            <LogOut size={14} /> Exit Portal
          </button>
        </div>
      </header>

      {/* Portal Tabs Bar */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border)', padding: '0 2.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('sessions')}
            style={{
              padding: '14px 18px',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderBottom: activeTab === 'sessions' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'sessions' ? 'var(--primary)' : 'var(--text-secondary)',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calendar size={16} /> Appointments
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '14px 18px',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderBottom: activeTab === 'notes' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'notes' ? 'var(--primary)' : 'var(--text-secondary)',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} /> Shared Insights & Homework
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '14px 18px',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderBottom: activeTab === 'chat' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-secondary)',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MessageSquare size={16} /> Real-Time Chat
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '14px 18px',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderBottom: activeTab === 'invoices' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--text-secondary)',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CreditCard size={16} /> Invoices & GST Receipts
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="page-wrapper" style={{ maxWidth: '1200px' }}>
        {/* Tab 1: Appointments */}
        {activeTab === 'sessions' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Upcoming Video Appointments</h3>
            {upcomingSessions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', marginBottom: '2rem' }}>
                <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>You have no upcoming sessions booked.</p>
                <a
                  href={`/${therapist?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '1rem' }}
                >
                  Book Next Session with {therapist?.name}
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {upcomingSessions.map((session) => (
                  <div
                    key={session._id}
                    className="card"
                    style={{ border: '2px solid #ccfbf1', background: '#f0fdfa' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="badge badge-success">Confirmed Slot</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {session.durationMinutes} Minutes
                      </span>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {new Date(session.startTime).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1.25rem' }}>
                      {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      <Video size={16} /> Enter Video Room
                    </a>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Past Sessions</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastSessions.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No past sessions recorded.
                      </td>
                    </tr>
                  ) : (
                    pastSessions.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>
                          {new Date(s.startTime).toLocaleDateString('en-IN')}
                        </td>
                        <td>{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{s.durationMinutes} min</td>
                        <td>
                          <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-neutral'}`}>
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

        {/* Tab 2: Shared Notes & Takeaways */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Shared Clinical Insights & Weekly Exercises</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                These summaries and homework reflections have been authorized and shared specifically with you by {therapist?.name}.
              </p>
            </div>

            {loadingNotes ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading shared summaries...
              </div>
            ) : sharedNotes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>No shared summaries posted yet.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Following your consultation, Dr. {therapist?.name} will publish your reflection points here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {sharedNotes.map((note) => (
                  <div key={note._id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{note.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(note.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div
                      style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Real-Time Chat */}
        {activeTab === 'chat' && (
          <div className="card" style={{ height: '580px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={20} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Direct Care Line with {therapist?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  End-to-end encrypted messaging for administrative and non-emergency check-ins
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        backgroundColor: isMe ? 'var(--primary)' : '#f1f5f9',
                        color: isMe ? 'white' : 'var(--text-primary)',
                        padding: '10px 16px',
                        borderRadius: '16px',
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
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
                <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {therapist?.name} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Type a message to your therapist..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">
                <Send size={16} /> Send
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Invoices */}
        {activeTab === 'invoices' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Payment Receipts & GST Invoices</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount Paid</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {payments?.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No invoices recorded.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.invoiceNumber}</td>
                        <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>Tele-psychotherapy Consultation</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{p.amount}</td>
                        <td>
                          <a
                            href={`/api/payments/${p._id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={14} /> GST PDF
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPortal;
