import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  IndianRupee,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import API from '../../services/api';
import TopNavbar from '../../components/TopNavbar';
import UpgradeModal from '../../components/UpgradeModal';
import { useEntitlement } from '../../hooks/useEntitlement';

const AnalyticsView = () => {
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, triggerUpgradePrompt } = useEntitlement();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await API.get('/analytics');
      if (res.data.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        <TopNavbar title="Practice Analytics" subtitle="Server-side aggregation insights" />
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Aggregating practice metrics...
        </div>
      </div>
    );
  }

  const { overview, revenueTrend, statusDistribution, isAdvanced, advancedData } = analytics || {};

  const maxMonthlyRevenue = revenueTrend?.length
    ? Math.max(...revenueTrend.map((m) => m.revenue), 1000)
    : 1000;

  return (
    <div className="main-content">
      <TopNavbar
        title="Practice Analytics & Growth"
        subtitle="Real-time MongoDB aggregation metrics for revenue, attendance, and client retention"
        onOpenUpgrade={() => triggerUpgradePrompt('Advanced Analytics & Retention Graphs')}
      />

      <div className="page-wrapper">
        {/* Top KPIs Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gross Practice Revenue</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              ₹{overview?.totalRevenue?.toLocaleString('en-IN') || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>
              Net: ₹{overview?.netRevenue?.toLocaleString('en-IN') || 0}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed Sessions</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {overview?.completedSessions || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Completion Rate: {overview?.completionRate || 0}%
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No-Show Rate</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
              {overview?.noShowRate || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Industry avg: ~18%
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Caseload</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
              {overview?.activeClients || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total Clients: {overview?.totalClients || 0}
            </div>
          </div>
        </div>

        {/* Middle Row: Revenue Trend & Session Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Revenue Trend Visual Bar Chart */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Monthly Revenue Trend (MongoDB Aggregation)</h3>

            {revenueTrend?.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No completed payment transactions yet in the last 6 months.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '16px', padding: '1rem 0' }}>
                {revenueTrend.map((m, i) => {
                  const barHeight = Math.max(Math.round((m.revenue / maxMonthlyRevenue) * 160), 12);
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ₹{m.revenue > 999 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: `${barHeight}px`,
                          backgroundColor: 'var(--primary)',
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.label.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Status Distribution */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Session Attendance Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Completed Consultations</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {statusDistribution?.completed || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Upcoming Confirmed</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {statusDistribution?.confirmed || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cancelled by Client/Therapist</span>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                  {statusDistribution?.cancelled || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Client No-Shows</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
                  {statusDistribution?.['no-show'] || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Advanced Analytics (Gated by Tier) */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--accent)" />
              <h3 style={{ fontSize: '1.15rem' }}>Advanced Client Acquisition & Retention</h3>
            </div>
            {!isAdvanced && (
              <span className="badge" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                Professional Tier Feature
              </span>
            )}
          </div>

          {!isAdvanced ? (
            /* Blurred Gated State */
            <div
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Advanced Analytics Locked on Starter Tier
              </h4>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '0.9rem' }}>
                Unlock cohort retention rates, new client acquisition over time, and predictive earnings with the Professional practice plan.
              </p>
              <button
                onClick={() => triggerUpgradePrompt('Advanced Analytics & Retention Insights')}
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Sparkles size={16} /> Upgrade to Professional (₹1,499/mo)
              </button>
            </div>
          ) : (
            /* Unlocked Advanced Metrics */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Client Retention Rate</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                  {advancedData?.retentionRate || 100}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Percentage of clients booking repeat sessions
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Yield Per Session</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                  ₹{advancedData?.averageRevenuePerSession || 1800}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Blended across single slots and multi-session packages
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        blockedFeature={upgradeFeature}
        onUpgraded={fetchAnalytics}
      />
    </div>
  );
};

export default AnalyticsView;
