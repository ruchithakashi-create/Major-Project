import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ExternalLink,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients CRM', path: '/dashboard/clients', icon: Users },
    { name: 'Schedule', path: '/dashboard/schedule', icon: Calendar },
    { name: 'Clinical Notes', path: '/dashboard/notes', icon: FileText },
    { name: 'Payments & Billing', path: '/dashboard/payments', icon: CreditCard },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Practice Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-logo">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="sidebar-brand-name">UNFAZED</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--sidebar-text-muted)' }}>Therapist SaaS</div>
        </div>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {/* Public branded link button */}
        {user?.slug && (
          <a
            href={`/${user.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              borderRadius: 'var(--radius-md)',
              color: '#5eead4',
              fontSize: '0.825rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              /{user.slug}
            </span>
            <ExternalLink size={14} />
          </a>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={
              user?.profilePhoto ||
              'https://images.unsplash.com/photo-1594824813591-105151a660d1?w=100&auto=format&fit=crop&q=80'
            }
            alt={user?.name}
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize' }}>
              {user?.subscriptionTier || 'Starter'} Plan
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', color: '#94a3b8', padding: '6px', borderRadius: '6px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
