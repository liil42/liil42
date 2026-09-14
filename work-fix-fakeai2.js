const fs = require('fs');
let t = fs.readFileSync('work-fake-ai.js', 'utf8');
const start = t.indexOf('    const isLine =');
const end = t.indexOf('    } else {', start);
if (start < 0 || end < 0) { console.error('LOCATE FAIL'); process.exit(1); }
const replacement = `    const isUnderstanding = text.includes('correct_parts') && text.includes('wrong_parts') && text.includes('encouragement');
    const isQuestion = text.includes('direct_answer') && text.includes('self_check');
    const isLine = !isUnderstanding && !isQuestion && text.includes('plain_explanation') && text.includes('tokens');
    let content;
    if (isUnderstanding) {
      content = { correct: true, correct_parts: ['变量含义理解正确'], missing_parts: ['可以补充类型'], wrong_parts: [], encouragement: '方向对了，继续加油。' };
    } else if (isQuestion) {
      content = { direct_answer: '因为乘法能得到总价。', analogy: '像把两块拼图拼起来。', step_by_step: ['读出两个变量', '相乘'], correction: '', self_check: '如果数量变成 0，总价是多少？' };
    } else if (isLine) {
      content = lineInsight;
    } else {
      content = snippetAnalysis;
    }
`;
t = t.slice(0, start) + replacement + t.slice(end + '    } else {'.length);
fs.writeFileSync('work-fake-ai.js', t, 'utf8');
console.log('fake-ai 精确匹配已写入');
