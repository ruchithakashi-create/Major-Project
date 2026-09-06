import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  FileText,
  CreditCard,
  X,
  Shield,
  Clock,
  Phone,
  Mail,
  Tag,
} from 'lucide-react';
import API, { API_BASE_URL } from '../../services/api';
import TopNavbar from '../../components/TopNavbar';
import UpgradeModal from '../../components/UpgradeModal';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useToast } from '../../context/ToastContext';

const ClientsCRM = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, triggerUpgradePrompt, canUse, refreshEntitlements } = useEntitlement();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Client Detail Modal State
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('intake'); // intake, consent, sessions, notes, payments

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'prefer-not-to-say',
    tags: '',
    notesSummary: '',
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/clients?search=${search}&status=${statusFilter}`);
      if (res.data.success) {
        setClients(res.data.clients);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter]);

  // Load client from URL query param if present
  useEffect(() => {
    const clientIdParam = searchParams.get('id');
    if (clientIdParam) {
      openClientDetails({ _id: clientIdParam });
    }
  }, [searchParams]);

  const openClientDetails = async (client) => {
    setSelectedClient(client);
    try {
      setLoadingDetails(true);
      const res = await API.get(`/clients/${client._id}`);
      if (res.data.success) {
        setClientDetails(res.data);
      }
    } catch (err) {
      addToast('Failed to load client details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddClientClick = () => {
    // Entitlement Check
    if (!canUse('create_client')) {
      triggerUpgradePrompt('Active Client Limit (Starter plan capped at 10 active clients)');
      return;
    }
    setShowAddModal(true);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newClient,
        tags: newClient.tags ? newClient.tags.split(',').map((t) => t.trim()) : [],
      };
      const res = await API.post('/clients', payload);
      if (res.data.success) {
        addToast('Client created successfully', 'success');
        setShowAddModal(false);
        setNewClient({ name: '', email: '', phone: '', gender: 'prefer-not-to-say', tags: '', notesSummary: '' });
        fetchClients();
        refreshEntitlements();
      }
    } catch (err) {
      if (err.response?.data?.entitlementBlocked) {
        setShowAddModal(false);
        triggerUpgradePrompt(err.response.data.message);
      } else {
        addToast(err.response?.data?.message || 'Failed to create client', 'error');
      }
    }
  };

  return (
    <div className="main-content">
      <TopNavbar
        title="Client CRM & Intake"
        subtitle="End-to-end caseload management, intake data, and auditable consent"
        onOpenUpgrade={() => triggerUpgradePrompt('Active Client Limit')}
      />

      <div className="page-wrapper">
        {/* Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '500px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '12px', left: '12px' }} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '130px' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="lead">Lead</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <button onClick={handleAddClientClick} className="btn btn-primary">
            <Plus size={16} /> Add New Client
          </button>
        </div>

        {/* Clients Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Total Sessions</th>
                <th>Last Session</th>
                <th>Consent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading caseload...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No clients found matching your query.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client._id} onClick={() => openClientDetails(client)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{client.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{client.email}</div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          client.status === 'active'
                            ? 'badge-success'
                            : client.status === 'lead'
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {client.tags?.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.72rem',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{client.totalSessions || 0}</td>
                    <td>
                      {client.lastSessionDate
                        ? new Date(client.lastSessionDate).toLocaleDateString('en-IN')
                        : 'None yet'}
                    </td>
                    <td>
                      {client.consent?.hasConsented ? (
                        <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Shield size={12} /> Consented
                        </span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openClientDetails(client);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Profile Modal Drawer */}
      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-card" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {clientDetails?.client?.name || selectedClient.name}
                </h3>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                  <span>{clientDetails?.client?.email || selectedClient.email}</span>
                  <span>{clientDetails?.client?.phone || selectedClient.phone || 'No phone'}</span>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: '#fafbfc', padding: '0 1.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('intake')}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderBottom: activeTab === 'intake' ? '2px solid var(--primary)' : 'none',
                  color: activeTab === 'intake' ? 'var(--primary)' : 'var(--text-secondary)',
                  background: 'none',
                }}
              >
                Intake Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('consent')}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderBottom: activeTab === 'consent' ? '2px solid var(--primary)' : 'none',
                  color: activeTab === 'consent' ? 'var(--primary)' : 'var(--text-secondary)',
                  background: 'none',
                }}
              >
                Consent Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderBottom: activeTab === 'sessions' ? '2px solid var(--primary)' : 'none',
                  color: activeTab === 'sessions' ? 'var(--primary)' : 'var(--text-secondary)',
                  background: 'none',
                }}
              >
                Sessions ({clientDetails?.sessions?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderBottom: activeTab === 'notes' ? '2px solid var(--primary)' : 'none',
                  color: activeTab === 'notes' ? 'var(--primary)' : 'var(--text-secondary)',
                  background: 'none',
                }}
              >
                Clinical Notes ({clientDetails?.notes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderBottom: activeTab === 'payments' ? '2px solid var(--primary)' : 'none',
                  color: activeTab === 'payments' ? 'var(--primary)' : 'var(--text-secondary)',
                  background: 'none',
                }}
              >
                Invoices & Payments
              </button>
            </div>

            <div className="modal-body">
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading client details...
                </div>
              ) : (
                <>
                  {/* Tab 1: Intake */}
                  {activeTab === 'intake' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="card" style={{ padding: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Presenting Concern</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {clientDetails?.client?.intakeData?.presentingConcern || 'No intake concern submitted yet.'}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Therapist Clinical Summary</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {clientDetails?.client?.notesSummary || 'No initial summary logged.'}
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Previous Therapy Experience</span>
                          <div style={{ fontWeight: 600, marginTop: '2px' }}>
                            {clientDetails?.client?.intakeData?.previousTherapy ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <div className="card" style={{ padding: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact</span>
                          <div style={{ fontWeight: 600, marginTop: '2px' }}>
                            {clientDetails?.client?.intakeData?.emergencyContactName || 'None listed'} (
                            {clientDetails?.client?.intakeData?.emergencyContactPhone || 'N/A'})
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Consent Audit */}
                  {activeTab === 'consent' && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                        <Shield size={24} color="var(--primary)" />
                        <h4 style={{ fontSize: '1.1rem' }}>Informed Consent & Tele-health Agreement</h4>
                      </div>

                      <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <strong>Agreement Reference:</strong>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {clientDetails?.client?.consent?.consentTextReference || 'Standard Tele-health Informed Consent v1.0'}
                          </span>
                        </div>
                        <div>
                          <strong>Consent Status:</strong>{' '}
                          {clientDetails?.client?.consent?.hasConsented ? (
                            <span className="badge badge-success">Agreed & Formally Verified</span>
                          ) : (
                            <span className="badge badge-warning">Pending Acknowledgement</span>
                          )}
                        </div>
                        <div>
                          <strong>Timestamp:</strong>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {clientDetails?.client?.consent?.consentedAt
                              ? new Date(clientDetails.client.consent.consentedAt).toLocaleString('en-IN')
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <strong>Logged IP Address:</strong>{' '}
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {clientDetails?.client?.consent?.ipAddress || '127.0.0.1 (Local Session)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Sessions */}
                  {activeTab === 'sessions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {clientDetails?.sessions?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No sessions recorded for this client.
                        </div>
                      ) : (
                        clientDetails.sessions.map((s) => (
                          <div
                            key={s._id}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#f8fafc',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                {new Date(s.startTime).toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {s.durationMinutes} Minutes • ₹{s.price}
                              </div>
                            </div>
                            <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-neutral'}`}>
                              {s.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 4: Notes */}
                  {activeTab === 'notes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {clientDetails?.notes?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No clinical notes written for this client yet.
                        </div>
                      ) : (
                        clientDetails.notes.map((n) => (
                          <div
                            key={n._id}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: 'white',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{n.title}</span>
                              <span className={`badge ${n.type === 'private' ? 'badge-danger' : 'badge-info'}`}>
                                {n.type === 'private' ? 'Confidential Private' : 'Shared with Client'}
                              </span>
                            </div>
                            <div
                              style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                              dangerouslySetInnerHTML={{ __html: n.content }}
                            />
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                              {new Date(n.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 5: Payments */}
                  {activeTab === 'payments' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {clientDetails?.payments?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No payment receipts found.
                        </div>
                      ) : (
                        clientDetails.payments.map((p) => (
                          <div
                            key={p._id}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#f8fafc',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>₹{p.amount}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Invoice: {p.invoiceNumber} • {new Date(p.createdAt).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                            <a
                              href={`${API_BASE_URL}/payments/${p._id}/invoice?token=${localStorage.getItem('unfazed_token')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              Download GST PDF
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Client</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateClient}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Nair"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@example.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 97400 55667"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Clinical Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Anxiety, CBT, Executive Functioning"
                    value={newClient.tags}
                    onChange={(e) => setNewClient({ ...newClient, tags: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Case Summary & Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Initial clinical context..."
                    value={newClient.notesSummary}
                    onChange={(e) => setNewClient({ ...newClient, notesSummary: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        blockedFeature={upgradeFeature}
        onUpgraded={fetchClients}
      />
    </div>
  );
};

export default ClientsCRM;
