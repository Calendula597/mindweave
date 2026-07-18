import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { UploadPanel } from './components/UploadPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { NoteEditor } from './components/NoteEditor';
import { ViewMode } from './types';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainCollapsed, setMainCollapsed] = useState(false);

  const renderPanel = () => {
    switch (activeView) {
      case 'chat':
        return <ChatPanel />;
      case 'note':
        return <NoteEditor />;
      case 'upload':
        return <UploadPanel />;
      case 'config':
        return <ConfigPanel />;
      default:
        return <ChatPanel />;
    }
  };

  return (
    <div className="app-container">
      <button
        className={`collapse-button sidebar-collapse ${sidebarCollapsed ? 'expanded' : ''}`}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {sidebarCollapsed ? '▶' : '◀'}
      </button>
      
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
      />
      
      <main className={`main-content ${mainCollapsed ? 'collapsed' : ''}`}>
        {renderPanel()}
      </main>
      
      <button
        className={`collapse-button main-collapse ${mainCollapsed ? 'expanded' : ''}`}
        onClick={() => setMainCollapsed(!mainCollapsed)}
        title={mainCollapsed ? '展开主面板' : '折叠主面板'}
      >
        {mainCollapsed ? '◀' : '▶'}
      </button>
    </div>
  );
}

export default App;