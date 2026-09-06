import React, { useState } from 'react';
import { X, Check, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const UpgradeModal = ({ isOpen, onClose, blockedFeature, onUpgraded }) => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (targetTier) => {
    try {
      setUpgrading(true);
      const res = await API.post('/subscriptions/upgrade', { targetTier });
      if (res.data.success) {
        updateUser({ ...user, subscriptionTier: targetTier });
        addToast(`Upgraded to ${res.data.tier.name}!`, 'success');
        if (onUpgraded) onUpgraded();
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Upgrade failed', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="var(--accent)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Upgrade Your Practice Tier</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {blockedFeature && (
            <div
              style={{
                backgroundColor: 'var(--warning-light)',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#92400e',
              }}
            >
              <strong>Feature Gated:</strong> {blockedFeature}. Upgrade to an advanced tier to unlock higher capacities and clinical templates.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Starter Tier */}
            <div
              className="card"
              style={{
                border: user?.subscriptionTier === 'starter' ? '2px solid var(--primary)' : '1px solid var(--border)',
                position: 'relative',
              }}
            >
              {user?.subscriptionTier === 'starter' && (
                <span className="badge badge-info" style={{ position: 'absolute', top: '-10px', right: '16px' }}>
                  Current Plan
                </span>
              )}
              <h3 style={{ fontSize: '1.1rem' }}>Starter</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', margin: '8px 0', fontFamily: 'var(--font-heading)' }}>
                Free
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Solo practitioners initiating practice
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> 10 Active Clients</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> 30 Monthly Bookings</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> Standard Clinical Notes</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> Basic Analytics</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> 1 Package Template</li>
              </ul>
            </div>

            {/* Professional Tier */}
            <div
              className="card"
              style={{
                border: user?.subscriptionTier === 'professional' ? '2px solid var(--accent)' : '2px solid #818cf8',
                backgroundColor: '#fbfbfe',
                position: 'relative',
              }}
            >
              <span className="badge" style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: 'var(--accent)', color: 'white' }}>
                Recommended
              </span>
              <h3 style={{ fontSize: '1.1rem' }}>Professional</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', margin: '8px 0', fontFamily: 'var(--font-heading)' }}>
                ₹1,499 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/month</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                For established practitioners
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--accent)" /> <strong>50 Active Clients</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--accent)" /> <strong>150 Bookings/mo</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--accent)" /> <strong>SOAP & DAP Notes</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--accent)" /> <strong>Advanced Analytics</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--accent)" /> <strong>5 Session Packages</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--accent)" /> Custom Branding</li>
              </ul>
              <button
                onClick={() => handleUpgrade('professional')}
                disabled={upgrading || user?.subscriptionTier === 'professional'}
                className="btn btn-primary btn-sm"
                style={{
                  width: '100%',
                  marginTop: '1.25rem',
                  backgroundColor: 'var(--accent)',
                }}
              >
                {user?.subscriptionTier === 'professional' ? 'Active Plan' : 'Select Professional'}
              </button>
            </div>

            {/* Enterprise Tier */}
            <div
              className="card"
              style={{
                border: user?.subscriptionTier === 'enterprise' ? '2px solid var(--primary-dark)' : '1px solid var(--border)',
                position: 'relative',
              }}
            >
              <h3 style={{ fontSize: '1.1rem' }}>Enterprise</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', margin: '8px 0', fontFamily: 'var(--font-heading)' }}>
                ₹3,999 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/month</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                High-volume practices & clinics
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> <strong>Unlimited Clients</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> <strong>Unlimited Bookings</strong></li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> All Templates + Custom</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> Full Clinic Reporting</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="var(--primary)" /> Priority 24/7 Support</li>
              </ul>
              <button
                onClick={() => handleUpgrade('enterprise')}
                disabled={upgrading || user?.subscriptionTier === 'enterprise'}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: '1.25rem' }}
              >
                {user?.subscriptionTier === 'enterprise' ? 'Active Plan' : 'Select Enterprise'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
