const { randomBytes, randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  EXPIRED: 'expired',
  CLOSED: 'closed'
});

const paymentDataDir = path.join(__dirname, '..', 'data');
const defaultDatabasePath = process.env.PAYMENT_DB_PATH || path.join(paymentDataDir, 'payments.db');

function ensureDatabaseDirectory(databasePath) {
  if (databasePath === ':memory:') return;
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function initializeSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      channel TEXT NOT NULL,
      product_code TEXT NOT NULL,
      amount_fen INTEGER NOT NULL CHECK (amount_fen > 0),
      currency TEXT NOT NULL DEFAULT 'CNY',
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'closed')),
      code_url TEXT,
      prepay_id TEXT,
      transaction_id TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      paid_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payment_orders_user
      ON payment_orders(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payment_orders_status
      ON payment_orders(status, expires_at);

    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      order_no TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      received_at TEXT NOT NULL,
      UNIQUE(provider, event_id)
    );
  `);
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    provider: row.provider,
    channel: row.channel,
    productCode: row.product_code,
    amountFen: row.amount_fen,
    currency: row.currency,
    status: row.status,
    codeUrl: row.code_url,
    prepayId: row.prepay_id,
    transactionId: row.transaction_id,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    updatedAt: row.updated_at
  };
}

function makeOrderNo() {
  const time = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return `CM${time}${randomBytes(4).toString('hex').toUpperCase()}`;
}

function createPaymentStore(databasePath = defaultDatabasePath) {
  ensureDatabaseDirectory(databasePath);
  const db = new DatabaseSync(databasePath);
  initializeSchema(db);

  const selectOrderById = db.prepare('SELECT * FROM payment_orders WHERE id = ?');
  const selectOrderByNo = db.prepare('SELECT * FROM payment_orders WHERE order_no = ?');
  const selectOrderForUser = db.prepare('SELECT * FROM payment_orders WHERE id = ? AND user_id = ?');
  const selectPendingOrder = db.prepare(`
    SELECT * FROM payment_orders
    WHERE user_id = ?
      AND product_code = ?
      AND status = 'pending'
      AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const selectPaidMembership = db.prepare(`
    SELECT id FROM payment_orders
    WHERE user_id = ?
      AND product_code = 'permanent_member'
      AND status = 'paid'
    LIMIT 1
  `);

  function expirePendingOrders(now = new Date().toISOString()) {
    db.prepare(`
      UPDATE payment_orders
      SET status = 'expired', updated_at = ?
      WHERE status = 'pending' AND expires_at <= ?
    `).run(now, now);
  }

  function createOrder({ userId, provider, channel, productCode, amountFen, expiresInMs }) {
    expirePendingOrders();
    const now = new Date();
    const nowIso = now.toISOString();
    const existing = selectPendingOrder.get(userId, productCode, nowIso);
    if (existing) return { order: mapOrder(existing), reused: true };

    const id = randomUUID();
    const orderNo = makeOrderNo();
    const expiresAt = new Date(now.getTime() + expiresInMs).toISOString();

    db.prepare(`
      INSERT INTO payment_orders (
        id, order_no, user_id, provider, channel, product_code, amount_fen,
        currency, status, created_at, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CNY', 'pending', ?, ?, ?)
    `).run(
      id,
      orderNo,
      userId,
      provider,
      channel,
      productCode,
      amountFen,
      nowIso,
      expiresAt,
      nowIso
    );

    return { order: mapOrder(selectOrderById.get(id)), reused: false };
  }

  function attachProviderOrder(id, { codeUrl, prepayId }) {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE payment_orders
      SET code_url = ?, prepay_id = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(codeUrl || null, prepayId || null, now, id);
    return mapOrder(selectOrderById.get(id));
  }

  function getOrderForUser(id, userId) {
    expirePendingOrders();
    return mapOrder(selectOrderForUser.get(id, userId));
  }

  function listOrdersForUser(userId, limit = 20) {
    expirePendingOrders();
    const rows = db.prepare(`
      SELECT * FROM payment_orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
    return rows.map(mapOrder);
  }

  function getOrderByOrderNo(orderNo) {
    expirePendingOrders();
    return mapOrder(selectOrderByNo.get(orderNo));
  }

  function completePaidOrder({ id = null, orderNo = null, transactionId, provider }) {
    const now = new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = id ? selectOrderById.get(id) : selectOrderByNo.get(orderNo);
      if (!row) {
        db.exec('ROLLBACK');
        return { ok: false, reason: 'not_found' };
      }
      if (provider && row.provider !== provider) {
        db.exec('ROLLBACK');
        return { ok: false, reason: 'provider_mismatch' };
      }
      if (row.status === ORDER_STATUS.PAID) {
        db.exec('COMMIT');
        return { ok: true, alreadyPaid: true, order: mapOrder(row) };
      }
      if (row.status !== ORDER_STATUS.PENDING) {
        db.exec('ROLLBACK');
        return { ok: false, reason: row.status };
      }
      if (row.expires_at <= now) {
        db.prepare(`
          UPDATE payment_orders
          SET status = 'expired', updated_at = ?
          WHERE id = ?
        `).run(now, row.id);
        db.exec('COMMIT');
        return { ok: false, reason: 'expired', order: mapOrder(selectOrderById.get(row.id)) };
      }

      db.prepare(`
        UPDATE payment_orders
        SET status = 'paid',
            transaction_id = ?,
            paid_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(transactionId, now, now, row.id);
      db.exec('COMMIT');
      return { ok: true, alreadyPaid: false, order: mapOrder(selectOrderById.get(row.id)) };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function markOrderClosed(id, reason) {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE payment_orders
      SET status = 'closed', failure_reason = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(reason || '创建支付订单失败', now, id);
    return mapOrder(selectOrderById.get(id));
  }

  function hasPaidMembership(userId) {
    return Boolean(selectPaidMembership.get(userId));
  }

  function recordPaymentEvent({ provider, eventId, orderNo, eventType, payload }) {
    const now = new Date().toISOString();
    try {
      db.prepare(`
        INSERT INTO payment_events (
          provider, event_id, order_no, event_type, payload, received_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(provider, eventId, orderNo, eventType, JSON.stringify(payload || {}), now);
      return { inserted: true };
    } catch (error) {
      if (String(error.message).includes('UNIQUE constraint failed')) {
        return { inserted: false };
      }
      throw error;
    }
  }

  function close() {
    db.close();
  }

  return {
    createOrder,
    attachProviderOrder,
    getOrderForUser,
    getOrderByOrderNo,
    listOrdersForUser,
    completePaidOrder,
    markOrderClosed,
    hasPaidMembership,
    recordPaymentEvent,
    expirePendingOrders,
    close
  };
}

const paymentStore = createPaymentStore();

module.exports = {
  ORDER_STATUS,
  createPaymentStore,
  paymentStore
};
