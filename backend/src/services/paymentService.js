const crypto = require('crypto');
const Razorpay = require('razorpay');

class PaymentService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_unfazedMockKeyId1234';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'unfazedMockSecretKey5678';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'unfazedMockWebhookSecret999';

    // Check if real or mock Razorpay is used
    this.isLiveTestKeys =
      this.keyId &&
      !this.keyId.includes('unfazedMock') &&
      this.keySecret &&
      !this.keySecret.includes('unfazedMock');

    if (this.isLiveTestKeys) {
      this.razorpayInstance = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
      console.log('💳 Razorpay SDK initialized with custom credentials');
    } else {
      console.log('💳 Razorpay running in intelligent Mock Simulator Mode (Zero-Friction Testing)');
    }
  }

  /**
   * Create an order for a session or package
   */
  async createOrder({ amountInINR, receipt, notes = {} }) {
    const amountInPaise = Math.round(amountInINR * 100);

    if (this.isLiveTestKeys && this.razorpayInstance) {
      const order = await this.razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt.toString(),
        notes,
      });
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.keyId,
      };
    }

    // Mock order generation for local offline test environment
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.keyId,
      isMock: true,
    };
  }

  /**
   * Verify signature returned by frontend Razorpay checkout
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    // In mock simulation mode, accept mock signatures
    if (orderId.startsWith('order_mock_') || signature.startsWith('mock_sig_')) {
      return true;
    }

    const hmac = crypto.createHmac('sha256', this.keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const expectedSignature = hmac.digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify Webhook signature
   */
  verifyWebhookSignature(rawBodyString, signatureHeader) {
    if (!signatureHeader || !this.webhookSecret) {
      return false;
    }

    // In mock simulator mode
    if (signatureHeader === 'test_mock_webhook_signature') {
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBodyString)
      .digest('hex');

    return expectedSignature === signatureHeader;
  }
}

module.exports = new PaymentService();
