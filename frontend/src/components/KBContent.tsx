import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Eye, Download, Plus, FileText, X, Settings, Save, Sparkles } from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { MarkdownViewer } from './MarkdownViewer';
import { KBConfigModal } from './KBConfigModal';
import { NoteEditor } from './NoteEditor';
import { PolishPanel } from './PolishPanel';
import './KBContent.css';

const API_BASE = 'http://localhost:8000/api/kb';

interface KBFile {
  filename: string;
  file_type: string;
  file_size: number;
  created_time: string;
  updated_time: string;
}

interface KBContentProps {
  kbName: string;
}

export function KBContent({ kbName }: KBContentProps) {
  const [files, setFiles] = useState<KBFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<KBFile | null>(null);
  const [mdContent, setMdContent] = useState('');
  const [showKBConfig, setShowKBConfig] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 编辑器状态
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  
  // 润色状态
  const [showPolish, setShowPolish] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取文件列表
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(kbName)}/files`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kbName) {
      fetchFiles();
    }
  }, [kbName]);

  // 上传文件
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'md' && ext !== 'markdown') {
      alert('仅支持 PDF 和 MD 文件');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(kbName)}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchFiles();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        alert(error.detail || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 新建笔记 - 打开编辑器
  const handleNewNote = () => {
    setEditingContent('');
    setEditingFile(null);
    setIsEditing(true);
  };

  // 编辑现有笔记
  const handleEditNote = async (file: KBFile) => {
    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(kbName)}/preview/${encodeURIComponent(file.filename)}`
      );
      const data = await response.json();
      setEditingContent(data.content || '');
      setEditingFile(file.filename);
      setIsEditing(true);
    } catch (error) {
      console.error('获取文件内容失败:', error);
      alert('获取文件内容失败');
    }
  };

  // 保存笔记
  const handleSaveNote = async () => {
    if (!newNoteName.trim()) return;

    const filename = newNoteName.trim().endsWith('.md') 
      ? newNoteName.trim() 
      : `${newNoteName.trim()}.md`;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(kbName)}/save/${encodeURIComponent(filename)}?content=${encodeURIComponent(editingContent)}`,
        { method: 'PUT' }
      );

      if (response.ok) {
        await fetchFiles();
        setShowSaveDialog(false);
        setNewNoteName('');
        setIsEditing(false);
        setEditingContent('');
        setEditingFile(null);
      } else {
        const error = await response.json();
        alert(error.detail || '保存失败');
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 接受润色结果
  const handleAcceptPolish = (polishedContent: string, title?: string) => {
    setEditingContent(polishedContent);
    if (title && !editingFile) {
      setNewNoteName(title);
    }
  };

  // 删除文件
  const handleDelete = async (filename: string) => {
    if (!window.confirm(`确定要删除「${filename}」吗？`)) return;

    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(kbName)}/delete/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchFiles();
        if (previewFile?.filename === filename) {
          setPreviewFile(null);
        }
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 预览文件
  const handlePreview = async (file: KBFile) => {
    if (file.file_type === 'pdf') {
      setPreviewFile(file);
    } else if (file.file_type === 'markdown') {
      try {
        const response = await fetch(
          `${API_BASE}/${encodeURIComponent(kbName)}/preview/${encodeURIComponent(file.filename)}`
        );
        const data = await response.json();
        setMdContent(data.content);
        setPreviewFile(file);
      } catch (error) {
        console.error('获取文件内容失败:', error);
        alert('获取文件内容失败');
      }
    }
  };

  // 下载文件
  const handleDownload = (filename: string) => {
    window.open(`${API_BASE}/${encodeURIComponent(kbName)}/download/${encodeURIComponent(filename)}`, '_blank');
  };

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件图标
  const getFileIcon = (type: string) => {
    if (type === 'pdf') return '📕';
    if (type === 'markdown') return '📝';
    return '📄';
  };

  // 编辑器视图
  if (isEditing) {
    return (
      <div className="kb-content">
        <div className="kb-editor-header">
          <h2 className="kb-content-title">
            {editingFile ? `编辑: ${editingFile}` : '新建笔记'}
          </h2>
          <div className="kb-content-actions">
            <button 
              className="kb-action-btn polish-btn" 
              onClick={() => setShowPolish(true)}
              title="AI润色"
            >
              <Sparkles size={16} />
              AI润色
            </button>
            <button 
              className="kb-action-btn save-btn" 
              onClick={() => setShowSaveDialog(true)}
              title="保存"
            >
              <Save size={16} />
              保存
            </button>
            <button 
              className="kb-action-btn cancel-btn" 
              onClick={() => {
                setIsEditing(false);
                setEditingContent('');
                setEditingFile(null);
              }}
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>
        <div className="kb-editor-container">
          <NoteEditor 
            initialContent={editingContent}
            onContentChange={setEditingContent}
          />
        </div>

        {/* 润色面板 */}
        {showPolish && (
          <PolishPanel
            content={editingContent}
            kbName={kbName}
            onAccept={handleAcceptPolish}
            onClose={() => setShowPolish(false)}
          />
        )}

        {/* 保存对话框 */}
        {showSaveDialog && (
          <div className="kb-modal-overlay" onClick={() => setShowSaveDialog(false)}>
            <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
              <h3>保存笔记</h3>
              <input
                type="text"
                placeholder="输入笔记名称"
                value={newNoteName}
                onChange={(e) => setNewNoteName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                autoFocus
              />
              <div className="kb-modal-actions">
                <button className="kb-modal-cancel" onClick={() => setShowSaveDialog(false)}>
                  取消
                </button>
                <button
                  className="kb-modal-confirm"
                  onClick={handleSaveNote}
                  disabled={!newNoteName.trim() || saving}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kb-content">
      {/* 头部 */}
      <div className="kb-content-header">
        <h2 className="kb-content-title">{kbName}</h2>
        <div className="kb-content-actions">
          <button className="kb-action-btn config-btn" onClick={() => setShowKBConfig(true)} title="知识库LLM配置">
            <Settings size={16} />
            LLM配置
          </button>
          <button className="kb-action-btn" onClick={handleNewNote}>
            <Plus size={16} />
            新建笔记
          </button>
          <label className="kb-action-btn upload-btn">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.md,.markdown"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <Upload size={16} />
            {uploading ? '上传中...' : '上传文件'}
          </label>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="kb-file-list-container">
        {loading ? (
          <div className="kb-loading-text">加载中...</div>
        ) : files.length === 0 ? (
          <div className="kb-empty-content">
            <FileText size={48} className="kb-empty-icon" />
            <p>知识库为空</p>
            <p className="kb-empty-hint">上传文件或创建笔记开始使用</p>
          </div>
        ) : (
          <ul className="kb-file-list">
            {files.map((file) => (
              <li key={file.filename} className="kb-file-item">
                <div className="kb-file-info">
                  <span className="kb-file-icon">{getFileIcon(file.file_type)}</span>
                  <div className="kb-file-details">
                    <p className="kb-file-name">{file.filename}</p>
                    <p className="kb-file-meta">
                      {formatSize(file.file_size)} • {file.updated_time}
                    </p>
                  </div>
                </div>
                <div className="kb-file-actions">
                  {file.file_type === 'markdown' && (
                    <button
                      className="kb-file-action-btn edit"
                      onClick={() => handleEditNote(file)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                  )}
                  <button
                    className="kb-file-action-btn preview"
                    onClick={() => handlePreview(file)}
                    title="预览"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="kb-file-action-btn download"
                    onClick={() => handleDownload(file.filename)}
                    title="下载"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    className="kb-file-action-btn delete"
                    onClick={() => handleDelete(file.filename)}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 预览模态框 */}
      {previewFile && (
        <div className="kb-preview-modal">
          <div className="kb-preview-content">
            {previewFile.file_type === 'pdf' && (
              <PDFViewer
                fileUrl={`${API_BASE}/${encodeURIComponent(kbName)}/preview/${encodeURIComponent(previewFile.filename)}`}
                onClose={() => setPreviewFile(null)}
              />
            )}
            {previewFile.file_type === 'markdown' && (
              <MarkdownViewer
                content={mdContent}
                filename={previewFile.filename}
                onClose={() => setPreviewFile(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* 知识库LLM配置弹窗 */}
      {showKBConfig && (
        <KBConfigModal
          kbName={kbName}
          onClose={() => setShowKBConfig(false)}
        />
      )}
    </div>
  );
}