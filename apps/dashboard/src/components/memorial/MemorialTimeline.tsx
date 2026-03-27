/**
 * 奏折时间线组件
 * 展示五阶段办理流程
 */

import React from 'react';
import './MemorialTimeline.css';

interface TimelineItem {
  stage: string;
  stageName: string;
  timestamp: string;
  status: string;
  content: string;
  detail?: string;
  icon: string;
  result?: string;
  todos?: any[];
  subtasks?: any[];
}

interface MemorialTimelineProps {
  timeline: TimelineItem[];
  currentStage?: string;
}

const stageColors: Record<string, string> = {
  emperor: '#FFD700',
  taizi: '#FFA500',
  zhongshu: '#4169E1',
  menxia: '#32CD32',
  shangshu: '#9370DB',
  liubu: '#20B2AA',
  completed: '#228B22'
};

export const MemorialTimeline: React.FC<MemorialTimelineProps> = ({
  timeline,
  currentStage
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="memorial-timeline">
      <div className="timeline-header">
        <h3>📜 办理流程</h3>
      </div>
      
      <div className="timeline-container">
        {timeline.map((item, index) => (
          <div
            key={item.stage}
            className={`timeline-item ${item.status} ${currentStage === item.stage ? 'current' : ''}`}
            style={{ '--stage-color': stageColors[item.stage] } as React.CSSProperties}
          >
            {/* 连接线 */}
            {index < timeline.length - 1 && (
              <div className="timeline-connector" />
            )}
            
            {/* 节点 */}
            <div className="timeline-node">
              <span className="timeline-icon">{item.icon}</span>
              {item.status === 'completed' && (
                <span className="timeline-check">✓</span>
              )}
            </div>
            
            {/* 内容 */}
            <div className="timeline-content">
              <div className="timeline-stage-name">{item.stageName}</div>
              <div className="timeline-time">{formatTime(item.timestamp)}</div>
              <div className="timeline-title">{item.content}</div>
              
              {item.detail && (
                <div className="timeline-detail">
                  {item.detail.split('\n').slice(0, 3).map((line, i) => (
                    <div key={i} className="detail-line">{line}</div>
                  ))}
                </div>
              )}
              
              {/* 子任务 */}
              {item.subtasks && item.subtasks.length > 0 && (
                <div className="timeline-subtasks">
                  {item.subtasks.map((sub, i) => (
                    <div key={i} className="subtask-item">
                      <span className="subtask-dept">{sub.dept}</span>
                      <span className="subtask-status">{sub.status}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 结果标记 */}
              {item.result && (
                <div className={`timeline-result ${item.result}`}>
                  {item.result === 'approved' ? '✅ 准奏' : '❌ 封驳'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
