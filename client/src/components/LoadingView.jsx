import { Loader2 } from 'lucide-react';

export default function LoadingView({ text = '正在分析' }) {
  return (
    <div className="loading-view">
      <Loader2 size={22} className="spin" />
      <span>{text}</span>
    </div>
  );
}
