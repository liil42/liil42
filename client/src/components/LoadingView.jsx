import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const PHASES = [
  '正在整理你的输入',
  '正在阅读内容',
  '正在生成小白讲解',
  '正在整理学习重点',
  '正在保存到历史',
  '马上完成'
];

export default function LoadingView({ text = '正在分析' }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const phaseIndex = Math.min(PHASES.length - 1, Math.floor(seconds / 8));
  const message = seconds >= 60
    ? '分析时间比平时长一些。你可以先离开这个页面，结果会自动保存到历史。'
    : seconds >= 20
      ? '内容较多时会需要 20 到 60 秒，请稍等一下。'
      : '正在分析，请稍等。';

  return (
    <div className="loading-view loading-progress">
      <Loader2 size={22} className="spin" />
      <div>
        <strong>{PHASES[phaseIndex]}</strong>
        <span>{text}，已等待 {seconds} 秒</span>
        <small>{message}</small>
      </div>
    </div>
  );
}
