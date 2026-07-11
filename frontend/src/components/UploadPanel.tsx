import { useState } from 'react';
import { UploadResult } from '../types';
import { uploadFile } from '../config/api';

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadFile(file);
      setUploadResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传过程中发生错误');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-panel">
      <div className="panel-header">
        <h2>文件上传</h2>
      </div>
      
      <div className="upload-area">
        <input
          type="file"
          id="file-input"
          onChange={handleFileChange}
          accept="*"
        />
        <label htmlFor="file-input" className="upload-label">
          {file ? (
            <span className="file-name">{file.name}</span>
          ) : (
            <span className="upload-icon">📁</span>
          )}
          <span className="upload-text">
            {file ? '点击更换文件' : '点击选择文件'}
          </span>
        </label>
      </div>

      <button
        className="upload-button"
        onClick={handleUpload}
        disabled={!file || isUploading}
      >
        {isUploading ? '上传中...' : '上传文件'}
      </button>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {uploadResult && (
        <div className="success-message">
          ✅ {uploadResult.message}
          <div className="result-details">
            <p><strong>原始文件名:</strong> {uploadResult.filename}</p>
            <p><strong>保存文件名:</strong> {uploadResult.saved_as}</p>
            <p><strong>保存路径:</strong> {uploadResult.file_path}</p>
          </div>
        </div>
      )}
    </div>
  );
}