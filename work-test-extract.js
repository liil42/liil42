const a = require('./server/src/ai.js');
const cases = [
  '{"a":1}',
  '```json\n{"a":1}\n```',
  '前言 {"a":1} 后记',
  '[{"a":1}]',
  '{"a":1,}',
  '```json\n{"a": "b"}\n```',
  '{"msg":"total = price * count"}'
];
for (const c of cases) {
  try { console.log('OK ', JSON.stringify(a.extractJson(c))); }
  catch (e) { console.log('FAIL', c.slice(0, 20), e.message); }
}
