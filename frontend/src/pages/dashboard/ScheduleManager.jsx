import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import API from '../../services/api';
import TopNavbar from '../../components/TopNavbar';
import { useToast } from '../../context/ToastContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleManager = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'availability'
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Availability Settings
  const [availability, setAvailability] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await API.get(`/scheduling/sessions?status=${statusFilter}`);
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await API.get('/scheduling/availability');
      if (res.data.success) {
        setAvailability(res.data.availability);
      }
    } catch (err) {
      console.error('Failed to load availability:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const handleUpdateStatus = async (sessionId, status) => {
    try {
      const res = await API.put(`/scheduling/sessions/${sessionId}/status`, { status });
      if (res.data.success) {
        addToast(`Session marked as ${status}`, 'success');
        fetchSessions();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update session status', 'error');
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSavingSettings(true);
      const res = await API.put('/scheduling/availability', availability);
      if (res.data.success) {
        addToast('Availability schedule updated successfully!', 'success');
      }
    } catch (err) {
      addToast('Failed to save availability settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleDay = (dayIndex) => {
    const updated = { ...availability };
    let day = updated.weeklySchedule.find((s) => s.dayOfWeek === dayIndex);
    if (day) {
      day.isEnabled = !day.isEnabled;
    } else {
      updated.weeklySchedule.push({
        dayOfWeek: dayIndex,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: true,
      });
    }
    setAvailability(updated);
  };

  const updateDayTime = (dayIndex, field, value) => {
    const updated = { ...availability };
    let day = updated.weeklySchedule.find((s) => s.dayOfWeek === dayIndex);
    if (day) {
      day[field] = value;
      setAvailability(updated);
    }
  };

  return (
    <div className="main-content">
      <TopNavbar
        title="Schedule & Appointments"
        subtitle="Manage appointment lifecycles and recurring weekly availability"
      />

      <div className="page-wrapper">
        {/* Sub-navigation tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`btn ${activeTab === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <CalendarIcon size={16} /> Appointments List
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`btn ${activeTab === 'availability' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Settings size={16} /> Weekly Availability Rules
          </button>
        </div>

        {activeTab === 'sessions' ? (
          /* Sessions View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="all">All Appointments</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No-Show</option>
              </select>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Client</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Meeting Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSessions ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading appointments...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No appointments found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(session.startTime).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{session.client?.name || 'Client'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{session.client?.phone || session.client?.email}</div>
                        </td>
                        <td>{session.durationMinutes} min</td>
                        <td>
                          <span
                            className={`badge ${
                              session.status === 'confirmed'
                                ? 'badge-success'
                                : session.status === 'completed'
                                ? 'badge-info'
                                : session.status === 'cancelled'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {session.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${session.paymentStatus === 'paid' ? 'badge-success' : 'badge-neutral'}`}>
                            {session.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Video size={14} /> Join
                          </a>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {session.status === 'confirmed' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(session._id, 'completed')}
                                  className="btn btn-secondary btn-sm"
                                  title="Mark Completed"
                                >
                                  <CheckCircle2 size={14} color="var(--success)" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(session._id, 'no-show')}
                                  className="btn btn-secondary btn-sm"
                                  title="Mark No-Show"
                                >
                                  <AlertTriangle size={14} color="var(--warning)" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(session._id, 'cancelled')}
                                  className="btn btn-secondary btn-sm"
                                  title="Cancel Session"
                                >
                                  <XCircle size={14} color="var(--danger)" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Availability Configuration View */
          availability && (
            <div style={{ maxWidth: '800px' }}>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>General Session Parameters</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Standard Slot Duration
                    </label>
                    <select
                      value={availability.slotDurationMinutes}
                      onChange={(e) => setAvailability({ ...availability, slotDurationMinutes: Number(e.target.value) })}
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={50}>50 Minutes (Standard)</option>
                      <option value={60}>60 Minutes</option>
                      <option value={90}>90 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Buffer Time Between Sessions
                    </label>
                    <select
                      value={availability.bufferMinutes}
                      onChange={(e) => setAvailability({ ...availability, bufferMinutes: Number(e.target.value) })}
                    >
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes (Recommended)</option>
                      <option value={15}>15 Minutes</option>
                      <option value={20}>20 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Minimum Advance Notice (Hours)
                    </label>
                    <input
                      type="number"
                      value={availability.advanceNoticeHours || 2}
                      onChange={(e) => setAvailability({ ...availability, advanceNoticeHours: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Schedule Days */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Weekly Recurring Hours</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                    const dayConfig = availability.weeklySchedule.find((s) => s.dayOfWeek === dayIdx) || {
                      isEnabled: false,
                      startTime: '09:00',
                      endTime: '17:00',
                    };

                    return (
                      <div
                        key={dayIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: dayConfig.isEnabled ? '#f0fdfa' : '#f8fafc',
                          border: dayConfig.isEnabled ? '1px solid #ccfbf1' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '140px' }}>
                          <input
                            type="checkbox"
                            checked={dayConfig.isEnabled}
                            onChange={() => toggleDay(dayIdx)}
                            style={{ width: 'auto' }}
                          />
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{DAYS[dayIdx]}</span>
                        </div>

                        {dayConfig.isEnabled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="time"
                              value={dayConfig.startTime}
                              onChange={(e) => updateDayTime(dayIdx, 'startTime', e.target.value)}
                              style={{ width: '130px' }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>to</span>
                            <input
                              type="time"
                              value={dayConfig.endTime}
                              onChange={(e) => updateDayTime(dayIdx, 'endTime', e.target.value)}
                              style={{ width: '130px' }}
                            />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unavailable / Off</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveAvailability}
                disabled={savingSettings}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Save size={16} /> {savingSettings ? 'Saving Changes...' : 'Save Availability'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ScheduleManager;
