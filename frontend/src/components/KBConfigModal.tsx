import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, RotateCcw, X } from 'lucide-react';
import './KBConfigModal.css';

const API_BASE = 'http://localhost:8000/api/kb';

interface KBConfigModalProps {
  kbName: string;
  onClose: () => void;
}

interface KBLLMConfig {
  api_key: string;
  model: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

export function KBConfigModal({ kbName, onClose }: KBConfigModalProps) {
  const [config, setConfig] = useState<KBLLMConfig>({
    api_key: '',
    model: 'gpt-4o-mini',
    base_url: 'https://api.openai.com/v1',
    temperature: 0.7,
    max_tokens: 4096,
    system_prompt: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(kbName)}/config`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [kbName]);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(kbName)}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '配置保存成功！' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || '保存失败' });
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认值
  const handleReset = () => {
    setConfig({
      api_key: '',
      model: 'gpt-4o-mini',
      base_url: 'https://api.openai.com/v1',
      temperature: 0.7,
      max_tokens: 4096,
      system_prompt: '你是一个专业的学习助手，负责帮助用户学习和掌握知识库中的内容。',
    });
  };

  return (
    <div className="kb-config-overlay" onClick={onClose}>
      <div className="kb-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kb-config-header">
          <div>
            <h2>知识库 LLM 配置</h2>
            <p className="kb-config-kbname">{kbName}</p>
            <p className="kb-config-subtitle">负责知识点提取、测验生成、答疑、润色</p>
          </div>
          <button className="kb-config-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="kb-config-loading">加载中...</div>
        ) : (
          <div className="kb-config-content">
            {/* API Key */}
            <div className="kb-config-field">
              <label>API Key</label>
              <div className="kb-input-with-icon">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="sk-..."
                />
                <button
                  className="kb-toggle-visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="kb-field-hint">此知识库专用的API密钥</span>
            </div>

            {/* Base URL */}
            <div className="kb-config-field">
              <label>Base URL</label>
              <input
                type="text"
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
              <span className="kb-field-hint">API调用地址，支持自定义端点</span>
            </div>

            {/* Model */}
            <div className="kb-config-field">
              <label>模型名称</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4o-mini"
              />
              <span className="kb-field-hint">如：gpt-4o-mini, gpt-4, claude-3-opus等</span>
            </div>

            {/* Temperature */}
            <div className="kb-config-field">
              <label>Temperature: {config.temperature}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="kb-slider"
              />
              <div className="kb-slider-labels">
                <span>精确 (0)</span>
                <span>创造 (2)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="kb-config-field">
              <label>Max Tokens</label>
              <input
                type="number"
                min="1"
                max="128000"
                value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 4096 })}
              />
              <span className="kb-field-hint">模型响应的最大token数</span>
            </div>

            {/* System Prompt */}
            <div className="kb-config-field">
              <label>System Prompt</label>
              <textarea
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                placeholder="你是一个专业的学习助手..."
                rows={4}
              />
              <span className="kb-field-hint">定义该知识库LLM的角色和行为</span>
            </div>

            {/* 消息提示 */}
            {message && (
              <div className={`kb-config-message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        )}

        <div className="kb-config-footer">
          <button className="kb-btn-reset" onClick={handleReset}>
            <RotateCcw size={16} />
            重置
          </button>
          <button
            className="kb-btn-save"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}