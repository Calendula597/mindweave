import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react';

// 设置 PDF.js worker - 使用本地worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  fileUrl: string;
  onClose?: () => void;
}

export function PDFViewer({ fileUrl, onClose }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载PDF文档
  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const loadingTask = pdfjsLib.getDocument({ 
          url: fileUrl,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        setError('PDF加载失败，请重试');
        console.error('PDF加载错误:', err);
      } finally {
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadPdf();
    }
  }, [fileUrl]);

  // 渲染当前页
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !containerRef.current) return;

      const container = containerRef.current;
      container.innerHTML = '';

      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        // 创建canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto';

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          } as any).promise;

          container.appendChild(canvas);
        }
      } catch (err) {
        console.error('页面渲染错误:', err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <p>{error}</p>
        <button onClick={() => setError(null)}>重试</button>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      {/* 关闭按钮 - 右上角 */}
      {onClose && (
        <button className="pdf-close-btn" onClick={onClose} title="关闭">
          <X size={24} />
        </button>
      )}

      {/* PDF内容区域 */}
      <div className="pdf-content" ref={containerRef}>
        {loading && <div className="pdf-loading">加载中...</div>}
      </div>

      {/* 底部工具栏 */}
      <div className="pdf-toolbar">
        <div className="pdf-nav">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            title="上一页"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="page-info">
            {loading ? '...' : `${currentPage} / ${totalPages}`}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            title="下一页"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="pdf-divider"></div>

        <div className="pdf-zoom">
          <button onClick={zoomOut} title="缩小">
            <ZoomOut size={18} />
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} title="放大">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}