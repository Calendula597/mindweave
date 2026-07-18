import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, RotateCcw } from 'lucide-react';
import './LLMConfigModal.css';

const API_BASE = 'http://localhost:8000/api';

interface LLMConfig {
  api_key: string;
  model: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
}

interface LLMConfigModalProps {
  onClose: () => void;
}

export function LLMConfigModal({ onClose }: LLMConfigModalProps) {
  const [config, setConfig] = useState<LLMConfig>({
    api_key: '',
    model: 'gpt-4o-mini',
    base_url: 'https://api.openai.com/v1',
    temperature: 0.7,
    max_tokens: 4096,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE}/config`);
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
  }, []);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${API_BASE}/config`, {
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
    });
  };

  return (
    <div className="llm-config-overlay" onClick={onClose}>
      <div className="llm-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="llm-config-header">
          <h2>LLM 配置</h2>
          <button className="llm-config-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="llm-config-loading">加载中...</div>
        ) : (
          <div className="llm-config-content">
            {/* API Key */}
            <div className="llm-config-field">
              <label>API Key</label>
              <div className="llm-input-with-icon">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="sk-..."
                />
                <button
                  className="llm-toggle-visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="llm-field-hint">您的API密钥将被安全存储</span>
            </div>

            {/* Base URL */}
            <div className="llm-config-field">
              <label>Base URL</label>
              <input
                type="text"
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
              <span className="llm-field-hint">API调用地址，支持自定义端点</span>
            </div>

            {/* Model */}
            <div className="llm-config-field">
              <label>模型名称</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4o-mini"
              />
              <span className="llm-field-hint">如：gpt-4o-mini, gpt-4, claude-3-opus等</span>
            </div>

            {/* Temperature */}
            <div className="llm-config-field">
              <label>Temperature: {config.temperature}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="llm-slider"
              />
              <div className="llm-slider-labels">
                <span>精确 (0)</span>
                <span>创造 (2)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="llm-config-field">
              <label>Max Tokens</label>
              <input
                type="number"
                min="1"
                max="128000"
                value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 4096 })}
              />
              <span className="llm-field-hint">模型响应的最大token数</span>
            </div>

            {/* 消息提示 */}
            {message && (
              <div className={`llm-config-message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        )}

        <div className="llm-config-footer">
          <button className="llm-btn-reset" onClick={handleReset}>
            <RotateCcw size={16} />
            重置
          </button>
          <button
            className="llm-btn-save"
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