import { ArrowLeft, ExternalLink, KeyRound } from 'lucide-react';

const steps = [
  {
    title: '打开 DeepSeek 官网',
    body: '在浏览器搜索 deepseek.com，进入官网。',
    image: '/tutorial/step-1.png'
  },
  {
    title: '进入 API 开放平台',
    body: '在主页找到“使用 API 开放平台”，点击进入。',
    image: '/tutorial/step-2.png'
  },
  {
    title: '打开 API keys',
    body: '在页面最左侧点击 API keys。',
    image: '/tutorial/step-3.png'
  },
  {
    title: '创建并复制 API Key',
    body: '点击创建 API Key，输入名称后复制生成的 Key，回到设置页粘贴保存。新手可以先充值 3 元体验。',
    image: '/tutorial/step-4.png'
  }
];

export default function ApiKeyTutorial({ onBack }) {
  return (
    <div className="tutorial-shell">
      <header className="tutorial-header">
        <button type="button" className="icon-btn" title="返回设置" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="pill">API Key</span>
          <h1>怎么获取 API Key</h1>
        </div>
        <a className="btn" href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          打开获取页面
        </a>
      </header>

      <div className="tutorial-hero">
        <KeyRound size={24} />
        <div>
          <strong>跟着下面 4 步做即可</strong>
          <p>API Key 相当于你的钥匙，复制后只粘贴到设置页保存。不要把它发给别人。</p>
        </div>
      </div>

      <div className="tutorial-steps">
        {steps.map((step, index) => (
          <article className="tutorial-step" key={step.title}>
            <div className="tutorial-step-head">
              <span>{index + 1}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </div>
            </div>
            <img src={step.image} alt={step.title} loading="lazy" />
          </article>
        ))}
      </div>

      <div className="tutorial-footer">
        <button type="button" className="btn btn-primary" onClick={onBack}>
          返回设置填写 API Key
        </button>
      </div>
    </div>
  );
}
