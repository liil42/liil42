const fs = require('fs');
const path = 'server/src/learning-store.js';
let t = fs.readFileSync(path, 'utf8');

const blockStart = t.indexOf('\n\n    CREATE TABLE IF NOT EXISTS plans (');
const blockEnd = t.indexOf("  const mistakeColumns = db.prepare('PRAGMA table_info(mistake_items)').all();");
if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) { console.error('LOCATE FAIL', blockStart, blockEnd); process.exit(1); }
const block = t.slice(blockStart, blockEnd);
// 修正：外层缩进 4 空格 -> 6 空格重新组装，并去掉尾部多余换行
const fixed = '\n' + block.split('\n').filter((line, idx) => !(idx === 0)).map((line) => line.startsWith('    ') ? '  ' + line : line).join('\n');
t = t.slice(0, blockStart) + t.slice(blockEnd);

// 插入到 SQL 模板末尾（practice_records 相关语句之后，模板反引号之前）
const anchor = "    CREATE INDEX IF NOT EXISTS idx_practice_records_user\n      ON practice_records(user_id, session_id, line_number, created_at DESC);\n  `);";
if (!t.includes(anchor)) { console.error('ANCHOR FAIL'); process.exit(1); }
t = t.replace(anchor, "    CREATE INDEX IF NOT EXISTS idx_practice_records_user\n      ON practice_records(user_id, session_id, line_number, created_at DESC);\n" + fixed + "  `);");
fs.writeFileSync(path, t, 'utf8');
console.log('payment placeholder tables moved inside schema');
