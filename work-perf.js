const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/MarkdownView.jsx";
const content = `import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MermaidBlock = lazy(async () => {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });

  return {
    default: function Mermaid({ code }) {
      const ref = useRef(null);
      const [failed, setFailed] = useState(false);
      const idRef = useRef(\`mermaid-\${Math.random().toString(36).slice(2)}\`);

      useEffect(() => {
        let cancelled = false;
        mermaid
          .render(idRef.current, code)
          .then(({ svg }) => {
            if (!cancelled && ref.current) ref.current.innerHTML = svg;
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          });
        return () => {
          cancelled = true;
        };
      }, [code]);

      if (failed) {
        return (
          <pre className="code-block">
            <code>{code}</code>
          </pre>
        );
      }
      return <div className="mermaid-block" ref={ref} />;
    }
  };
});

function CodeBlock({ className, children }) {
  const language = className ? className.replace('language-', '') : '';
  const code = String(children || '').replace(/\\n$/, '');
  if (language === 'mermaid') {
    return (
      <Suspense fallback={<pre className="code-block"><code>{code}</code></pre>}>
        <MermaidBlock code={code} />
      </Suspense>
    );
  }
  if (language) {
    return (
      <pre className="code-block">
        <code className={className}>{children}</code>
      </pre>
    );
  }
  return <code>{children}</code>;
}

export default function MarkdownView({ content }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
`;
fs.writeFileSync(p, content);
console.log("MARKDOWN_LAZY_MERMAID");

const v = "F:/AI-codex/daimaxuexi/client/vite.config.js";
const config = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          qr: ['qrcode.react'],
          icons: ['lucide-react'],
          zip: ['jszip']
        }
      }
    },
    chunkSizeWarningLimit: 900
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:3002'
    }
  }
});
`;
fs.writeFileSync(v, config);
console.log("VITE_CHUNKS_CONFIGURED");