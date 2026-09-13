const http = require('http');

function jsonResponse(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const snippetAnalysis = {
  style_toggle: 'simple',
  explanation: '这段代码先定义单价和数量，再计算总价并打印出来。',
  alternative_code: null,
  risk_level: '低',
  risk_reason: '只是简单算术与打印，没有风险。',
  file: '测试代码',
  language: 'javascript',
  summary: '这段代码在计算总价并打印结果。',
  metaphor: '像超市结账：单价乘以数量，得到总金额。',
  keyPoints: [
    { title: '定义单价', detail: 'price 是每个商品的价格。', line: 1, emphasis: ['price', 'const'] },
    { title: '定义数量', detail: 'count 是购买的数量。', line: 2, emphasis: ['count'] },
    { title: '计算总价', detail: 'total 保存乘法的结果。', line: 3, emphasis: ['total', 'price', 'count'] },
    { title: '打印结果', detail: 'console.log 把结果输出到控制台。', line: 4, emphasis: ['console.log', 'total'] }
  ],
  variables: [
    { name: 'price', meaning: '单价', type: 'number' },
    { name: 'count', meaning: '数量', type: 'number' },
    { name: 'total', meaning: '总价', type: 'number' }
  ],
  pitfalls: ['不要把乘号 * 看成字母 x'],
  remember: ['变量名要一看就懂'],
  practice: ['把单价改成 20，重新算一次总价。'],
  annotated: [
    { line: 1, code: 'const price = 10;', comment: '定义单价' },
    { line: 2, code: 'const count = 3;', comment: '定义数量' },
    { line: 3, code: 'const total = price * count;', comment: '计算总价' },
    { line: 4, code: 'console.log(total);', comment: '打印总价' }
  ]
};

const lineInsight = {
  plain_explanation: '这一行在计算总价。',
  analogy: '像把单价和数量放进收银机。',
  tokens: [{ text: 'total', meaning: '总价' }, { text: 'price', meaning: '单价' }],
  mistake_tip: '注意变量名不要写错。'
};

function handler(req, res) {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch (e) { payload = {}; }
    const text = JSON.stringify(payload);
    let answer;
    if (text.includes('correct_parts') && text.includes('wrong_parts') && text.includes('encouragement')) {
      answer = { correct: true, correct_parts: ['变量含义理解正确'], missing_parts: ['可以补充类型'], wrong_parts: [], encouragement: '方向对了，继续加油。' };
    } else if (text.includes('direct_answer') && text.includes('self_check')) {
      answer = { direct_answer: '因为乘法能得到总价。', analogy: '像把两块拼图拼起来。', step_by_step: ['读出两个变量', '相乘'], correction: '', self_check: '如果数量变成 0，总价是多少？' };
    } else if (text.includes('plain_explanation') && text.includes('tokens')) {
      answer = lineInsight;
    } else {
      answer = snippetAnalysis;
    }
    jsonResponse(res, { choices: [{ message: { content: JSON.stringify(answer) }, finish_reason: 'stop' }] });
  });
}

http.createServer(handler).listen(9099, '127.0.0.1', () => console.log('fake-ai on 9099'));
