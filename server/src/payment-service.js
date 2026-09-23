const { randomBytes } = require('crypto');
const { paymentStore } = require('./payment-store');

const PAYMENT_PROVIDER = 'mock';
const PAYMENT_CHANNEL = 'wechat_native';
const PRODUCT_CODE = 'permanent_member';
const MEMBERSHIP_PRICE_FEN = 1;
const ORDER_EXPIRES_IN_MS = 15 * 60 * 1000;

function serviceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    orderNo: order.orderNo,
    provider: order.provider,
    channel: order.channel,
    productCode: order.productCode,
    amountFen: order.amountFen,
    amountYuan: (order.amountFen / 100).toFixed(2),
    currency: order.currency,
    status: order.status,
    codeUrl: order.status === 'pending' ? order.codeUrl : null,
    prepayId: order.prepayId,
    transactionId: order.transactionId,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt
  };
}

function createPaymentService(store = paymentStore, env = process.env) {
  function assertMockPaymentEnabled() {
    if (env.NODE_ENV === 'production' && env.ALLOW_MOCK_PAYMENT !== 'true') {
      throw serviceError('生产环境已禁用模拟支付', 403);
    }
  }

  function assertProviderConfigured(provider) {
    if (provider !== PAYMENT_PROVIDER) {
      throw serviceError('当前仅开放模拟微信 Native 支付，正式商户配置尚未启用', 503);
    }
  }

  async function createMembershipOrder(userId) {
    assertMockPaymentEnabled();
    const provider = env.PAYMENT_PROVIDER || PAYMENT_PROVIDER;
    assertProviderConfigured(provider);

    const result = store.createOrder({
      userId,
      provider,
      channel: PAYMENT_CHANNEL,
      productCode: PRODUCT_CODE,
      amountFen: MEMBERSHIP_PRICE_FEN,
      expiresInMs: ORDER_EXPIRES_IN_MS
    });

    if (!result.order.codeUrl) {
      const mockCodeUrl = `mock-wechat-native://pay?order_no=${encodeURIComponent(result.order.orderNo)}`;
      const updated = store.attachProviderOrder(result.order.id, {
        codeUrl: mockCodeUrl,
        prepayId: `MOCK-${randomBytes(8).toString('hex').toUpperCase()}`
      });
      return { order: publicOrder(updated), reused: result.reused, mock: true };
    }

    return { order: publicOrder(result.order), reused: result.reused, mock: true };
  }

  function getOrder(userId, orderId) {
    const order = store.getOrderForUser(orderId, userId);
    if (!order) throw serviceError('支付订单不存在', 404);
    return publicOrder(order);
  }

  function listOrders(userId) {
    return store.listOrdersForUser(userId).map(publicOrder);
  }

  function completeMockPayment(userId, orderId) {
    assertMockPaymentEnabled();
    const existing = store.getOrderForUser(orderId, userId);
    if (!existing) throw serviceError('支付订单不存在', 404);
    if (existing.provider !== PAYMENT_PROVIDER) {
      throw serviceError('该订单不是模拟支付订单', 400);
    }

    const result = store.completePaidOrder({
      id: existing.id,
      transactionId: `MOCK-${existing.orderNo}`,
      provider: PAYMENT_PROVIDER
    });

    if (!result.ok && result.reason === 'expired') {
      throw serviceError('支付订单已过期，请重新生成二维码', 409);
    }
    if (!result.ok) {
      throw serviceError('支付订单当前不可支付', 409);
    }

    return {
      order: publicOrder(result.order),
      alreadyPaid: result.alreadyPaid,
      mock: true
    };
  }

  return {
    createMembershipOrder,
    getOrder,
    listOrders,
    completeMockPayment,
    priceFen: MEMBERSHIP_PRICE_FEN
  };
}

module.exports = {
  PAYMENT_PROVIDER,
  PAYMENT_CHANNEL,
  PRODUCT_CODE,
  MEMBERSHIP_PRICE_FEN,
  createPaymentService,
  publicOrder
};
