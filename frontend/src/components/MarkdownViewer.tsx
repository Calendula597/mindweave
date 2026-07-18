import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { X } from 'lucide-react';
import './MarkdownViewer.css';

interface MarkdownViewerProps {
  content: string;
  filename?: string;
  onClose?: () => void;
}

export function MarkdownViewer({ content, filename, onClose }: MarkdownViewerProps) {
  return (
    <div className="markdown-viewer">
      {/* 头部 */}
      <div className="md-viewer-header">
        {filename && <h3 className="md-viewer-title">{filename}</h3>}
        {onClose && (
          <button className="md-close-button" onClick={onClose} title="关闭">
            <X size={20} />
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="md-viewer-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1] : '';

              if (!inline && lang) {
                return (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={lang}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            table({ children }) {
              return (
                <div className="md-table-wrapper">
                  <table>{children}</table>
                </div>
              );
            },
            img({ src, alt }) {
              return (
                <img
                  src={src}
                  alt={alt}
                  className="md-image"
                  loading="lazy"
                />
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}