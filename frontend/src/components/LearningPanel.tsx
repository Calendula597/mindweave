import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Clock, Calendar, ChevronRight, Target, Brain, Folder } from 'lucide-react';
import './LearningPanel.css';

const API_BASE = 'http://localhost:8000/api/learning';

interface Task {
  task_id: string;
  kb_name: string;
  source_file: string;
  knowledge_point: string;
  detail: string;
  created_date: string;
  next_review_date: string;
  review_count: number;
  status: string;
}

interface LearningPanelProps {
  onBackToKB: (kbName: string) => void;
}

export function LearningPanel({ onBackToKB }: LearningPanelProps) {
  const [todayReview, setTodayReview] = useState<Task[]>([]);
  const [learningTasks, setLearningTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 获取今日任务
  const fetchTodayTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/today`);
      const data = await response.json();
      setTodayReview(data.today_review || []);
      setLearningTasks(data.learning || []);
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取统计
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
    fetchStats();
  }, []);

  // 完成复习
  const handleCompleteReview = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE}/task/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (response.ok) {
        await fetchTodayTasks();
        await fetchStats();
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '已完成';
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天';
    if (diff === 1) return '明天';
    return dateStr;
  };

  const getProgress = (reviewCount: number) => {
    const totalReviews = 5; // 艾宾浩斯5次复习
    return Math.round((reviewCount / totalReviews) * 100);
  };

  return (
    <div className="learning-panel">
      {/* 头部欢迎区域 */}
      <div className="learning-header">
        <div className="learning-header-content">
          <h1>今日学习任务</h1>
          <p>{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="learning-stats">
          <div className="stat-card">
            <Clock className="stat-icon review" />
            <div className="stat-info">
              <span className="stat-value">{stats?.today_review || 0}</span>
              <span className="stat-label">待复习</span>
            </div>
          </div>
          <div className="stat-card">
            <Target className="stat-icon learning" />
            <div className="stat-info">
              <span className="stat-value">{stats?.learning || 0}</span>
              <span className="stat-label">学习中</span>
            </div>
          </div>
          <div className="stat-card">
            <CheckCircle2 className="stat-icon completed" />
            <div className="stat-info">
              <span className="stat-value">{stats?.completed || 0}</span>
              <span className="stat-label">已完成</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="learning-content">
        {loading ? (
          <div className="learning-loading">加载中...</div>
        ) : todayReview.length === 0 && learningTasks.length === 0 ? (
          <div className="learning-empty">
            <Brain size={64} className="empty-icon" />
            <h2>暂无学习任务</h2>
            <p>请在知识库中添加文档，系统将自动提取知识点生成学习任务</p>
            <button className="empty-action" onClick={() => onBackToKB('')}>
              <Folder size={18} />
              前往知识库
            </button>
          </div>
        ) : (
          <>
            {/* 今日待复习 */}
            {todayReview.length > 0 && (
              <section className="task-section">
                <div className="section-header">
                  <h2><Clock size={20} className="section-icon" />今日待复习</h2>
                  <span className="task-count">{todayReview.length} 项</span>
                </div>
                <div className="task-list">
                  {todayReview.map((task) => (
                    <div 
                      key={task.task_id} 
                      className={`task-card review ${selectedTask?.task_id === task.task_id ? 'selected' : ''}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="task-main">
                        <div className="task-knowledge">{task.knowledge_point}</div>
                        <div className="task-meta">
                          <span className="task-kb">{task.kb_name}</span>
                          <span className="task-progress">进度: {getProgress(task.review_count)}%</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="task-arrow" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 学习中 */}
            {learningTasks.length > 0 && (
              <section className="task-section">
                <div className="section-header">
                  <h2><BookOpen size={20} className="section-icon" />学习中</h2>
                  <span className="task-count">{learningTasks.length} 项</span>
                </div>
                <div className="task-list">
                  {learningTasks.map((task) => (
                    <div 
                      key={task.task_id} 
                      className={`task-card learning ${selectedTask?.task_id === task.task_id ? 'selected' : ''}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="task-main">
                        <div className="task-knowledge">{task.knowledge_point}</div>
                        <div className="task-meta">
                          <span className="task-kb">{task.kb_name}</span>
                          <span className="task-next">
                            <Calendar size={14} />
                            {formatDate(task.next_review_date)}
                          </span>
                        </div>
                      </div>
                      <div className="task-progress-bar">
                        <div className="progress-fill" style={{ width: `${getProgress(task.review_count)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* 任务详情面板 */}
      {selectedTask && (
        <div className="task-detail-overlay" onClick={() => setSelectedTask(null)}>
          <div className="task-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h3>{selectedTask.knowledge_point}</h3>
              <button className="detail-close" onClick={() => setSelectedTask(null)}>×</button>
            </div>
            <div className="detail-content">
              <div className="detail-meta">
                <span><Folder size={16} /> {selectedTask.kb_name}</span>
                <span><BookOpen size={16} /> {selectedTask.source_file}</span>
              </div>
              {selectedTask.detail && (
                <div className="detail-description">
                  <h4>知识点详情</h4>
                  <p>{selectedTask.detail}</p>
                </div>
              )}
              <div className="detail-progress">
                <h4>复习进度</h4>
                <div className="progress-visual">
                  <div className="progress-dots">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className={`progress-dot ${i < selectedTask.review_count ? 'completed' : ''}`}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="progress-line">
                    <div style={{ width: `${getProgress(selectedTask.review_count)}%` }}></div>
                  </div>
                </div>
                <p className="progress-text">
                  已复习 {selectedTask.review_count} 次，还需复习 {5 - selectedTask.review_count} 次
                </p>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn-complete" onClick={() => handleCompleteReview(selectedTask.task_id)}>
                <CheckCircle2 size={18} />
                完成本次复习
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}