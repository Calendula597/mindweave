import { useState, useEffect } from 'react';
import { LLMConfig } from '../types';
import { fetchConfig, updateConfig } from '../config/api';

export function ConfigPanel() {
  const [config, setConfig] = useState<LLMConfig>({
    api_key: '',
    model: 'gpt-4o-mini',
    base_url: 'https://api.openai.com/v1',
    temperature: 0.7,
    max_tokens: 4096,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const fetchedConfig = await fetchConfig();
      setConfig(fetchedConfig);
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateConfig(config);
      setSaveMessage('配置保存成功！');
    } catch (error) {
      setSaveMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="config-panel">加载配置中...</div>;
  }

  return (
    <div className="config-panel">
      <div className="panel-header">
        <h2>LLM 配置</h2>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label className="form-label">API Key</label>
          <input
            type="password"
            className="form-input"
            value={config.api_key}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            placeholder="请输入API Key"
          />
        </div>

        <div className="form-group">
          <label className="form-label">模型名称</label>
          <input
            type="text"
            className="form-input"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder="例如: gpt-4o-mini"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Base URL</label>
          <input
            type="text"
            className="form-input"
            value={config.base_url}
            onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Temperature</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              className="form-slider"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            />
            <span className="slider-value">{config.temperature}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Max Tokens</label>
          <input
            type="number"
            className="form-input"
            value={config.max_tokens}
            onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 4096 })}
            placeholder="4096"
          />
        </div>

        <button className="save-button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存配置'}
        </button>

        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('成功') ? 'success' : 'error'}`}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
}