import React, { useState } from 'react';
import { X, ShieldCheck, QrCode, CreditCard, Landmark, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const RazorpayModal = ({ isOpen, onClose, orderDetails, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('upi');
  const [upiId, setUpiId] = useState('aditi@okhdfcbank');
  const [processing, setProcessing] = useState(false);

  if (!isOpen || !orderDetails) return null;

  const handleSimulatePayment = async () => {
    setProcessing(true);
    // Simulate slight gateway processing delay
    setTimeout(() => {
      setProcessing(false);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Ignored if confetti fails
      }

      const mockPaymentId = `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const mockSignature = `mock_sig_${Date.now()}`;

      onSuccess({
        orderId: orderDetails.orderId,
        paymentId: mockPaymentId,
        signature: mockSignature,
      });
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '440px', borderRadius: '18px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Razorpay Brand Header */}
        <div
          style={{
            backgroundColor: '#0c2340',
            color: 'white',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#3399cc',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              R
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px' }}>Razorpay</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>TEST MODE PAYMENT GATEWAY</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Amount to Pay</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#38bdf8' }}>
              ₹{orderDetails.amount / 100 || orderDetails.amount}
            </div>
          </div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Payment Method Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: activeTab === 'upi' ? '2px solid #3399cc' : '1px solid var(--border)',
                background: activeTab === 'upi' ? '#f0f9ff' : 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}
            >
              <QrCode size={18} color={activeTab === 'upi' ? '#3399cc' : '#64748b'} />
              UPI / QR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('card')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: activeTab === 'card' ? '2px solid #3399cc' : '1px solid var(--border)',
                background: activeTab === 'card' ? '#f0f9ff' : 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}
            >
              <CreditCard size={18} color={activeTab === 'card' ? '#3399cc' : '#64748b'} />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('netbanking')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: activeTab === 'netbanking' ? '2px solid #3399cc' : '1px solid var(--border)',
                background: activeTab === 'netbanking' ? '#f0f9ff' : 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}
            >
              <Landmark size={18} color={activeTab === 'netbanking' ? '#3399cc' : '#64748b'} />
              NetBanking
            </button>
          </div>

          {activeTab === 'upi' && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  margin: '0 auto 12px',
                  border: '2px dashed #94a3b8',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                }}
              >
                <QrCode size={90} color="#0f172a" />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Scan with GPay, PhonePe, or Paytm UPI
              </div>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="or enter UPI ID (e.g. name@okhdfcbank)"
                style={{ fontSize: '0.85rem', textAlign: 'center' }}
              />
            </div>
          )}

          {activeTab === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Card Number (4000 0012 3456 7890)" defaultValue="4000 0012 3456 7890" />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="MM/YY" defaultValue="12/28" />
                <input type="password" placeholder="CVV" defaultValue="123" maxLength="3" />
              </div>
            </div>
          )}

          {activeTab === 'netbanking' && (
            <div>
              <select defaultValue="HDFC Bank">
                <option>HDFC Bank</option>
                <option>State Bank of India (SBI)</option>
                <option>ICICI Bank</option>
                <option>Axis Bank</option>
                <option>Kotak Mahindra Bank</option>
              </select>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#059669',
              margin: '1rem 0',
            }}
          >
            <ShieldCheck size={16} /> 256-Bit SSL Encrypted Razorpay Test Sandbox
          </div>

          <button
            type="button"
            onClick={handleSimulatePayment}
            disabled={processing}
            style={{
              width: '100%',
              backgroundColor: '#3399cc',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {processing ? 'Processing Payment...' : `Pay ₹${orderDetails.amount / 100 || orderDetails.amount}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RazorpayModal;
