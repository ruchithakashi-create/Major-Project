import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Shield,
  Eye,
  Share2,
  Lock,
  Search,
  X,
  Sparkles,
  Trash2,
} from 'lucide-react';
import API from '../../services/api';
import TopNavbar from '../../components/TopNavbar';
import TipTapEditor from '../../components/TipTapEditor';
import UpgradeModal from '../../components/UpgradeModal';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useToast } from '../../context/ToastContext';

const SOAP_TEMPLATE_CONTENT = `
<h3>Subjective (S)</h3>
<p>Client reports experiencing recurrent tension headaches and difficulty concentrating during work sprints. Sleep disturbance noted (waking at 3:30 AM).</p>

<h3>Objective (O)</h3>
<p>Affect congruent with stated anxiety. Eye contact maintained. Cooperative and engaged during thought challenging exercises.</p>

<h3>Assessment (A)</h3>
<p>Generalized performance anxiety triggered by imminent project deadlines. Automatic catastrophic thought patterns identified.</p>

<h3>Plan (P)</h3>
<ul>
  <li>Daily 5-minute boxed breathing exercise.</li>
  <li>Thought record logging: Identify 2 instances of dichotomous thinking.</li>
  <li>Follow-up session scheduled for next week.</li>
</ul>
`;

const DAP_TEMPLATE_CONTENT = `
<h3>Data (D)</h3>
<p>Reviewed progress on mindfulness homework. Client completed 4 out of 7 guided meditation logs.</p>

<h3>Assessment (A)</h3>
<p>Demonstrating improved cognitive defusion when noticing anxious urges.</p>

<h3>Plan (P)</h3>
<p>Continue values-clarification journaling; address fear of interpersonal confrontation next session.</p>
`;

const ClinicalNotes = () => {
  const { addToast } = useToast();
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, triggerUpgradePrompt, canUse } = useEntitlement();

  const [notes, setNotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    type: 'private',
    templateType: 'standard',
    content: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notesRes, clientsRes] = await Promise.all([
        API.get(`/notes?type=${typeFilter}`),
        API.get('/clients?limit=100'),
      ]);

      if (notesRes.data.success) {
        setNotes(notesRes.data.notes);
      }
      if (clientsRes.data.success) {
        setClients(clientsRes.data.clients);
      }
    } catch (err) {
      console.error('Failed to load clinical notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormData({
      clientId: clients[0]?._id || '',
      title: 'Session Note',
      type: 'private',
      templateType: 'standard',
      content: '<p>Session observations and clinical insights...</p>',
    });
    setShowModal(true);
  };

  const handleTemplateChange = (template) => {
    if (template === 'soap' || template === 'dap') {
      if (!canUse('soap_notes')) {
        triggerUpgradePrompt(`Structured ${template.toUpperCase()} Clinical Templates`);
        return;
      }
      setFormData((prev) => ({
        ...prev,
        templateType: template,
        content: template === 'soap' ? SOAP_TEMPLATE_CONTENT : DAP_TEMPLATE_CONTENT,
        title: `${template.toUpperCase()} Clinical Assessment`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        templateType: 'standard',
      }));
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      addToast('Please select a client', 'error');
      return;
    }

    try {
      if (editingNote) {
        await API.put(`/notes/${editingNote._id}`, formData);
        addToast('Note updated successfully', 'success');
      } else {
        await API.post('/notes', formData);
        addToast('Clinical note created successfully', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      if (err.response?.data?.entitlementBlocked) {
        setShowModal(false);
        triggerUpgradePrompt(err.response.data.message);
      } else {
        addToast(err.response?.data?.message || 'Failed to save note', 'error');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this clinical note?')) return;
    try {
      await API.delete(`/notes/${id}`);
      addToast('Note deleted', 'info');
      fetchData();
    } catch (err) {
      addToast('Failed to delete note', 'error');
    }
  };

  return (
    <div className="main-content">
      <TopNavbar
        title="Clinical Documentation"
        subtitle="Confidential psychotherapy notes, structured SOAP/DAP templates, and shared client summaries"
        onOpenUpgrade={() => triggerUpgradePrompt('SOAP & DAP Structured Note Templates')}
      />

      <div className="page-wrapper">
        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setTypeFilter('all')}
              className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Notes
            </button>
            <button
              onClick={() => setTypeFilter('private')}
              className={`btn btn-sm ${typeFilter === 'private' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Lock size={14} /> Confidential (Private)
            </button>
            <button
              onClick={() => setTypeFilter('shared')}
              className={`btn btn-sm ${typeFilter === 'shared' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Share2 size={14} /> Shared with Client
            </button>
          </div>

          <button onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={16} /> New Clinical Note
          </button>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading documentation records...
          </div>
        ) : notes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3>No Clinical Notes Found</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>
              Create your first confidential session note or client takeaway.
            </p>
            <button onClick={handleOpenCreate} className="btn btn-primary">
              <Plus size={16} /> Write First Note
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {notes.map((note) => (
              <div key={note._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{note.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                      Client: {note.client?.name}
                    </div>
                  </div>
                  <span
                    className={`badge ${note.type === 'private' ? 'badge-danger' : 'badge-info'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {note.type === 'private' ? <Lock size={12} /> : <Share2 size={12} />}
                    {note.type === 'private' ? 'Private' : 'Shared'}
                  </span>
                </div>

                {note.templateType !== 'standard' && (
                  <span
                    className="badge badge-neutral"
                    style={{ alignSelf: 'flex-start', marginBottom: '8px', textTransform: 'uppercase' }}
                  >
                    {note.templateType} Template
                  </span>
                )}

                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    flex: 1,
                    overflow: 'hidden',
                    maxHeight: '120px',
                    position: 'relative',
                    marginBottom: '1rem',
                  }}
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(note.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setEditingNote(note);
                        setFormData({
                          clientId: note.client?._id,
                          title: note.title,
                          type: note.type,
                          templateType: note.templateType,
                          content: note.content,
                        });
                        setShowModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit Note
                    </button>
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Note Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingNote ? 'Edit Clinical Documentation' : 'New Clinical Documentation'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Associated Client *
                    </label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      required
                    >
                      <option value="">Select a client...</option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Documentation Visibility *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="private">🔒 Strictly Confidential (Private to Therapist)</option>
                      <option value="shared">📢 Shared Summary (Visible to Client in Portal)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Note Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Template Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Clinical Note Format & Template
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('standard')}
                      className={`btn btn-sm ${formData.templateType === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Standard Free-form
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('soap')}
                      className={`btn btn-sm ${formData.templateType === 'soap' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      <Sparkles size={14} /> SOAP Format
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('dap')}
                      className={`btn btn-sm ${formData.templateType === 'dap' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      <Sparkles size={14} /> DAP Format
                    </button>
                  </div>
                </div>

                {/* Rich TipTap Editor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Clinical Observations & Notes
                  </label>
                  <TipTapEditor
                    content={formData.content}
                    onChange={(newHtml) => setFormData((prev) => ({ ...prev, content: newHtml }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Clinical Note
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
        onUpgraded={fetchData}
      />
    </div>
  );
};

export default ClinicalNotes;
