const SYSTEM_PROMPT = `
你是一位拥有 10 年一线架构经验、面向小白的全栈技术导师。你说话通俗，擅长用生活比喻解释底层原理。你的任务是让用户真正理解代码意图，而不是只给答案。

你运行在一个网页应用中。用户可以通过上传文件、粘贴代码、粘贴报错日志、输入 URL 提交内容。只要收到有效代码或网页内容，就自动开始分析。

四层递进法：
1. 表面动作：说明代码在计算机里具体做了什么。
2. 意图还原：说明作者为什么这样写，解决什么业务痛点；涉及设计模式时点出模式名称并给出生活比喻。
3. 决策复盘：至少给出一个明确替代方案并对比。
4. 隐患预警：指出高并发、维护性、安全性方面的潜在坑。

项目全量分析要求：
- 先生成项目地图，用 Mermaid 画架构图，并生成核心文件职责表。
- 再按入口文件、核心业务、数据层、配置与部署、安全风险逐层深入。
- 项目超过 5 个文件或 1000 行时不要一次性全部逐行解析，先生成地图，再分批深入。
- 按语言使用正确注释符，在关键行上方插入 [AI解析] 注释。
- 标注 TODO、FIXME、危险写法、废弃或过时 API。
- 优化建议遵循 KISS 原则，优先单机、单体、增量修改，不主动推荐微服务、分布式等重架构。

安全红线：
- 检测到硬编码密码、AccessKey、Secret 时，先警告“检测到硬编码凭证，请立即移除并改用环境变量”。
- 生成替代代码时禁止硬编码密钥、禁止 SQL 字符串拼接、禁止使用 eval。
- 不虚构项目中不存在的文件路径、函数名、第三方库或版本号。
- 上下文不足时直接说明，不能编造意图。
- 未读取的文件要标注“未深读/推测”。

规则冲突优先级：安全红线 > 禁止幻觉 > 禁止正确废话 > KISS > 输出格式 > 角色语气。
如果代码过于简单，直接说“此处为常规操作，无特殊风险”，不要硬套四层。
所有面向用户的解释、报告、注释使用中文。

小白教练语气要求（所有讲解都必须遵守）：
- 先一句话说“这段代码在干嘛”，再展开细节。
- 先用生活比喻解释，再进入代码细节。
- 变量、函数、参数、返回值都要解释，不能跳过。
- 不要使用“显然”“众所周知”“显而易见”这类词。
- 不要骂用户笨，也不要只说结论。
- 不要输出大段无结构文字，用短段落和小标题。
- 用括号给专业词补一句大白话翻译。
- 重点内容会被前端渲染成红色加粗，请在文本里自然点出重点词。

单行讲解的固定结构：
1. 一句话总结
2. 生活比喻
3. 逐行解释
4. 关键变量和函数
5. 容易错的地方
6. 你需要记住什么
7. 可以练习什么

错题讲解的固定结构：
1. 先说你错在哪里
2. 再用比喻讲正确思路
3. 再给一个相似小例子
4. 最后出一道 1 分钟小练习
5. 先引导用户自己想，再给答案
`;


function snippetMessages(code, language, style) {
  const styleRule = style
    ? `本次必须使用 ${style} 风格。`
    : `自动判断风格：默认 simple；涉及事件循环、闭包、内存模型、线程安全、浏览器渲染、网络协议等底层原理时升级为 interview；公共函数、API、需要复用模块时使用 doc。`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请分析下面的代码片段。${styleRule}
只输出严格 JSON，不要输出任何 JSON 外的解释。
JSON 结构：
{
  "style_toggle": "simple",
  "explanation": "通俗解释",
  "alternative_code": "有更好写法时放优化代码，否则为 null",
  "risk_level": "低",
  "risk_reason": "一句话说明风险来源",
  "confidence": "高",
  "file": "文件名或粘贴代码",
  "start_line": 1,
  "end_line": 10
}

语言：${language || '未知'}
代码：
${code}`
    }
  ];
}

function projectMapMessages(files, focus) {
  const tree = files.map((file) => {
    const lines = file.content.split('\n').length;
    return `${file.path}（${lines} 行）`;
  }).join('\n');

  const summaries = files.slice(0, 40).map((file) => {
    const lines = file.content.split('\n').slice(0, 40).join('\n');
    return `### ${file.path}\n${lines}`;
  }).join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `这是一个项目，先只生成项目地图，不要逐行深入。

用户重点关注：${focus || '入口、核心业务、数据层、安全风险'}

文件清单：
${tree}

每个文件的前 40 行摘要：
${summaries}

请输出一份 Markdown 项目地图，必须包含：
1. Mermaid 架构图，标注入口、模块、数据流、依赖关系。
2. 核心文件职责表。
3. 明确标注哪些文件已完整读取、哪些只是结构推测。
4. 建议下一步深入分析的批次顺序。`
    }
  ];
}

function projectDeepMessages(files, batchIndex, batchTotal, focus) {
  const blocks = files.map((file) => {
    const lines = file.content.split('\n').slice(0, 800).join('\n');
    const truncated = file.content.split('\n').length > 800 ? '\n（超长文件已截断）' : '';
    return `### 文件：${file.path}\n${lines}${truncated}`;
  }).join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `这是项目第 ${batchIndex} / ${batchTotal} 批文件。请使用四层递进法深入分析，并输出 Markdown 报告。

重点关注：${focus || '代码意图、设计模式、替代方案、风险'}

${blocks}

要求：
- 每批都要给出核心文件职责表。
- 关键代码行上方用正确注释符插入 [AI解析] 注释。
- 点出设计模式并给生活比喻。
- 至少给出一个明确替代方案对比。
- 指出高并发、维护性、安全性风险。
- 标注 TODO、FIXME、危险写法、废弃或过时 API。
- 不要虚构本批之外的文件。`
    }
  ];
}

function errorMessages(code, log) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请结合下面的代码和报错日志做报错反向推导，输出 Markdown 报告。

代码：
${code}

报错日志：
${log}

要求：
1. 先建立日志与代码位置的对应关系，说明哪一行引发了连锁反应。
2. 给出“治标”方案，用于临时规避。
3. 给出“治本”方案，用于重构或修改设计。
4. 如果上下文不足，直接说明“上下文不足，无法准确推断”，并列出还需要哪些代码或行号。`
    }
  ];
}

function urlMessages(url, pageInfo) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请分析下面的网页内容，输出 Markdown 报告。

URL：${url}
Content-Type：${pageInfo.contentType}

HTML/CSS/JS 摘要：
${pageInfo.content}

要求：
1. 分析 DOM 结构、Flex/Grid 布局、响应式设计、脚本加载顺序。
2. 结合源码推断视觉效果，并明确标注“源码推断”。
3. 给出性能优化点：懒加载、防抖节流、资源压缩、渲染阻塞、缓存策略等。
4. 如果源码不足，明确说明无法确认的部分，不能假装看到了页面实际效果。`
    }
  ];
}

function annotateMessages(code, language) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请给下面的代码生成详细注释版。只输出严格 JSON，不要输出任何 JSON 外的解释。

JSON 结构：
{
  "annotated_code": "插入 [AI解析] 注释后的完整代码"
}

语言：${language || '未知'}
代码：
${code}

要求：
- 使用该语言正确的注释符。
- 在关键行上方插入 [AI解析] 注释，不要给显而易见的常规赋值写废话。
- 不要改变原有业务逻辑。
- 如果代码过于简单，只在必要处注释。`
    }
  ];
}

function lineInsightMessages({ code, language, lineNumber, lineText, contextLines, analysis }) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请专门给代码小白讲清楚下面这一行代码。

要求：
1. 先直说这一行在做什么，不得绕圈子。
2. 必须用生活化比喻解释，比喻要贴近真实执行过程。
3. 分开说明每个关键词、变量名、函数名、参数和返回值。
4. 说明这一行执行前发生了什么、执行后数据变成什么。
5. 说明它为什么出现在完整代码里，与前后文有什么关系。
6. 如果这一行不执行或者写错，会出现什么结果。
7. 只输出严格 JSON，不要输出 JSON 以外的内容。

JSON 结构：
{
  "plain_explanation": "小白能直接听懂的解释",
  "analogy": "生活化比喻",
  "tokens": [
    {
      "text": "代码里的原词",
      "kind": "keyword|variable|function|parameter|operator|literal",
      "meaning": "它在当前这一行里的具体含义"
    }
  ],
  "execution_before": "执行前状态",
  "execution_after": "执行后状态",
  "why_here": "它在当前代码中的作用",
  "if_wrong": "不执行或写错会产生什么结果",
  "must_know": ["必须记住的结论"],
  "common_confusions": ["小白常见的错误理解"]
}

语言：${language || '未知'}
当前行号：${lineNumber}
当前行：
${lineText}

上下文：
${contextLines}

已有整体分析：
${JSON.stringify(analysis || {}).slice(0, 6000)}`
    }
  ];
}

function lineQuestionMessages({ code, language, lineNumber, lineText, insight, question }) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `用户正在学习一行代码，并针对该行提出了追问。

要求：
1. 第一段直接回答用户真正卡住的点，不使用空泛套话。
2. 必须使用代码小白能理解的中文。
3. 在确实有助于理解时使用生活化比喻。
4. 如果问题建立在前面的错误理解上，要明确指出错误在哪里。
5. 最后给一个很短的自测问题，让用户用自己的话回答。
6. 只输出严格 JSON，不要输出 JSON 以外的内容。

JSON 结构：
{
  "direct_answer": "直接回答",
  "analogy": "生活化比喻，可为空字符串",
  "step_by_step": ["按执行顺序拆开的步骤"],
  "correction": "对错误理解的纠正，没有错误时为空字符串",
  "self_check": "一个简短自测问题",
  "key_takeaway": "必须记住的一句话"
}

语言：${language || '未知'}
当前行号：${lineNumber}
当前行：
${lineText}

该行已有讲解：
${JSON.stringify(insight || {}).slice(0, 8000)}

完整代码：
${String(code || '').slice(0, 30000)}

用户追问：
${question}`
    }
  ];
}

function understandingReviewMessages({ code, language, lineNumber, lineText, insight, understanding }) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请点评用户对一行代码的个人理解。

要求：
1. 先用一句话肯定用户已经理解对的地方，语气要具体，不要空泛夸奖。
2. 一次最多指出两个主要问题，优先说最关键的那个。
3. 指出遗漏的关键步骤和因果关系，可以用生活里的比喻。
4. 说明错误理解时要说"这里可以再补一句"，避免生硬否定。
5. 不要直接替用户重写全部答案，先给一个引导性追问。
6. 最后给出一版小白能看懂的标准解释，比用户的原话更简单。
7. 只输出严格 JSON，不要输出 JSON 以外的内容。

JSON 结构：
{
  "correct_parts": ["用户理解正确的部分"],
  "missing_parts": ["用户遗漏的内容"],
  "wrong_parts": [
    {
      "what_user_said": "用户原话中的错误点",
      "why_wrong": "为什么错",
      "correct_understanding": "正确理解"
    }
  ],
  "guiding_question": "引导用户自己修正的问题",
  "standard_explanation": "修正后的标准解释",
  "status": "understood|partly_understood|needs_revision",
  "encouragement": "一句具体、不过度夸大的反馈"
}

语言：${language || '未知'}
当前行号：${lineNumber}
当前行：
${lineText}

AI 已有讲解：
${JSON.stringify(insight || {}).slice(0, 8000)}

完整代码：
${String(code || '').slice(0, 30000)}

用户自己的理解：
${understanding}`
    }
  ];
}

function practiceReviewMessages({ code, lineNumber, lineText, practiceType, question, userAnswer }) {
  return [
    {
      role: 'system',
      content: [
        '你是一位耐心、鼓励型的编程启蒙老师，正在检查零基础学员的小练习答案。',
        '请始终先肯定学员理解正确的地方，再补充需要完善的地方，语气温暖、口语化。',
        '一次最多指出两个主要问题，不要堆砌术语，不要使用机械否定。',
        '必须返回严格 JSON，格式如下：',
        '{',
        '  "correct": true 或 false,',
        '  "correct_parts": ["学员答对的地方，最多两条"],',
        '  "missing_parts": ["还可以补充的地方，最多两条"],',
        '  "wrong_parts": [{"what_user_said": "原话", "why_wrong": "为什么需要修正", "correct_understanding": "正确理解"}],',
        '  "encouragement": "一句鼓励的话",',
        '  "standard_explanation": "这道练习的标准答案，用小白能懂的话",',
        '  "suggest_mistake": true 或 false',
        '}'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        '原始代码：', code,
        '',
        '第 ' + lineNumber + ' 行：', lineText,
        '',
        '练习类型：' + practiceType,
        '练习题目：' + question,
        '学员答案：' + userAnswer,
        '',
        '请检查并返回 JSON。'
      ].join('\n')
    }
  ];
}

module.exports.practiceReviewMessages = practiceReviewMessages;

module.exports = {
  SYSTEM_PROMPT,
  snippetMessages,
  projectMapMessages,
  projectDeepMessages,
  errorMessages,
  urlMessages,
  annotateMessages,
  lineInsightMessages,
  lineQuestionMessages,
  understandingReviewMessages,
  practiceReviewMessages
};
