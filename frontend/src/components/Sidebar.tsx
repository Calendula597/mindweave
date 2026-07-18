import { SidebarItem, ViewMode } from '../types';

interface SidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  collapsed: boolean;
}

const sidebarItems: SidebarItem[] = [
  { id: 'chat', icon: '💬', label: '聊天' },
  { id: 'note', icon: '📝', label: '笔记' },
  { id: 'upload', icon: '📁', label: '文件上传' },
  { id: 'config', icon: '⚙️', label: '配置' },
];

export function Sidebar({ activeView, onViewChange, collapsed }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">🧠</div>
        {!collapsed && <div className="logo-text">MindWeave</div>}
      </div>
      
      <nav className="sidebar-nav">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id as ViewMode)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </button>
        ))}
      </nav>
      
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="version">v1.0.0</div>
        </div>
      )}
    </aside>
  );
}