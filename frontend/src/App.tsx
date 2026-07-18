import { useState, useEffect } from 'react';
import { KBSidebar } from './components/KBSidebar';
import { KBContent } from './components/KBContent';
import { LearningPanel } from './components/LearningPanel';
import './App.css';

function App() {
  const [activeKB, setActiveKB] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'home' | 'kb'>('home');

  const handleRefresh = () => {
    // 刷新逻辑
  };

  const handleSelectKB = (kbName: string) => {
    setActiveKB(kbName);
    setViewMode('kb');
  };

  const handleBackHome = () => {
    setViewMode('home');
    setActiveKB(null);
  };

  return (
    <div className="app-container kb-app">
      <KBSidebar
        activeKB={activeKB}
        onSelectKB={handleSelectKB}
        onRefresh={handleRefresh}
      />
      
      <main className="kb-main">
        {viewMode === 'home' ? (
          <LearningPanel onBackToKB={handleSelectKB} />
        ) : activeKB ? (
          <KBContent kbName={activeKB} />
        ) : (
          <div className="kb-welcome">
            <div className="kb-welcome-content">
              <h1>欢迎使用 MindWeave</h1>
              <p>选择左侧的知识库开始管理您的文档</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;