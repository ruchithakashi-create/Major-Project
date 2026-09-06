const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Client = require('../models/Client');
const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const Therapist = require('../models/Therapist');
const paymentService = require('../services/paymentService');
const invoiceService = require('../services/invoiceService');
const notificationService = require('../services/notificationService');
const entitlementService = require('../services/entitlementService');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay order for session or package purchase
 * @access  Public
 */
const createPaymentOrder = async (req, res, next) => {
  try {
    const { therapistSlug, amount, type, sessionId, packageId, clientEmail } = req.body;

    const therapist = await Therapist.findOne({ slug: therapistSlug.toLowerCase() });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    const orderAmount = amount || therapist.sessionPrice || 1500;
    const receipt = `rcpt_${Date.now().toString().slice(-8)}`;

    const order = await paymentService.createOrder({
      amountInINR: orderAmount,
      receipt,
      notes: {
        therapistId: therapist._id.toString(),
        type: type || 'single_session',
        sessionId: sessionId || '',
        packageId: packageId || '',
        clientEmail: clientEmail || '',
      },
    });

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay checkout signature and complete payment record
 * @access  Public
 */
const verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      therapistSlug,
      clientEmail,
      clientName,
      clientPhone,
      amount,
      sessionId,
      packageId,
    } = req.body;

    // Verify signature
    const isValid = paymentService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature verification' });
    }

    const therapist = await Therapist.findOne({ slug: therapistSlug.toLowerCase() });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found' });
    }

    // Idempotent check: Payment already recorded?
    let payment = await Payment.findOne({ orderId });
    if (payment && payment.status === 'captured') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and processed (Idempotent response)',
        payment,
      });
    }

    // Find or create client
    let client = await Client.findOne({ therapist: therapist._id, email: clientEmail.toLowerCase() });
    if (!client) {
      client = await Client.create({
        therapist: therapist._id,
        name: clientName || 'Verified Client',
        email: clientEmail.toLowerCase(),
        phone: clientPhone || '',
        status: 'active',
      });
    }

    const grossAmount = amount || therapist.sessionPrice || 1500;
    const platformFee = Math.round(grossAmount * 0.02); // 2% platform convenience fee
    const netAmount = grossAmount - platformFee;
    const invoiceNumber = invoiceService.generateInvoiceNumber();

    if (!payment) {
      payment = await Payment.create({
        therapist: therapist._id,
        client: client._id,
        session: sessionId || null,
        package: packageId || null,
        amount: grossAmount,
        netAmount,
        platformFee,
        currency: 'INR',
        status: 'captured',
        orderId,
        paymentId: paymentId || `pay_mock_${Date.now()}`,
        signature,
        invoiceNumber,
      });
    } else {
      payment.status = 'captured';
      payment.paymentId = paymentId || `pay_mock_${Date.now()}`;
      payment.signature = signature;
      payment.invoiceNumber = invoiceNumber;
      await payment.save();
    }

    // If payment was for a session, link and mark session paid
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, {
        paymentStatus: 'paid',
        payment: payment._id,
      });
    }

    // If payment was for a package, instantiate ClientPackage
    if (packageId) {
      const pkg = await Package.findById(packageId);
      if (pkg) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (pkg.validityDays || 90));

        await ClientPackage.create({
          therapist: therapist._id,
          client: client._id,
          package: pkg._id,
          totalSessions: pkg.sessionCount,
          remainingSessions: pkg.sessionCount,
          consumedSessions: 0,
          expiryDate,
          status: 'active',
          payment: payment._id,
        });
      }
    }

    // Notify therapist
    await notificationService.notify({
      therapistId: therapist._id,
      clientId: client._id,
      type: 'payment_success',
      title: 'Payment Received',
      message: `Received Rs. ${grossAmount} from ${client.name} for ${packageId ? 'Package purchase' : 'Session booking'}.`,
      metadata: { paymentId: payment._id, invoiceNumber },
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      payment,
      invoiceNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/payments/webhook
 * @desc    Razorpay Webhook listener (authoritative verification)
 * @access  Public
 */
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = JSON.stringify(req.body);

    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    console.log(`🔔 Razorpay Webhook Event Received: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const existingPayment = await Payment.findOne({ orderId });
        if (existingPayment && existingPayment.status !== 'captured') {
          existingPayment.status = 'captured';
          existingPayment.paymentId = paymentEntity.id;
          await existingPayment.save();
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/payments
 * @desc    Get therapist payments list
 * @access  Private (Therapist)
 */
const getPayments = async (req, res, next) => {
  try {
    const { status, clientId, page = 1, limit = 50 } = req.query;
    const query = { therapist: req.therapistId };

    if (status && status !== 'all') query.status = status;
    if (clientId) query.client = clientId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('client', 'name email phone')
      .populate('session', 'startTime status')
      .populate('package', 'name sessionCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/payments/:id/invoice
 * @desc    Download GST Invoice PDF
 * @access  Private (Therapist or Client)
 */
const downloadInvoice = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('therapist')
      .populate('client')
      .populate('package')
      .populate('session');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Security check: Either the owning therapist or the paying client
    const isOwnerTherapist = req.therapistId && payment.therapist._id.toString() === req.therapistId.toString();
    const isOwnerClient = req.client && payment.client._id.toString() === req.client._id.toString();

    if (!isOwnerTherapist && !isOwnerClient) {
      return res.status(403).json({ success: false, message: 'Unauthorized to download this invoice' });
    }

    const itemDescription = payment.package
      ? `${payment.package.name} (${payment.package.sessionCount} Sessions Package)`
      : `Clinical Consultation Session (${payment.session ? new Date(payment.session.startTime).toLocaleDateString('en-IN') : 'Standard'})`;

    const pdfBuffer = await invoiceService.generateInvoicePDF({
      payment,
      therapist: payment.therapist,
      client: payment.client,
      itemDescription,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${payment.invoiceNumber || 'receipt'}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Package Management
 */
const getPackages = async (req, res, next) => {
  try {
    const packages = await Package.find({ therapist: req.therapistId }).sort({ sessionCount: 1 });
    res.status(200).json({ success: true, packages });
  } catch (error) {
    next(error);
  }
};

const createPackage = async (req, res, next) => {
  try {
    // Entitlement Check: Package creation limit
    const check = await entitlementService.canAccess(req.therapistId, 'create_package');
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        entitlementBlocked: true,
        message: check.reason,
        limit: check.limit,
      });
    }

    const { name, sessionCount, totalPrice, validityDays, description } = req.body;
    const perSession = Math.round(totalPrice / sessionCount);

    const pkg = await Package.create({
      therapist: req.therapistId,
      name,
      sessionCount,
      totalPrice,
      perSessionPrice: perSession,
      validityDays: validityDays || 90,
      description: description || '',
    });

    res.status(201).json({ success: true, package: pkg });
  } catch (error) {
    next(error);
  }
};

const deletePackage = async (req, res, next) => {
  try {
    await Package.findOneAndDelete({ _id: req.params.id, therapist: req.therapistId });
    res.status(200).json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getPayments,
  downloadInvoice,
  getPackages,
  createPackage,
  deletePackage,
};
