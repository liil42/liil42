const fs = require('fs');
const path = 'server/src/ai.js';
let t = fs.readFileSync(path, 'utf8');
const s = t.indexOf('function repairJson(text) {');
const e = t.indexOf('function extractJson(text) {');
if (s < 0 || e < 0) { console.error('LOCATE FAIL'); process.exit(1); }
const newRepair = [
"function repairJson(text) {",
"  let value = stripCodeFence(String(text || ''));",
"  value = value.replace(/[\\u201c\\u201d]/g, '\"').replace(/[\\u2018\\u2019]/g, \"'\");",
"  value = value.replace(/,\\s*([}\\]])/g, '$1');",
"  value = value.replace(/([{,]\\s*)([A-Za-z_$][\\w$]*)(\\s*:)/g, '$1\"$2\"$3');",
"  value = value.replace(/\\/\\/[^\\n\\r]*/g, '');",
"  return value;",
"}",
"",
""
].join('\n');
t = t.slice(0, s) + newRepair + t.slice(e);
// 在候选解析循环中加入修复尝试
t = t.replace(
  "    try {\n      return JSON.parse(candidate);\n    } catch (error) {\n      // 继续尝试下一种候选\n    }\n  }",
  "    try {\n      return JSON.parse(candidate);\n    } catch (error) {\n      // 继续尝试下一种候选\n    }\n    try {\n      return JSON.parse(repairJson(candidate));\n    } catch (error) {\n      // 修复失败，继续尝试下一种候选\n    }\n  }"
);
fs.writeFileSync(path, t, 'utf8');
console.log('repairJson upgraded');
