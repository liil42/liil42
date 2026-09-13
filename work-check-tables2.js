const { learningStore } = require('./server/src/learning-store');
const db = require('node:sqlite');
const path = require('path');
const fs = require('fs');
// 通过公开 API 已触发建表；直接打开数据库校验表结构
const dbPath = path.join(__dirname, 'server', 'data', 'learning.db');
console.log('exists:', fs.existsSync(dbPath));
const { DatabaseSync } = db;
const conn = new DatabaseSync(dbPath);
const rows = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(rows.map((r) => r.name).join(', '));
