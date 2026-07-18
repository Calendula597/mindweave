import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Eye, Download } from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { MarkdownViewer } from './MarkdownViewer';
import './FilePanel.css';

const API_BASE = 'http://localhost:8000/api';

interface FileInfo {
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_time: string;
  file_path: string;
}

export function FilePanel() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [mdContent, setMdContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取文件列表
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/files/list`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // 上传文件
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'md' && ext !== 'markdown') {
      alert('仅支持 PDF 和 MD 文件');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/files/upload`, {
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

  // 删除文件
  const handleDelete = async (filename: string) => {
    if (!window.confirm('确定要删除这个文件吗？')) return;

    try {
      const response = await fetch(`${API_BASE}/files/delete/${filename}`, {
        method: 'DELETE',
      });

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
  const handlePreview = async (file: FileInfo) => {
    if (file.file_type === 'pdf') {
      setPreviewFile(file);
    } else if (file.file_type === 'markdown') {
      try {
        const response = await fetch(`${API_BASE}/files/preview/${file.filename}`);
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
    window.open(`${API_BASE}/files/download/${filename}`, '_blank');
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

  return (
    <div className="file-panel">
      {/* 上传区域 */}
      <div className="upload-section">
        <label className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.md,.markdown"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <Upload size={32} className={uploading ? 'upload-icon spinning' : 'upload-icon'} />
          <p className="upload-text">
            {uploading ? '上传中...' : '点击上传 PDF 或 MD 文件'}
          </p>
          <p className="upload-hint">支持 .pdf, .md, .markdown 格式</p>
        </label>
      </div>

      {/* 文件列表 */}
      <div className="file-list-section">
        <h3 className="section-title">
          <FileText size={18} />
          已上传文件 ({files.length})
        </h3>

        {loading ? (
          <div className="loading-text">加载中...</div>
        ) : files.length === 0 ? (
          <div className="empty-text">暂无文件</div>
        ) : (
          <ul className="file-list">
            {files.map((file) => (
              <li key={file.filename} className="file-item">
                <div className="file-info">
                  <span className="file-icon">{getFileIcon(file.file_type)}</span>
                  <div className="file-details">
                    <p className="file-name">{file.original_filename}</p>
                    <p className="file-meta">
                      {formatSize(file.file_size)} • {file.upload_time}
                    </p>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    className="action-btn preview"
                    onClick={() => handlePreview(file)}
                    title="预览"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="action-btn download"
                    onClick={() => handleDownload(file.filename)}
                    title="下载"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    className="action-btn delete"
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
        <div className="preview-modal">
          <div className="preview-content">
            {previewFile.file_type === 'pdf' && (
              <PDFViewer
                fileUrl={`${API_BASE}/files/preview/${previewFile.filename}`}
                onClose={() => setPreviewFile(null)}
              />
            )}
            {previewFile.file_type === 'markdown' && (
              <MarkdownViewer
                content={mdContent}
                filename={previewFile.original_filename}
                onClose={() => setPreviewFile(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}