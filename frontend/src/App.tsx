import { useState } from 'react';
import { KBSidebar } from './components/KBSidebar';
import { KBContent } from './components/KBContent';
import './App.css';

function App() {
  const [activeKB, setActiveKB] = useState<string | null>(null);

  const handleRefresh = () => {
    // 刷新逻辑（如果需要）
  };

  return (
    <div className="app-container kb-app">
      <KBSidebar
        activeKB={activeKB}
        onSelectKB={setActiveKB}
        onRefresh={handleRefresh}
      />
      
      <main className="kb-main">
        {activeKB ? (
          <KBContent kbName={activeKB} />
        ) : (
          <div className="kb-welcome">
            <div className="kb-welcome-content">
              <h1>欢迎使用 MindWeave</h1>
              <p>选择左侧的知识库开始管理您的文档</p>
              <p className="kb-welcome-hint">或者点击左上角的 + 创建新的知识库</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;