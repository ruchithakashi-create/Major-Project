require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');

const Therapist = require('../models/Therapist');
const Client = require('../models/Client');
const Availability = require('../models/Availability');
const Session = require('../models/Session');
const SessionNote = require('../models/SessionNote');
const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const Payment = require('../models/Payment');
const SubscriptionTierConfig = require('../models/SubscriptionTierConfig');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const { DEFAULT_TIERS } = require('../config/tiers');
const invoiceService = require('../services/invoiceService');

const seedDatabase = async (options = { isStandalone: false }) => {
  try {
    console.log('🌱 Starting UNFAZED Database Seeding...');
    if (options.isStandalone) {
      await connectDB();
    }

    // Clear existing collections
    console.log('🧹 Purging old records...');
    await Therapist.deleteMany({});
    await Client.deleteMany({});
    await Availability.deleteMany({});
    await Session.deleteMany({});
    await SessionNote.deleteMany({});
    await Package.deleteMany({});
    await ClientPackage.deleteMany({});
    await Payment.deleteMany({});
    await SubscriptionTierConfig.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});

    // 1. Seed Subscription Tiers
    console.log('📦 Seeding Subscription Tier Configurations...');
    await SubscriptionTierConfig.insertMany(DEFAULT_TIERS);

    // Common password hash for demo accounts: "Password123!"
    const salt = await bcrypt.genSalt(10);
    const demoPasswordHash = await bcrypt.hash('Password123!', salt);

    // 2. Seed Therapists
    console.log('👩‍⚕️ Seeding Demo Therapists...');
    const therapist1 = await Therapist.create({
      name: 'Dr. Ananya Sharma',
      email: 'ananya@unfazed.in',
      passwordHash: demoPasswordHash,
      slug: 'dr-ananya-sharma',
      title: 'M.Phil Clinical Psychologist, RCI Certified',
      bio: 'Clinical Psychologist with 8+ years specializing in Acceptance and Commitment Therapy (ACT), Cognitive Behavioral Therapy (CBT), and trauma-informed psychotherapy for adolescents and working adults.',
      profilePhoto: 'https://images.unsplash.com/photo-1594824813591-105151a660d1?w=400&auto=format&fit=crop&q=80',
      experienceYears: 8,
      sessionPrice: 1800,
      specializations: ['Anxiety & Panic Disorders', 'Trauma & PTSD', 'Adult ADHD', 'Burnout & Workplace Stress', 'Couples Counseling'],
      languages: ['English', 'Hindi', 'Kannada'],
      location: {
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        mode: 'online',
      },
      cancellationPolicy: 'Full refund if cancelled at least 24 hours prior to slot. Rescheduling is complimentary.',
      registrationNumber: 'RCI-CRR/2018/009182',
      subscriptionTier: 'professional',
      subscriptionStatus: 'active',
    });

    const therapist2 = await Therapist.create({
      name: 'Dr. Rohan Mehta',
      email: 'rohan@unfazed.in',
      passwordHash: demoPasswordHash,
      slug: 'dr-rohan-mehta',
      title: 'Licensed Psychotherapist & Mindfulness Practitioner',
      bio: 'Compassionate practitioner focusing on mindfulness-based cognitive therapies, depression recovery, and life transitions.',
      profilePhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      experienceYears: 4,
      sessionPrice: 1200,
      specializations: ['Depression Recovery', 'Mindfulness Therapy', 'Grief & Loss', 'Career Transition Anxiety'],
      languages: ['English', 'Hindi', 'Gujarati'],
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        mode: 'online',
      },
      subscriptionTier: 'starter',
      subscriptionStatus: 'active',
    });

    // 3. Seed Availability Schedules
    console.log('📅 Seeding Schedules & Availability...');
    const weeklySchedule = [1, 2, 3, 4, 5, 6].map((day) => ({
      dayOfWeek: day,
      startTime: day === 6 ? '10:00' : '09:00',
      endTime: day === 6 ? '14:00' : '18:00',
      isEnabled: true,
    }));

    await Availability.create({
      therapist: therapist1._id,
      weeklySchedule,
      slotDurationMinutes: 50,
      bufferMinutes: 10,
      advanceNoticeHours: 2,
      bookingHorizonDays: 45,
    });

    await Availability.create({
      therapist: therapist2._id,
      weeklySchedule: weeklySchedule.slice(0, 5),
      slotDurationMinutes: 50,
      bufferMinutes: 15,
      advanceNoticeHours: 4,
    });

    // 4. Seed Packages
    console.log('🎁 Seeding Session Packages...');
    const pkg3 = await Package.create({
      therapist: therapist1._id,
      name: '3-Session Foundation Starter',
      sessionCount: 3,
      totalPrice: 4800, // Rs. 1600/sess (discounted from 1800)
      perSessionPrice: 1600,
      validityDays: 60,
      description: 'Ideal for tackling acute concerns, behavioral goal setting, and introductory coping strategies.',
    });

    const pkg6 = await Package.create({
      therapist: therapist1._id,
      name: '6-Session Deep Transformation',
      sessionCount: 6,
      totalPrice: 9000, // Rs. 1500/sess
      perSessionPrice: 1500,
      validityDays: 120,
      description: 'Recommended for sustained CBT/ACT progress, addressing entrenched cognitive patterns and self-worth.',
    });

    const pkg12 = await Package.create({
      therapist: therapist1._id,
      name: '12-Session Comprehensive Practice',
      sessionCount: 12,
      totalPrice: 16800, // Rs. 1400/sess
      perSessionPrice: 1400,
      validityDays: 240,
      description: 'End-to-end clinical journey for long-term emotional regulation and relational healing.',
    });

    // 5. Seed Clients
    console.log('👥 Seeding Clients with Intake & Consent...');
    const clientsData = [
      {
        name: 'Aditi Rao',
        email: 'aditi@example.com',
        phone: '+91 98765 43210',
        gender: 'female',
        tags: ['Anxiety', 'CBT', 'Tech Industry'],
        status: 'active',
        notesSummary: 'High-functioning software lead facing acute imposter syndrome and insomnia. Highly responsive to thought logs.',
        intakeConcern: 'Experiencing recurrent palpitations before executive meetings and trouble unwinding at night.',
        previousTherapy: true,
      },
      {
        name: 'Kabir Sen',
        email: 'kabir@example.com',
        phone: '+91 98450 11223',
        gender: 'male',
        tags: ['Couples', 'Depression'],
        status: 'active',
        notesSummary: 'Navigating marital separation and existential burnout. Working on values clarification.',
        intakeConcern: 'Ongoing low mood, loss of interest in hobbies, communication breakdown with spouse.',
        previousTherapy: false,
      },
      {
        name: 'Priya Verma',
        email: 'priya@example.com',
        phone: '+91 99001 88776',
        gender: 'female',
        tags: ['ADHD', 'Executive Functioning'],
        status: 'active',
        notesSummary: 'Late diagnosed adult ADHD. Focus on body doubling, dopamine regulation, and self-compassion.',
        intakeConcern: 'Severe procrastination, chronic disorganization, feeling perpetually overwhelmed.',
        previousTherapy: true,
      },
      {
        name: 'Vikram Nair',
        email: 'vikram@example.com',
        phone: '+91 97400 55667',
        gender: 'male',
        tags: ['Grief', 'Family'],
        status: 'active',
        notesSummary: 'Loss of parent 6 months ago. Experiencing complicated bereavement.',
        intakeConcern: 'Struggling with sudden waves of crying and anger following bereavement.',
        previousTherapy: false,
      },
      {
        name: 'Neha Gupta',
        email: 'neha@example.com',
        phone: '+91 91234 56789',
        gender: 'female',
        tags: ['Lead', 'Consultation'],
        status: 'lead',
        notesSummary: 'Inquired via branded profile booking link. First intake session scheduled.',
        intakeConcern: 'Generalized relationship anxiety and panic attacks during social gatherings.',
        previousTherapy: false,
      },
    ];

    const seededClients = [];
    for (const c of clientsData) {
      const client = await Client.create({
        therapist: therapist1._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        gender: c.gender,
        tags: c.tags,
        status: c.status,
        notesSummary: c.notesSummary,
        intakeData: {
          presentingConcern: c.intakeConcern,
          previousTherapy: c.previousTherapy,
          emergencyContactName: 'Family Contact',
          emergencyContactPhone: '+91 99999 88888',
          submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          version: '1.0',
        },
        consent: {
          hasConsented: true,
          consentTextReference: 'Informed Tele-health Privacy Consent v1.0',
          consentedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          ipAddress: '103.21.244.0',
        },
      });
      seededClients.push(client);
    }

    // 6. Seed Client Package
    console.log('🎟️ Seeding Client Package Subscription...');
    const clientPackage = await ClientPackage.create({
      therapist: therapist1._id,
      client: seededClients[0]._id, // Aditi
      package: pkg6._id,
      totalSessions: 6,
      consumedSessions: 2,
      remainingSessions: 4,
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'active',
    });

    // 7. Seed Sessions & Payments across past and future
    console.log('🕰️ Seeding Sessions & GST Payments...');
    const now = new Date();

    // Past Session 1 (Completed)
    const pastDate1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    pastDate1.setHours(10, 0, 0, 0);
    const session1 = await Session.create({
      therapist: therapist1._id,
      client: seededClients[0]._id, // Aditi
      startTime: pastDate1,
      endTime: new Date(pastDate1.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'completed',
      paymentStatus: 'paid',
      meetingLink: `https://meet.jit.si/unfazed-ananya-s1`,
      price: 1800,
    });

    const payment1 = await Payment.create({
      therapist: therapist1._id,
      client: seededClients[0]._id,
      session: session1._id,
      amount: 1800,
      netAmount: 1764,
      platformFee: 36,
      currency: 'INR',
      status: 'captured',
      orderId: `order_seed_${Date.now()}_1`,
      paymentId: `pay_seed_${Date.now()}_1`,
      signature: 'mock_sig_1',
      invoiceNumber: invoiceService.generateInvoiceNumber(),
    });
    session1.payment = payment1._id;
    await session1.save();

    // Past Session 2 (Completed)
    const pastDate2 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    pastDate2.setHours(11, 0, 0, 0);
    const session2 = await Session.create({
      therapist: therapist1._id,
      client: seededClients[1]._id, // Kabir
      startTime: pastDate2,
      endTime: new Date(pastDate2.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'completed',
      paymentStatus: 'paid',
      meetingLink: `https://meet.jit.si/unfazed-ananya-s2`,
      price: 1800,
    });

    const payment2 = await Payment.create({
      therapist: therapist1._id,
      client: seededClients[1]._id,
      session: session2._id,
      amount: 1800,
      netAmount: 1764,
      platformFee: 36,
      currency: 'INR',
      status: 'captured',
      orderId: `order_seed_${Date.now()}_2`,
      paymentId: `pay_seed_${Date.now()}_2`,
      signature: 'mock_sig_2',
      invoiceNumber: invoiceService.generateInvoiceNumber(),
    });
    session2.payment = payment2._id;
    await session2.save();

    // Upcoming Session 1 (Today / Tomorrow confirmed)
    const futureDate1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    futureDate1.setHours(14, 0, 0, 0);
    const session3 = await Session.create({
      therapist: therapist1._id,
      client: seededClients[0]._id, // Aditi
      startTime: futureDate1,
      endTime: new Date(futureDate1.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'confirmed',
      paymentStatus: 'package_credit',
      packageUsed: clientPackage._id,
      meetingLink: `https://meet.jit.si/unfazed-ananya-s3`,
      price: 1500,
    });

    // Upcoming Session 2 (2 days later confirmed)
    const futureDate2 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    futureDate2.setHours(16, 0, 0, 0);
    const session4 = await Session.create({
      therapist: therapist1._id,
      client: seededClients[2]._id, // Priya
      startTime: futureDate2,
      endTime: new Date(futureDate2.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'confirmed',
      paymentStatus: 'paid',
      meetingLink: `https://meet.jit.si/unfazed-ananya-s4`,
      price: 1800,
    });

    // 8. Seed Clinical Notes (Private vs Shared)
    console.log('📝 Seeding Clinical Notes (Verifying Private vs Shared Isolation)...');
    // Note 1: STRICTLY PRIVATE clinical note (SOAP template)
    await SessionNote.create({
      therapist: therapist1._id,
      client: seededClients[0]._id,
      session: session1._id,
      title: 'Confidential Session Evaluation: Cognitive Distortions',
      content:
        '<p><strong>Clinical Impressions:</strong> Client presented with high psychomotor agitation regarding upcoming Q3 tech launch. Evident catastrophic thinking ("If the build fails, my career is finished").</p><p><strong>Intervention:</strong> Conducted socratic questioning around worst-case versus most-likely scenario. Initiated behavioral experiment logging.</p>',
      type: 'private', // SENSITIVE - MUST NEVER BE LEAKED TO CLIENT
      templateType: 'soap',
      structuredData: {
        subjective: 'Client reports feeling "on edge" and waking up at 4am with rapid heart rate.',
        objective: 'Affect congruent with anxiety. Speech rapid but coherent. Cooperative.',
        assessment: 'Generalized anxiety symptoms aggravated by workplace performance demands.',
        plan: 'Assign thought record worksheet. Schedule follow-up in 7 days.',
      },
    });

    // Note 2: SHARED session summary for client portal
    await SessionNote.create({
      therapist: therapist1._id,
      client: seededClients[0]._id,
      session: session1._id,
      title: 'Key Insights & Weekly Mindfulness Exercise',
      content:
        '<h3>Session Reflection & Takeaways</h3><p>Dear Aditi, during our discussion on automatic thoughts, we noticed a tendency to equate uncertainty with danger.</p><h4>Your Weekly Practice:</h4><ul><li><strong>5-4-3-2-1 Sensory Grounding:</strong> Practice twice daily, especially before team standups.</li><li><strong>Thought Record:</strong> When you notice chest tightness, jot down the triggering thought and ask: <em>"What is the evidence against this?"</em></li></ul><p>Looking forward to reviewing your reflections in our next session!</p>',
      type: 'shared', // SAFE - VISIBLE TO CLIENT IN PORTAL
      templateType: 'standard',
    });

    // 9. Seed Chat Messages
    console.log('💬 Seeding Chat Messages...');
    await Message.create({
      therapist: therapist1._id,
      client: seededClients[0]._id,
      senderType: 'therapist',
      senderId: therapist1._id,
      text: 'Hello Aditi! Looking forward to our session tomorrow. Please keep your thought record sheet handy.',
    });

    await Message.create({
      therapist: therapist1._id,
      client: seededClients[0]._id,
      senderType: 'client',
      senderId: seededClients[0]._id,
      text: 'Thank you Dr. Sharma, I have completed the grounding exercise and logged 3 instances.',
    });

    // 10. Seed Notifications
    console.log('🔔 Seeding System Notifications...');
    await Notification.create({
      therapist: therapist1._id,
      client: seededClients[0]._id,
      type: 'booking_confirmed',
      title: 'Session Confirmed',
      message: 'Aditi Rao confirmed appointment for tomorrow at 2:00 PM.',
    });

    await Notification.create({
      therapist: therapist1._id,
      client: seededClients[1]._id,
      type: 'payment_success',
      title: 'Payment Received',
      message: 'Rs. 1,800 received from Kabir Sen (Invoice: UNF-2026-0042).',
    });

    console.log('\n=============================================================');
    console.log('🎉 UNFAZED Seed Completed Successfully!');
    console.log('=============================================================');
    console.log('🔑 DEMO THERAPIST 1 (Professional Tier):');
    console.log('   Email:     ananya@unfazed.in');
    console.log('   Password:  Password123!');
    console.log('   Slug URL:  http://localhost:5173/dr-ananya-sharma');
    console.log('-------------------------------------------------------------');
    console.log('🔑 DEMO THERAPIST 2 (Starter Tier):');
    console.log('   Email:     rohan@unfazed.in');
    console.log('   Password:  Password123!');
    console.log('   Slug URL:  http://localhost:5173/dr-rohan-mehta');
    console.log('-------------------------------------------------------------');
    console.log('🔑 CLIENT PORTAL DEMO:');
    console.log('   Client:    aditi@example.com');
    console.log('   Therapist: dr-ananya-sharma');
    console.log('=============================================================\n');

    if (options.isStandalone) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    if (options.isStandalone) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

if (require.main === module) {
  seedDatabase({ isStandalone: true });
}

module.exports = { seedDatabase };
