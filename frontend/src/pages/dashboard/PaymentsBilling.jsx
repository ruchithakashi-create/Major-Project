import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Plus,
  Package as PackageIcon,
  IndianRupee,
  CheckCircle2,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import API from '../../services/api';
import TopNavbar from '../../components/TopNavbar';
import UpgradeModal from '../../components/UpgradeModal';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useToast } from '../../context/ToastContext';

const PaymentsBilling = () => {
  const { addToast } = useToast();
  const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, triggerUpgradePrompt, canUse, refreshEntitlements } = useEntitlement();

  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'packages'
  const [payments, setPayments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Package Modal
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: '6-Session Deep Care Package',
    sessionCount: 6,
    totalPrice: 9000,
    validityDays: 120,
    description: 'Sustained cognitive psychotherapy package with discounted per-session pricing.',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, packagesRes] = await Promise.all([
        API.get('/payments'),
        API.get('/payments/packages'),
      ]);

      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.payments);
      }
      if (packagesRes.data.success) {
        setPackages(packagesRes.data.packages);
      }
    } catch (err) {
      console.error('Failed to load payments or packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePackageClick = () => {
    if (!canUse('create_package')) {
      triggerUpgradePrompt('Session Packages (Starter plan allows only 1 active package)');
      return;
    }
    setShowPackageModal(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/payments/packages', newPackage);
      if (res.data.success) {
        addToast('New session package created!', 'success');
        setShowPackageModal(false);
        fetchData();
        refreshEntitlements();
      }
    } catch (err) {
      if (err.response?.data?.entitlementBlocked) {
        setShowPackageModal(false);
        triggerUpgradePrompt(err.response.data.message);
      } else {
        addToast(err.response?.data?.message || 'Failed to create package', 'error');
      }
    }
  };

  const handleDeletePackage = async (pkgId) => {
    if (!window.confirm('Are you sure you want to retire this package?')) return;
    try {
      await API.delete(`/payments/packages/${pkgId}`);
      addToast('Package removed', 'info');
      fetchData();
      refreshEntitlements();
    } catch (err) {
      addToast('Failed to delete package', 'error');
    }
  };

  return (
    <div className="main-content">
      <TopNavbar
        title="Payments, Invoices & Packages"
        subtitle="Razorpay test settlements, GST-compliant tax invoices, and multi-session client packages"
        onOpenUpgrade={() => triggerUpgradePrompt('Session Package Creation')}
      />

      <div className="page-wrapper">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('payments')}
            className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <CreditCard size={16} /> Payment Transactions
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`btn ${activeTab === 'packages' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <PackageIcon size={16} /> Therapy Packages ({packages.length})
          </button>
        </div>

        {activeTab === 'payments' ? (
          /* Payment Transactions List */
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Gross Amount</th>
                  <th>Platform Fee</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th>Tax Invoice</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading transactions...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No payments processed yet. Test payments will appear here in real-time.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {payment.invoiceNumber || 'UNF-DRAFT'}
                        </span>
                      </td>
                      <td>
                        {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{payment.client?.name || 'Client'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payment.client?.email}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{payment.amount}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹{payment.platformFee}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{payment.netAmount}</td>
                      <td>
                        <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
                          {payment.status}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`/api/payments/${payment._id}/invoice`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={14} /> PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Packages View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Practice Session Packages</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Offer 3, 6, or 12-session packages for bundled client commitment.
                </p>
              </div>
              <button onClick={handleCreatePackageClick} className="btn btn-primary">
                <Plus size={16} /> Create Package
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {packages.map((pkg) => (
                <div key={pkg._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pkg.name}</h3>
                    <span className="badge badge-info">{pkg.sessionCount} Sessions</span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1, marginBottom: '1rem' }}>
                    {pkg.description || 'Pre-paid psychotherapy sessions package.'}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{pkg.totalPrice}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ₹{pkg.perSessionPrice}/session • Valid {pkg.validityDays}d
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePackage(pkg._id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)' }}
                      title="Delete Package"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Package Modal */}
      {showPackageModal && (
        <div className="modal-backdrop" onClick={() => setShowPackageModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>New Therapy Package</h3>
              <button onClick={() => setShowPackageModal(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePackage}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Session Count *
                    </label>
                    <select
                      value={newPackage.sessionCount}
                      onChange={(e) => setNewPackage({ ...newPackage, sessionCount: Number(e.target.value) })}
                    >
                      <option value={3}>3 Sessions</option>
                      <option value={6}>6 Sessions</option>
                      <option value={12}>12 Sessions</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Total Package Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={newPackage.totalPrice}
                      onChange={(e) => setNewPackage({ ...newPackage, totalPrice: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    value={newPackage.validityDays}
                    onChange={(e) => setNewPackage({ ...newPackage, validityDays: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Description
                  </label>
                  <textarea
                    rows="2"
                    value={newPackage.description}
                    onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowPackageModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Package
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

export default PaymentsBilling;
