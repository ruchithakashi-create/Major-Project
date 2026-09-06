import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Invalid email or password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      setSubmitting(true);
      await login(demoEmail, demoPass);
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Demo login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #062b26 0%, #0d9488 100%)',
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
        {/* Brand */}
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
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
            }}
          >
            <Sparkles size={24} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>UNFAZED</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Therapist SaaS Practice Portal
          </p>
        </div>

        {/* Quick Demo Login Helpers */}
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
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            ⚡ Instant Demo Credentials
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('ananya@unfazed.in', 'Password123!')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>Dr. Ananya Sharma (Professional)</span>
              <ArrowRight size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('rohan@unfazed.in', 'Password123!')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>Dr. Rohan Mehta (Starter)</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
              Practice Email
            </label>
            <input
              type="email"
              required
              placeholder="therapist@practice.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '12px' }}
          >
            {submitting ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          New practitioner?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Register your practice
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.825rem' }}>
          <Link to="/portal" style={{ color: 'var(--text-muted)' }}>
            Looking for Client Portal? Click here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
