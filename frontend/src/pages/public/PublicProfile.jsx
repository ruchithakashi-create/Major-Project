import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Shield,
  Video,
  Languages,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight,
  CreditCard,
  X,
  FileCheck,
} from 'lucide-react';
import API from '../../services/api';
import RazorpayModal from '../../components/RazorpayModal';
import { useToast } from '../../context/ToastContext';

const PublicProfile = () => {
  const { slug } = useParams();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Booking Form State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    intakeConcern: '',
    previousTherapy: false,
    consentAccepted: false,
  });

  // Razorpay Checkout Modal State
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(null);

  // Fetch Public Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/therapists/public/${slug}`);
        if (res.data.success) {
          setProfileData(res.data);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  // Fetch Slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!slug || !selectedDate) return;
      try {
        setLoadingSlots(true);
        const res = await API.get(`/scheduling/public/${slug}/slots?date=${selectedDate}`);
        if (res.data.success) {
          setAvailableSlots(res.data.slots);
          setSelectedSlot(null);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [slug, selectedDate]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>Loading Practice...</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Retrieving clinical profile and real-time calendar</div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '460px', padding: '2.5rem' }}>
          <Shield size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
          <h2>Therapist Profile Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
            The practice link <strong>/{slug}</strong> may have moved or does not exist.
          </p>
          <Link to="/" className="btn btn-primary">Return Home</Link>
        </div>
      </div>
    );
  }

  const { therapist, packages, slotDurationMinutes } = profileData;

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consentAccepted) {
      addToast('Please accept the Informed Consent to proceed', 'error');
      return;
    }

    try {
      // 1. Create Razorpay Order
      const orderRes = await API.post('/payments/create-order', {
        therapistSlug: slug,
        amount: therapist.sessionPrice,
        clientEmail: formData.email,
      });

      if (orderRes.data.success) {
        setOrderDetails(orderRes.data.order);
        setShowBookingModal(false);
        setShowRazorpay(true);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Booking initiation failed', 'error');
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setShowRazorpay(false);
    try {
      // 2. Complete Booking with confirmed payment
      const bookRes = await API.post(`/scheduling/public/${slug}/book`, {
        clientName: formData.name,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        startTime: selectedSlot.startTime,
        durationMinutes: slotDurationMinutes,
        intakeConcern: formData.intakeConcern,
        previousTherapy: formData.previousTherapy,
        consentAccepted: formData.consentAccepted,
        paymentId: paymentResult.paymentId,
      });

      // 3. Verify Payment Record in backend
      await API.post('/payments/verify', {
        orderId: paymentResult.orderId,
        paymentId: paymentResult.paymentId,
        signature: paymentResult.signature,
        therapistSlug: slug,
        clientEmail: formData.email,
        clientName: formData.name,
        clientPhone: formData.phone,
        amount: therapist.sessionPrice,
        sessionId: bookRes.data.session._id,
      });

      setBookingConfirmed(bookRes.data);
      addToast('Session confirmed & receipt issued!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Booking error after payment', 'error');
    }
  };

  return (
    <div className="public-booking-page">
      {/* Top Brand Bar */}
      <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Sparkles size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.5px' }}>UNFAZED</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/portal" className="btn btn-secondary btn-sm">Client Portal</Link>
          <Link to="/login" className="btn btn-outline-primary btn-sm">Therapist Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="public-hero">
        <img
          src={
            therapist.profilePhoto ||
            'https://images.unsplash.com/photo-1594824813591-105151a660d1?w=400&auto=format&fit=crop&q=80'
          }
          alt={therapist.name}
          className="hero-avatar"
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} /> {therapist.registrationNumber || 'RCI Licensed'}
            </span>
            <span className="badge badge-neutral">{therapist.experienceYears}+ Years Clinical Experience</span>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Video size={12} /> Online Tele-therapy
            </span>
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '6px' }}>{therapist.name}</h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '12px' }}>
            {therapist.title}
          </p>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', lineHeight: 1.6, marginBottom: '1rem' }}>
            {therapist.bio}
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <Languages size={16} color="var(--primary)" />
              <strong>Languages:</strong> {therapist.languages?.join(', ') || 'English, Hindi'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <Clock size={16} color="var(--primary)" />
              <strong>Session Duration:</strong> {slotDurationMinutes} Minutes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <CreditCard size={16} color="var(--primary)" />
              <strong>Standard Fee:</strong> ₹{therapist.sessionPrice} / session
            </div>
          </div>
        </div>
      </section>

      {/* Main Booking & Services Container */}
      <div className="page-wrapper" style={{ paddingTop: '1rem' }}>
        {bookingConfirmed ? (
          /* Confirmation Success Card */
          <div className="card" style={{ maxWidth: '640px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
            <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Your Session is Confirmed!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              A confirmation email and WhatsApp alert have been dispatched with your session joining details.
            </p>

            <div style={{ backgroundColor: '#f0fdfa', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                <strong>Client:</strong> {bookingConfirmed.client.name} ({bookingConfirmed.client.email})
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                <strong>Session Time:</strong> {new Date(bookingConfirmed.session.startTime).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                <strong>Private Video Link:</strong>{' '}
                <a href={bookingConfirmed.session.meetingLink} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                  {bookingConfirmed.session.meetingLink}
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href={bookingConfirmed.session.meetingLink} target="_blank" rel="noreferrer" className="btn btn-primary">
                <Video size={16} /> Open Video Room
              </a>
              <button onClick={() => setBookingConfirmed(null)} className="btn btn-secondary">
                Book Another Session
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* Left Column: Interactive Slot Selection */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <CalendarIcon size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.3rem' }}>Select Date & Time</h2>
              </div>

              {/* Date Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>
                  Consultation Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Slots Grid */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
                  Available Slots ({selectedDate})
                </label>

                {loadingSlots ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Checking real-time calendar...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      No open slots available on this date.
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                      Please select another date from the calendar above.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.startTime}
                        onClick={() => handleSlotSelect(slot)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          border: '1px solid var(--border)',
                          padding: '10px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{slot.timeLabel}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{slot.durationMinutes} min</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Specializations & Discount Packages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Specializations Card */}
              <div className="card">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Clinical Specializations</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {therapist.specializations?.map((spec, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.825rem',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Therapy Packages */}
              {packages && packages.length > 0 && (
                <div className="card" style={{ border: '1px solid #ccfbf1', backgroundColor: '#fafffe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <Award size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.15rem' }}>Therapy Packages & Savings</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {packages.map((pkg) => (
                      <div
                        key={pkg._id}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{pkg.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {pkg.sessionCount} Sessions • Valid for {pkg.validityDays} Days
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                            ₹{pkg.totalPrice}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            (₹{pkg.perSessionPrice}/session)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Cancellation & Rescheduling Policy
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {therapist.cancellationPolicy}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Intake & Informed Consent Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="modal-backdrop" onClick={() => setShowBookingModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Confirm Appointment</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(selectedSlot.startTime).toLocaleString('en-IN')} with {therapist.name}
                </p>
              </div>
              <button onClick={() => setShowBookingModal(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditi Rao"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Email Address (for calendar invite & link) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="aditi@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Phone Number (for WhatsApp reminder)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Brief Intake: What brings you to therapy today?
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Feeling overwhelmed with work anxiety, relationship transitions..."
                    value={formData.intakeConcern}
                    onChange={(e) => setFormData({ ...formData, intakeConcern: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="prevTherapy"
                    checked={formData.previousTherapy}
                    onChange={(e) => setFormData({ ...formData, previousTherapy: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="prevTherapy" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    I have attended therapy before
                  </label>
                </div>

                {/* Informed Consent Checkbox */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      id="consentCheck"
                      required
                      checked={formData.consentAccepted}
                      onChange={(e) => setFormData({ ...formData, consentAccepted: e.target.checked })}
                      style={{ width: 'auto', marginTop: '3px' }}
                    />
                    <label htmlFor="consentCheck" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong>Informed Consent:</strong> I agree to receive tele-mental health services from {therapist.name}. I understand that clinical notes are kept strictly confidential and compliant with ethics regulations.
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowBookingModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Proceed to Payment (₹{therapist.sessionPrice}) <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Razorpay Payment Sandbox Checkout */}
      <RazorpayModal
        isOpen={showRazorpay}
        onClose={() => setShowRazorpay(false)}
        orderDetails={orderDetails}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default PublicProfile;
