const fs = require('fs');
const path = 'server/src/learning-store.js';
let t = fs.readFileSync(path, 'utf8');

const marker = "  const mistakeColumns = db.prepare('PRAGMA table_info(mistake_items)').all();";
if (!t.includes('CREATE TABLE IF NOT EXISTS plans')) {
  const tables = `
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      duration_days INTEGER,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      plan_id TEXT,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      pay_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user
      ON orders(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT,
      source_order_id TEXT,
      start_at TEXT NOT NULL,
      expire_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_user
      ON memberships(user_id, status);

`;
  t = t.replace(marker, tables + marker);
  fs.writeFileSync(path, t, 'utf8');
  console.log('plans/orders/memberships 占位表已加入');
} else {
  console.log('已存在占位表定义');
}
