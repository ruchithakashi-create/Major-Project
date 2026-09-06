import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Users,
  Calendar,
  Clock,
  Video,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useEntitlement } from '../../hooks/useEntitlement';
import TopNavbar from '../../components/TopNavbar';
import UpgradeModal from '../../components/UpgradeModal';

const DashboardOverview = () => {
  const { user } = useAuth();
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, triggerUpgradePrompt } = useEntitlement();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, sessionsRes] = await Promise.all([
        API.get('/analytics'),
        API.get('/scheduling/sessions?status=confirmed'),
      ]);

      if (analyticsRes.data.success) {
        setStats(analyticsRes.data);
      }
      if (sessionsRes.data.success) {
        setUpcomingSessions(sessionsRes.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const nextSession = upcomingSessions[0];

  return (
    <div className="main-content">
      <TopNavbar
        title="Practice Dashboard"
        subtitle={`Welcome back, ${user?.name}`}
        onOpenUpgrade={() => triggerUpgradePrompt('General Practice Capabilities')}
      />

      <div className="page-wrapper">
        {/* Next Scheduled Appointment Quick Banner */}
        {nextSession && (
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              color: 'white',
              marginBottom: '2rem',
              border: 'none',
              padding: '1.5rem 2rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
            }}
          >
            <div>
              <span
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Up Next Today
              </span>
              <h2 style={{ fontSize: '1.5rem', color: 'white', marginTop: '6px' }}>
                Consultation with {nextSession.client?.name}
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#ccfbf1', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Clock size={16} /> {new Date(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                {nextSession.durationMinutes} Minutes • {nextSession.client?.phone || 'Online'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={nextSession.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{
                  backgroundColor: 'white',
                  color: 'var(--primary-dark)',
                  padding: '10px 18px',
                  fontWeight: 700,
                }}
              >
                <Video size={16} /> Enter Video Consultation
              </a>
              <Link
                to={`/dashboard/clients?id=${nextSession.client?._id}`}
                className="btn btn-sm"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                View Intake & Notes
              </Link>
            </div>
          </div>
        )}

        {/* 4 Core Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Revenue */}
          <div className="stat-card">
            <div>
              <div className="stat-label">Total Revenue Collected</div>
              <div className="stat-value">₹{stats?.overview?.totalRevenue?.toLocaleString('en-IN') || '0'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Net: ₹{stats?.overview?.netRevenue?.toLocaleString('en-IN') || '0'} (after gateway)
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}>
              <IndianRupee size={26} />
            </div>
          </div>

          {/* Active Clients */}
          <div className="stat-card">
            <div>
              <div className="stat-label">Active Clients</div>
              <div className="stat-value">{stats?.overview?.activeClients ?? 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats?.overview?.totalClients ?? 0} Total Caseload Recorded
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
              <Users size={26} />
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="stat-card">
            <div>
              <div className="stat-label">Upcoming Sessions</div>
              <div className="stat-value">{stats?.overview?.upcomingSessions ?? 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Confirmed & Pending Schedule
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              <Calendar size={26} />
            </div>
          </div>

          {/* No-Show Rate */}
          <div className="stat-card">
            <div>
              <div className="stat-label">Client Attendance Rate</div>
              <div className="stat-value">{100 - (stats?.overview?.noShowRate || 0)}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                No-Show Rate: {stats?.overview?.noShowRate ?? 0}%
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
              <TrendingUp size={26} />
            </div>
          </div>
        </div>

        {/* Split Grid: Upcoming Appointments & Practice Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Upcoming Appointments */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Upcoming Appointments</h3>
              <Link to="/dashboard/schedule" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Manage Calendar →
              </Link>
            </div>

            {upcomingSessions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No upcoming sessions confirmed. Share your branded link to receive client bookings!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingSessions.slice(0, 5).map((session) => (
                  <div
                    key={session._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{session.client?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(session.startTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                        at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-success">Confirmed</span>
                      <a
                        href={session.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Join Meeting"
                      >
                        <Video size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Tips */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Practice Management Hub</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to="/dashboard/clients"
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--text-primary)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Review Client Intake & Consent</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Search and review presenting concerns & history</div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </Link>

              <Link
                to="/dashboard/notes"
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--text-primary)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Clinical Documentation</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create confidential SOAP notes or shared takeaways</div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </Link>

              <Link
                to="/dashboard/payments"
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--text-primary)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Billing & GST Invoices</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate and download client tax receipts</div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        blockedFeature={upgradeFeature}
        onUpgraded={fetchData}
      />
    </div>
  );
};

export default DashboardOverview;
