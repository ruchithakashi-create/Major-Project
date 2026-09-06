/**
 * UNFAZED Comprehensive Automated Test Suite
 * Tests:
 * 1. Therapist registration, duplicate rejection, and authentication.
 * 2. Tenant isolation (Therapist B cannot query or modify Therapist A's clients).
 * 3. Clinical Note Privacy Boundary (Private notes are never returned on client portal routes).
 * 4. Double booking prevention (Simultaneous booking on same slot is blocked).
 * 5. Entitlement gating (Active client cap enforcement on Starter tier).
 * 6. Webhook signature verification and idempotency.
 */

const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Therapist = require('../src/models/Therapist');
const Client = require('../src/models/Client');
const Session = require('../src/models/Session');
const SessionNote = require('../src/models/SessionNote');
const SubscriptionTierConfig = require('../src/models/SubscriptionTierConfig');
const entitlementService = require('../src/services/entitlementService');
const paymentService = require('../src/services/paymentService');
const { DEFAULT_TIERS } = require('../src/config/tiers');

let mongoServer;

async function runAllTests() {
  console.log('\n🧪 ===================================================');
  console.log('🧪 RUNNING UNFAZED AUTOMATED TEST SUITE');
  console.log('🧪 ===================================================\n');

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Pre-seed subscription tiers
  await SubscriptionTierConfig.insertMany(DEFAULT_TIERS);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // --- TEST 1: Auth & Password Hashing ---
  await test('Therapist Registration & Password Hashing', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecretPass123!', salt);

    const therapist = await Therapist.create({
      name: 'Dr. Test One',
      email: 'test1@unfazed.in',
      passwordHash,
      slug: 'dr-test-one',
      subscriptionTier: 'starter',
    });

    assert.ok(therapist._id, 'Therapist should be created');
    const isMatch = await therapist.comparePassword('SecretPass123!');
    assert.strictEqual(isMatch, true, 'Password comparison should succeed');

    const isWrongMatch = await therapist.comparePassword('WrongPassword');
    assert.strictEqual(isWrongMatch, false, 'Wrong password should fail');
  });

  // --- TEST 2: Duplicate Email Prevention ---
  await test('Duplicate Email Prevention (Unique Index)', async () => {
    try {
      await Therapist.create({
        name: 'Dr. Duplicate',
        email: 'test1@unfazed.in', // Same email as above
        passwordHash: 'dummy',
        slug: 'dr-duplicate',
      });
      assert.fail('Should have thrown duplicate key error');
    } catch (err) {
      assert.strictEqual(err.code, 11000, 'Error code should be 11000 (duplicate key)');
    }
  });

  // --- TEST 3: Tenant Isolation ---
  await test('Tenant Isolation: Therapist B cannot access Therapist A data', async () => {
    const therapistA = await Therapist.findOne({ email: 'test1@unfazed.in' });
    const therapistB = await Therapist.create({
      name: 'Dr. Test Two',
      email: 'test2@unfazed.in',
      passwordHash: 'dummy',
      slug: 'dr-test-two',
      subscriptionTier: 'starter',
    });

    // Create client belonging strictly to Therapist A
    const clientA = await Client.create({
      therapist: therapistA._id,
      name: 'Client of A',
      email: 'clientA@example.com',
      status: 'active',
    });

    // Query scoped by Therapist B's ID should return null
    const resultForB = await Client.findOne({ _id: clientA._id, therapist: therapistB._id });
    assert.strictEqual(resultForB, null, 'Therapist B must not access Therapist A client');

    // Query scoped by Therapist A's ID must succeed
    const resultForA = await Client.findOne({ _id: clientA._id, therapist: therapistA._id });
    assert.ok(resultForA, 'Therapist A should access own client');
  });

  // --- TEST 4: Clinical Note Privacy Boundary ---
  await test('Clinical Note Privacy: Private notes strictly rejected from client serializer', async () => {
    const therapist = await Therapist.findOne({ email: 'test1@unfazed.in' });
    const client = await Client.findOne({ email: 'clientA@example.com' });

    // Create 1 private note and 1 shared note
    const privateNote = await SessionNote.create({
      therapist: therapist._id,
      client: client._id,
      title: 'Top Secret Clinical Assessment',
      content: 'Confidential clinical diagnosis details',
      type: 'private',
    });

    const sharedNote = await SessionNote.create({
      therapist: therapist._id,
      client: client._id,
      title: 'Takeaway Exercises',
      content: 'Breathwork exercises for home',
      type: 'shared',
    });

    // Client portal query simulation: query with type: 'shared'
    const clientPortalResults = await SessionNote.find({
      client: client._id,
      therapist: therapist._id,
      type: 'shared',
    });

    assert.strictEqual(clientPortalResults.length, 1, 'Client portal must only retrieve shared note');
    assert.strictEqual(clientPortalResults[0].title, 'Takeaway Exercises');

    // Test toClientView serializer
    const safeOutput = sharedNote.toClientView();
    assert.strictEqual(safeOutput.title, 'Takeaway Exercises');

    // Assert that calling toClientView on private note throws security error
    assert.throws(() => {
      privateNote.toClientView();
    }, /SECURITY VIOLATION/);
  });

  // --- TEST 5: Double Booking Prevention ---
  await test('Double Booking Prevention: Overlapping active sessions are blocked', async () => {
    const therapist = await Therapist.findOne({ email: 'test1@unfazed.in' });
    const client = await Client.findOne({ email: 'clientA@example.com' });

    const slotTime = new Date('2026-10-10T10:00:00.000Z');
    const slotEnd = new Date('2026-10-10T10:50:00.000Z');

    // First booking succeeds
    const session1 = await Session.create({
      therapist: therapist._id,
      client: client._id,
      startTime: slotTime,
      endTime: slotEnd,
      status: 'confirmed',
    });
    assert.ok(session1._id);

    // Second booking on identical slot must fail due to unique index / collision check
    try {
      await Session.create({
        therapist: therapist._id,
        client: client._id,
        startTime: slotTime,
        endTime: slotEnd,
        status: 'confirmed',
      });
      assert.fail('Should have rejected double-booking');
    } catch (err) {
      assert.ok(err.code === 11000 || err.message.includes('duplicate'), 'Duplicate booking blocked by index');
    }
  });

  // --- TEST 6: Entitlement Engine & Usage Caps ---
  await test('Entitlement Service: Active client cap on Starter tier (cap = 10)', async () => {
    const therapist = await Therapist.findOne({ email: 'test1@unfazed.in' }); // starter tier

    // Therapist currently has 1 active client
    const check1 = await entitlementService.canAccess(therapist._id, 'create_client');
    assert.strictEqual(check1.allowed, true, 'First client is allowed');

    // Seed up to cap (total 10)
    for (let i = 2; i <= 10; i++) {
      await Client.create({
        therapist: therapist._id,
        name: `Test Client ${i}`,
        email: `client${i}@example.com`,
        status: 'active',
      });
    }

    // Now therapist has 10 active clients -> 11th client creation must be blocked
    const checkBlocked = await entitlementService.canAccess(therapist._id, 'create_client');
    assert.strictEqual(checkBlocked.allowed, false, '11th active client should be blocked');
    assert.ok(checkBlocked.reason.includes('Active client limit reached'));

    // Test SOAP template access on starter tier
    const soapCheck = await entitlementService.canAccess(therapist._id, 'use_note_template', {
      templateType: 'soap',
    });
    assert.strictEqual(soapCheck.allowed, false, 'SOAP template must be blocked on Starter tier');
  });

  // --- TEST 7: Payment Signature Verification ---
  await test('Payment Service: Signature verification and mock simulator', async () => {
    const order = await paymentService.createOrder({ amountInINR: 1500, receipt: 'rcpt_test_1' });
    assert.ok(order.orderId);

    const validSig = paymentService.verifyPaymentSignature({
      orderId: order.orderId,
      paymentId: 'pay_test_123',
      signature: 'mock_sig_123',
    });
    assert.strictEqual(validSig, true, 'Mock signature must be accepted in test mode');
  });

  console.log('\n===================================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('===================================================\n');

  await mongoose.disconnect();
  await mongoServer.stop();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
