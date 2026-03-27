/**
 * 奏折卡片组件
 * 展示完整奏折信息
 */

import React, { useState } from 'react';
import { MemorialTimeline } from './MemorialTimeline';
import './MemorialCard.css';

interface Memorial {
  id: string;
  title: string;
  status: string;
  statusName: string;
  createdAt: string;
  completedAt?: string;
  timeline: any[];
  content: string;
  markdown: string;
  stats: {
    totalStages: number;
    completedStages: number;
    progress: number;
    totalTodos: number;
    completedTodos: number;
    duration: string;
  };
}

interface MemorialCardProps {
  memorial: Memorial;
  onCopy?: () => void;
}

export const MemorialCard: React.FC<MemorialCardProps> = ({
  memorial,
  onCopy
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'content' | 'markdown'>('timeline');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memorial.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="memorial-card">
      {/* 奏折头部 */}
      <div className="memorial-header">
        <div className="memorial-seal">奏</div>
        <div className="memorial-title-section">
          <h2 className="memorial-title">{memorial.title}</h2>
          <div className="memorial-meta">
            <span className="memorial-id">编号：{memorial.id}</span>
            <span className={`memorial-status ${memorial.status}`}>
              {memorial.statusName}
            </span>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="memorial-stats">
        <div className="stat-item">
          <span className="stat-value">{memorial.stats.progress}%</span>
          <span className="stat-label">完成进度</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{memorial.stats.completedStages}/{memorial.stats.totalStages}</span>
          <span className="stat-label">办理阶段</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{memorial.stats.duration}</span>
          <span className="stat-label">总耗时</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{memorial.stats.completedTodos}/{memorial.stats.totalTodos}</span>
          <span className="stat-label">子任务</span>
        </div>
      </div>

      {/* 时间信息 */}
      <div className="memorial-dates">
        <div className="date-item">
          <span className="date-label">🕐 创建时间：</span>
          <span className="date-value">{formatDate(memorial.createdAt)}</span>
        </div>
        {memorial.completedAt && (
          <div className="date-item">
            <span className="date-label">✅ 完成时间：</span>
            <span className="date-value">{formatDate(memorial.completedAt)}</span>
          </div>
        )}
      </div>

      {/* 标签页切换 */}
      <div className="memorial-tabs">
        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📜 办理流程
        </button>
        <button
          className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          📋 奏折原文
        </button>
        <button
          className={`tab-btn ${activeTab === 'markdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('markdown')}
        >
          📝 Markdown
        </button>
      </div>

      {/* 内容区 */}
      <div className="memorial-content">
        {activeTab === 'timeline' && (
          <MemorialTimeline timeline={memorial.timeline} />
        )}
        
        {activeTab === 'content' && (
          <div className="content-text">
            <pre>{memorial.content}</pre>
          </div>
        )}
        
        {activeTab === 'markdown' && (
          <div className="markdown-content">
            <div className="markdown-toolbar">
              <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✅ 已复制' : '📋 复制 Markdown'}
              </button>
            </div>
            <pre className="markdown-preview">{memorial.markdown}</pre>
          </div>
        )}
      </div>

      {/* 奏折尾部 */}
      <div className="memorial-footer">
        <p className="memorial-closing">谨具奏闻，伏候圣裁。</p>
        <div className="memorial-stamp">御览</div>
      </div>
    </div>
  );
};
