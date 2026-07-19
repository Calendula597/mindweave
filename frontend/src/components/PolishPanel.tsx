import { useState } from 'react';
import { Sparkles, X, Check, RefreshCw, FileText, Type, LayoutList, FileSearch } from 'lucide-react';
import './PolishPanel.css';

const API_BASE = 'http://localhost:8000/api/polish';

interface PolishPanelProps {
  content: string;
  kbName: string;
  onAccept: (polishedContent: string, title?: string) => void;
  onClose: () => void;
}

type PolishType = 'all' | 'title' | 'text' | 'structure' | 'summary';

interface PolishOption {
  type: PolishType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const polishOptions: PolishOption[] = [
  { type: 'all', label: '综合润色', icon: <Sparkles size={20} />, description: '标题+润色+结构+摘要' },
  { type: 'title', label: '生成标题', icon: <Type size={20} />, description: '根据内容生成标题' },
  { type: 'text', label: '润色文字', icon: <FileText size={20} />, description: '优化表达、修正语病' },
  { type: 'structure', label: '整理结构', icon: <LayoutList size={20} />, description: '调整段落、添加小标题' },
  { type: 'summary', label: '生成摘要', icon: <FileSearch size={20} />, description: '总结内容要点' },
];

export function PolishPanel({ content, kbName, onAccept, onClose }: PolishPanelProps) {
  const [selectedType, setSelectedType] = useState<PolishType>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    polished: string;
    title?: string;
    summary?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePolish = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          polish_type: selectedType,
          kb_name: kbName,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || '润色失败');
      }

      const data = await response.json();
      setResult({
        polished: data.polished,
        title: data.title,
        summary: data.summary,
      });
    } catch (err: any) {
      setError(err.message || '润色失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onAccept(result.polished, result.title);
      onClose();
    }
  };

  return (
    <div className="polish-overlay">
      <div className="polish-panel">
        <div className="polish-header">
          <h2><Sparkles size={20} /> AI 润色助手</h2>
          <button className="polish-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="polish-content">
          {/* 润色选项 */}
          <div className="polish-options">
            <h3>选择润色类型</h3>
            <div className="polish-options-grid">
              {polishOptions.map((option) => (
                <button
                  key={option.type}
                  className={`polish-option ${selectedType === option.type ? 'selected' : ''}`}
                  onClick={() => setSelectedType(option.type)}
                >
                  <span className="polish-option-icon">{option.icon}</span>
                  <span className="polish-option-label">{option.label}</span>
                  <span className="polish-option-desc">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="polish-actions">
            <button
              className="polish-btn-primary"
              onClick={handlePolish}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  润色中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  开始润色
                </>
              )}
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="polish-error">
              {error}
            </div>
          )}

          {/* 润色结果 */}
          {result && (
            <div className="polish-result">
              {result.title && (
                <div className="polish-result-title">
                  <h4>建议标题</h4>
                  <p>{result.title}</p>
                </div>
              )}

              {result.summary && (
                <div className="polish-result-summary">
                  <h4>内容摘要</h4>
                  <p>{result.summary}</p>
                </div>
              )}

              <div className="polish-result-content">
                <h4>润色结果</h4>
                <div className="polish-preview">
                  <pre>{result.polished}</pre>
                </div>
              </div>

              <div className="polish-result-actions">
                <button className="polish-btn-secondary" onClick={onClose}>
                  取消
                </button>
                <button className="polish-btn-accept" onClick={handleAccept}>
                  <Check size={16} />
                  接受润色结果
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}