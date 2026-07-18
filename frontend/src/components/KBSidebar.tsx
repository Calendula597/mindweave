import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Folder, Settings } from 'lucide-react';
import { LLMConfigModal } from './LLMConfigModal';
import './KBSidebar.css';

const API_BASE = 'http://localhost:8000/api/kb';

interface KnowledgeBase {
  name: string;
  file_count: number;
  created_time: string;
  updated_time: string;
}

interface KBSidebarProps {
  activeKB: string | null;
  onSelectKB: (kbName: string) => void;
  onRefresh: () => void;
}

export function KBSidebar({ activeKB, onSelectKB, onRefresh }: KBSidebarProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [creating, setCreating] = useState(false);

  // 获取知识库列表
  const fetchKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/list`);
      const data = await response.json();
      setKnowledgeBases(data.knowledge_bases || []);
    } catch (error) {
      console.error('获取知识库列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  // 创建知识库
  const handleCreate = async () => {
    if (!newKBName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/create?name=${encodeURIComponent(newKBName.trim())}`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchKnowledgeBases();
        onRefresh();
        setShowCreateModal(false);
        setNewKBName('');
      } else {
        const error = await response.json();
        alert(error.detail || '创建失败');
      }
    } catch (error) {
      console.error('创建知识库失败:', error);
      alert('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  // 删除知识库
  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定要删除知识库「${name}」及其所有文件吗？`)) return;

    try {
      const response = await fetch(`${API_BASE}/delete/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchKnowledgeBases();
        if (activeKB === name) {
          onSelectKB('' as any);
        }
        onRefresh();
      }
    } catch (error) {
      console.error('删除知识库失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="kb-sidebar">
      {/* 头部 */}
      <div className="kb-sidebar-header">
        <div className="kb-sidebar-title">
          <BookOpen size={20} />
          <span>知识库</span>
        </div>
        <div className="kb-header-actions">
          <button
            className="kb-settings-btn"
            onClick={() => setShowConfigModal(true)}
            title="LLM配置"
          >
            <Settings size={18} />
          </button>
          <button
            className="kb-add-btn"
            onClick={() => setShowCreateModal(true)}
            title="新建知识库"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* 知识库列表 */}
      <div className="kb-list">
        {loading ? (
          <div className="kb-loading">加载中...</div>
        ) : knowledgeBases.length === 0 ? (
          <div className="kb-empty">
            <p>暂无知识库</p>
            <p className="kb-empty-hint">点击上方 + 创建</p>
          </div>
        ) : (
          knowledgeBases.map((kb) => (
            <div
              key={kb.name}
              className={`kb-item ${activeKB === kb.name ? 'active' : ''}`}
              onClick={() => onSelectKB(kb.name)}
            >
              <div className="kb-item-content">
                <Folder size={18} className="kb-folder-icon" />
                <div className="kb-item-info">
                  <span className="kb-item-name">{kb.name}</span>
                  <span className="kb-item-count">{kb.file_count} 个文件</span>
                </div>
              </div>
              <button
                className="kb-delete-btn"
                onClick={(e) => handleDelete(kb.name, e)}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 创建知识库弹窗 */}
      {showCreateModal && (
        <div className="kb-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建知识库</h3>
            <input
              type="text"
              placeholder="输入知识库名称"
              value={newKBName}
              onChange={(e) => setNewKBName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="kb-modal-actions">
              <button className="kb-modal-cancel" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button
                className="kb-modal-confirm"
                onClick={handleCreate}
                disabled={!newKBName.trim() || creating}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LLM配置弹窗 */}
      {showConfigModal && (
        <LLMConfigModal onClose={() => setShowConfigModal(false)} />
      )}
    </div>
  );
}