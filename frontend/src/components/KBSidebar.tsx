import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Folder, Settings, Edit2, Check, X, Home } from 'lucide-react';
import { LLMConfigModal } from './LLMConfigModal';
import { KBConfigModal } from './KBConfigModal';
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
  onHomeClick: () => void;
}

export function KBSidebar({ activeKB, onSelectKB, onRefresh, onHomeClick }: KBSidebarProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // 编辑状态
  const [editingKB, setEditingKB] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renaming, setRenaming] = useState(false);
  
  // 知识库配置模态框
  const [showKBConfig, setShowKBConfig] = useState(false);
  const [configKBName, setConfigKBName] = useState<string | null>(null);

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

  // 开始编辑知识库名称
  const startEditing = (kb: KnowledgeBase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingKB(kb.name);
    setEditingName(kb.name);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingKB(null);
    setEditingName('');
  };

  // 确认重命名
  const handleRename = async (oldName: string) => {
    if (!editingName.trim() || editingName.trim() === oldName) {
      cancelEditing();
      return;
    }

    setRenaming(true);
    try {
      const response = await fetch(
        `${API_BASE}/rename/${encodeURIComponent(oldName)}?new_name=${encodeURIComponent(editingName.trim())}`,
        { method: 'PUT' }
      );

      if (response.ok) {
        await fetchKnowledgeBases();
        if (activeKB === oldName) {
          onSelectKB(editingName.trim());
        }
        cancelEditing();
      } else {
        const error = await response.json();
        alert(error.detail || '重命名失败');
      }
    } catch (error) {
      console.error('重命名知识库失败:', error);
      alert('重命名失败，请重试');
    } finally {
      setRenaming(false);
    }
  };

  // 打开知识库配置
  const openKBConfig = (kbName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfigKBName(kbName);
    setShowKBConfig(true);
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
          <span>MindWeave</span>
        </div>
        <div className="kb-header-actions">
          <button
            className="kb-global-config-btn"
            onClick={() => setShowGlobalConfig(true)}
            title="全局LLM配置"
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

      {/* 主页按钮 */}
      <div className="kb-home-section">
        <button
          className={`kb-home-btn ${!activeKB ? 'active' : ''}`}
          onClick={onHomeClick}
        >
          <Home size={18} />
          <span>主页</span>
        </button>
      </div>

      {/* 知识库列表标题 */}
      <div className="kb-list-title">
        <span>知识库</span>
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
              onClick={() => !editingKB && onSelectKB(kb.name)}
            >
              {editingKB === kb.name ? (
                // 编辑模式
                <div className="kb-edit-form">
                  <Folder size={18} className="kb-folder-icon" />
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(kb.name);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="kb-edit-input"
                  />
                  <button
                    className="kb-edit-btn confirm"
                    onClick={(e) => { e.stopPropagation(); handleRename(kb.name); }}
                    disabled={renaming}
                    title="确认"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="kb-edit-btn cancel"
                    onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                    title="取消"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                // 正常显示模式
                <>
                  <div className="kb-item-content">
                    <Folder size={18} className="kb-folder-icon" />
                    <div className="kb-item-info">
                      <span className="kb-item-name">{kb.name}</span>
                      <span className="kb-item-count">{kb.file_count} 个文件</span>
                    </div>
                  </div>
                  <div className="kb-item-actions">
                    <button
                      className="kb-kb-config-btn"
                      onClick={(e) => openKBConfig(kb.name, e)}
                      title="知识库LLM设置"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      className="kb-edit-name-btn"
                      onClick={(e) => startEditing(kb, e)}
                      title="编辑名称"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="kb-delete-btn"
                      onClick={(e) => handleDelete(kb.name, e)}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
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

      {/* 全局LLM配置弹窗 */}
      {showGlobalConfig && (
        <LLMConfigModal onClose={() => setShowGlobalConfig(false)} />
      )}

      {/* 知识库LLM配置弹窗 */}
      {showKBConfig && configKBName && (
        <KBConfigModal
          kbName={configKBName}
          onClose={() => {
            setShowKBConfig(false);
            setConfigKBName(null);
          }}
        />
      )}
    </div>
  );
}