import { useState } from 'react';
import { Play, Pause, RefreshCw, Clock } from 'lucide-react';

const CRON_TASKS = [
  { id: 'armory-scan', name: '兵器库扫描', schedule: '*/5 * * * *', lastRun: '2分钟前', nextRun: '3分钟后', status: '办理中', enabled: true },
  { id: 'heartbeat', name: '心跳检测', schedule: '*/30 * * * * *', lastRun: '15秒前', nextRun: '15秒后', status: '办理中', enabled: true },
  { id: 'token-stats', name: 'Token统计', schedule: '0 * * * *', lastRun: '23分钟前', nextRun: '37分钟后', status: '办理中', enabled: true },
  { id: 'memory-cleanup', name: '记忆清理', schedule: '0 0 * * *', lastRun: '12小时前', nextRun: '12小时后', status: 'paused', enabled: false },
  { id: 'config-backup', name: '配置备份', schedule: '0 2 * * *', lastRun: '10小时前', nextRun: '14小时后', status: '办理中', enabled: true },
  { id: 'news-fetch', name: '天下要闻', schedule: '0 * * * *', lastRun: '已暂停', nextRun: '-', status: 'paused', enabled: false },
];

export function CronTasks() {
  const [tasks, setTasks] = useState(CRON_TASKS);
  
  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, enabled: !t.enabled, status: t.enabled ? 'paused' : '办理中' } : t));
  };
  
  const runNow = (id: string) => {
    alert(`手动触发: ${id}`);
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>钦天监</h2>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>定时任务观测</span>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(52,199,89,0.08)', border: '0.5px solid rgba(52,199,89,0.2)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>运行中</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#34C759' }}>{tasks.filter(t => t.status === '办理中').length}</div>
        </div>
        <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,159,10,0.08)', border: '0.5px solid rgba(255,159,10,0.2)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>已暂停</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#FF9F0A' }}>{tasks.filter(t => t.status === 'paused').length}</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map(task => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'center', padding: '14px 16px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ marginRight: '12px' }}>
              {task.status === '办理中' ? (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34C759', boxShadow: '0 0 8px #34C759', animation: 'pulse 2s infinite' }} />
              ) : (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF9F0A' }} />
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{task.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', background: task.status === '办理中' ? 'rgba(52,199,89,0.1)' : 'rgba(255,159,10,0.1)', color: task.status === '办理中' ? '#34C759' : '#FF9F0A' }}>
                  {task.status === '办理中' ? '运行中' : '已暂停'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {task.schedule}</span>
                <span>上次: {task.lastRun}</span>
                <span>下次: {task.nextRun}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => runNow(task.id)} title="立即执行" style={{
                padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}><RefreshCw size={14} /></button>
              <button onClick={() => toggleTask(task.id)} title={task.enabled ? '暂停' : '恢复'} style={{
                padding: '6px', borderRadius: '6px', border: 'none', background: task.enabled ? 'rgba(255,69,58,0.1)' : 'rgba(52,199,89,0.1)', color: task.enabled ? '#FF453A' : '#34C759', cursor: 'pointer',
              }}>
                {task.enabled ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
