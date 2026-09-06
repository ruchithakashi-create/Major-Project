import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
} from 'lucide-react';
import API from '../../services/api';
import TopNavbar from '../../components/TopNavbar';
import UpgradeModal from '../../components/UpgradeModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useEntitlement } from '../../hooks/useEntitlement';

const SettingsView = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, triggerUpgradePrompt } = useEntitlement();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    slug: '',
    bio: '',
    profilePhoto: '',
    sessionPrice: 1500,
    experienceYears: 5,
    specializations: '',
    languages: '',
    cancellationPolicy: '',
    registrationNumber: '',
  });

  const [slugStatus, setSlugStatus] = useState({ checking: false, available: true, message: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        title: user.title || 'Licensed Clinical Psychologist',
        slug: user.slug || '',
        bio: user.bio || '',
        profilePhoto: user.profilePhoto || '',
        sessionPrice: user.sessionPrice || 1500,
        experienceYears: user.experienceYears || 5,
        specializations: user.specializations?.join(', ') || '',
        languages: user.languages?.join(', ') || '',
        cancellationPolicy: user.cancellationPolicy || '',
        registrationNumber: user.registrationNumber || '',
      });
    }
  }, [user]);

  // Check slug availability on blur
  const checkSlug = async () => {
    if (!formData.slug || formData.slug === user?.slug) {
      setSlugStatus({ checking: false, available: true, message: '' });
      return;
    }
    try {
      setSlugStatus({ checking: true, available: false, message: 'Checking...' });
      const res = await API.get(`/therapists/check-slug/${formData.slug}`);
      setSlugStatus({
        checking: false,
        available: res.data.available,
        message: res.data.message,
      });
    } catch (err) {
      setSlugStatus({ checking: false, available: false, message: 'Could not check slug' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        specializations: formData.specializations
          ? formData.specializations.split(',').map((s) => s.trim())
          : [],
        languages: formData.languages
          ? formData.languages.split(',').map((l) => l.trim())
          : [],
      };

      const res = await API.put('/therapists/profile', payload);
      if (res.data.success) {
        updateUser(res.data.therapist);
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-content">
      <TopNavbar
        title="Practice Settings & Public Profile"
        subtitle="Manage your branded public link, clinical credentials, and fee structure"
        onOpenUpgrade={() => triggerUpgradePrompt('Custom Practice Branding')}
      />

      <div className="page-wrapper" style={{ maxWidth: '840px' }}>
        <form onSubmit={handleSubmit}>
          {/* Branded Link Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <LinkIcon size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem' }}>Branded Link & Web Address</h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Your Unique Practice Slug *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>unfazed.in/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onBlur={checkSlug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  style={{ flex: 1 }}
                />
              </div>
              {slugStatus.message && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    marginTop: '6px',
                    color: slugStatus.available ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {slugStatus.available ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {slugStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Practitioner Information Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Clinical Profile & Credentials</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Full Professional Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Professional Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Consultation Fee (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.sessionPrice}
                    onChange={(e) => setFormData({ ...formData, sessionPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    RCI / Medical Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RCI-CRR/2022/49102"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Profile Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.profilePhoto}
                  onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Professional Bio
                </label>
                <textarea
                  rows="3"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Specializations (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Anxiety, CBT, Trauma & PTSD, Couples Counseling"
                  value={formData.specializations}
                  onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Languages Spoken (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="English, Hindi, Kannada"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Cancellation & Rescheduling Terms
                </label>
                <textarea
                  rows="2"
                  value={formData.cancellationPolicy}
                  onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Current Subscription Plan Card */}
          <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#fafbfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                  {user?.subscriptionTier || 'Starter'} Plan Active
                </span>
                <h4 style={{ fontSize: '1.1rem', marginTop: '6px' }}>Practice SaaS Subscription</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Manage tier limits, multi-session packages, and advanced clinical reporting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => triggerUpgradePrompt('Subscription Tiers')}
                className="btn btn-primary btn-sm"
              >
                <Sparkles size={14} /> Change Plan
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} /> {saving ? 'Saving Profile...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        blockedFeature={upgradeFeature}
      />
    </div>
  );
};

export default SettingsView;
