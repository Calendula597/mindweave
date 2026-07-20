import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, Lightbulb, Trash2, Database } from 'lucide-react';
import './ChatPanel.css';

const API_BASE = 'http://localhost:8000/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  questionType?: string;
  sources?: SourceInfo[];
}

interface SourceInfo {
  type: string;
  filename?: string;
  title?: string;
  preview: string;
}

interface ChatPanelProps {
  kbName: string;
}

export function ChatPanel({ kbName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingDoc, setProcessingDoc] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 获取文件列表
  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/kb/${encodeURIComponent(kbName)}/files`);
      const data = await response.json();
      setFiles(data.files?.map((f: any) => f.filename) || []);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    }
  };

  useEffect(() => {
    if (kbName) {
      fetchFiles();
    }
  }, [kbName]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kb_name: kbName,
          question: userMessage.content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '请求失败');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        questionType: data.question_type,
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，出现了错误：${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 处理文档（向量化+提取知识点）
  const handleProcessDocuments = async () => {
    if (files.length === 0) {
      alert('请先上传文档');
      return;
    }

    // 获取知识库配置中的API Key
    let apiKey = '';
    try {
      const configResponse = await fetch(`${API_BASE}/kb/${encodeURIComponent(kbName)}/config`);
      const configData = await configResponse.json();
      apiKey = configData.llm?.api_key || '';
    } catch (error) {
      console.error('获取配置失败:', error);
    }

    if (!apiKey) {
      alert('请先在知识库设置中配置API Key');
      return;
    }

    setProcessingDoc(true);
    
    // 处理每个文件
    let successCount = 0;
    let failCount = 0;
    
    for (const filename of files) {
      try {
        const response = await fetch(`${API_BASE}/knowledge/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kb_name: kbName,
            filename: filename,
            process_type: 'both',
            api_key: apiKey
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }
    
    setProcessingDoc(false);
    
    if (failCount === 0) {
      alert(`成功处理 ${successCount} 个文档`);
    } else {
      alert(`处理完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }
  };

  // 清空对话
  const handleClearChat = () => {
    setMessages([]);
  };

  // 按Enter发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {/* 头部 */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>AI 助手</h2>
          <span className="chat-kb-name">{kbName}</span>
        </div>
        <div className="chat-header-actions">
          <button
            className="chat-action-btn process"
            onClick={handleProcessDocuments}
            disabled={processingDoc}
            title="向量化文档到Milvus"
          >
            <Database size={16} />
            {processingDoc ? '处理中...' : `向量化 (${files.length})`}
          </button>
          <button
            className="chat-action-btn clear"
            onClick={handleClearChat}
            title="清空对话"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <Lightbulb size={48} className="chat-empty-icon" />
            <h3>开始与AI助手对话</h3>
            <p>向知识库提问，获取基于文档的智能回答</p>
            <div className="chat-tips">
              <p>提示：点击「向量化」将文档存入 Milvus 向量数据库后才能进行问答</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="chat-message-content">
                {msg.role === 'assistant' && msg.questionType && (
                  <span className="chat-question-type">{msg.questionType}</span>
                )}
                <p>{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="chat-sources">
                    <span className="chat-sources-title">参考来源：</span>
                    {msg.sources.map((source, idx) => (
                      <div key={idx} className="chat-source-item">
                        <span className="chat-source-type">{source.type}</span>
                        <span className="chat-source-name">
                          {source.filename || source.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-loading">
              <Loader2 size={20} className="spinning" />
              <span>思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          rows={1}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}