import { useState, useEffect } from 'react';
import { Crown, Layers, Shield, Activity, Swords, FileText, Wrench, Database, Send, Download, X } from 'lucide-react';

const ICON_MAP: Record<string, any> = { Crown, Layers, Shield, Activity, Swords, FileText, Wrench, Database };

interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: number;
}

const MOCK_DISCUSSION = [
  { id: 1, dept: 'zhongshu', content: '我认为这个方案应该采用微服务架构，便于后期扩展。', time: '10:30', round: 1 },
  { id: 2, dept: 'menxia', content: '微服务会增加复杂度，建议先采用单体架构，后期再拆分。', time: '10:32', round: 1 },
  { id: 3, dept: 'bingbu', content: '从实现角度，单体架构确实更快速。我可以先用单体实现，预留微服务接口。', time: '10:35', round: 1 },
  { id: 4, dept: 'zhongshu', content: '兵部的建议很好，那就按这个方案执行：单体架构 + 预留接口。', time: '10:38', round: 2 },
  { id: 5, dept: 'menxia', content: '同意，方案通过。', time: '10:40', round: 2 },
];

const DEPTS = [
  { id: 'zhongshu', name: '中书省', icon: 'Layers', color: '#4A90D9' },
  { id: 'menxia', name: '门下省', icon: 'Shield', color: '#7B68EE' },
  { id: 'shangshu', name: '尚书省', icon: 'Activity', color: '#50C878' },
  { id: 'bingbu', name: '兵部', icon: 'Swords', color: '#50C878' },
  { id: 'hubu', name: '户部', icon: 'Database', color: '#50C878' },
  { id: 'libu', name: '吏部', icon: 'FileText', color: '#50C878' },
];

export function CourtDiscussion() {
  const [topic, setTopic] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['zhongshu', 'menxia', 'bingbu']);
  const [messages, setMessages] = useState(MOCK_DISCUSSION);
  const [input, setInput] = useState('');
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  useEffect(() => {
    fetch('/api/chaoting/bumen')
      .then(r => r.json())
      .then(data => setDepartments(data.departments || []))
      .catch(() => setDepartments([]));
  }, []);
  
  const toggleDept = (id: string) => {
    setSelectedDepts(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };
  
  const startDiscussion = () => {
    if (!topic) return;
    setIsDiscussing(true);
    setMessages([]);
    setTimeout(() => {
      setMessages([{ id: 1, dept: 'zhongshu', content: `收到议题：${topic}，开始规划...`, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), round: 1 }]);
    }, 1000);
  };
  
  const exitDiscussion = () => {
    if (messages.length > 0) {
      setHistory(prev => [...prev, { topic: topic || '未命名议题', messages: [...messages], time: new Date().toLocaleString('zh-CN') }]);
    }
    setIsDiscussing(false);
    setMessages([]);
    setTopic('');
  };
  
  const sendMessage = () => {
    if (!input) return;
    const newMsg = { id: messages.length + 1, dept: 'shangshu', content: input, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), round: 1 };
    setMessages([...messages, newMsg]);
    setInput('');
  };
  
  const exportDiscussion = () => {
    const content = `# 朝堂议政记录\n\n议题：${topic || '未命名'}\n参与：${selectedDepts.map(id => DEPTS.find(d => d.id === id)?.name).join('、')}\n\n## 讨论记录\n\n${messages.map(m => {
      const dept = DEPTS.find(d => d.id === m.dept);
      return `**${dept?.name}** (${m.time})\n${m.content}\n`;
    }).join('\n')}\n\n---\n*OpenReign Pro 军机处*`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `朝堂议政-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };
  
  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>朝会</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
            border: '0.5px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.08)', color: '#D4AF37', fontSize: '13px', cursor: 'pointer',
          }}>
            📜 历史记录
          </button>
          {isDiscussing && (
            <button onClick={exitDiscussion} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
              border: '0.5px solid rgba(255,69,58,0.3)', background: 'rgba(255,69,58,0.08)', color: '#FF453A', fontSize: '13px', cursor: 'pointer',
            }}>
              <X size={14} /> 退出议政
            </button>
          )}
          {messages.length > 0 && (
            <button onClick={exportDiscussion} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
              border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer',
            }}>
              <Download size={14} />导出记录
            </button>
          )}
        </div>
      </div>
      
      {/* 历史记录面板 */}
      {showHistory && (
        <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>📜 议政历史</h3>
          {history.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>暂无历史记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid transparent' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{h.topic}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{h.time} · {h.messages.length} 条消息</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {!isDiscussing ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>议政议题</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="输入议题，如：系统架构设计方案" style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '15px', outline: 'none',
              }} />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>参与部门</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {departments.filter(d => d.level >= 2).map(dept => {
                  const Icon = ICON_MAP[dept.icon] || Crown;
                  const isSelected = selectedDepts.includes(dept.id);
                  return (
                    <button key={dept.id} onClick={() => toggleDept(dept.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px',
                      border: `0.5px solid ${isSelected ? dept.color + '60' : 'rgba(255,255,255,0.1)'}`,
                      background: isSelected ? dept.color + '15' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? dept.color : 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer',
                    }}>
                      <Icon size={14} />{dept.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button onClick={startDiscussion} disabled={!topic || selectedDepts.length === 0} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: topic && selectedDepts.length > 0 ? '#D4AF37' : 'rgba(255,255,255,0.1)',
              color: topic && selectedDepts.length > 0 ? '#000' : 'rgba(255,255,255,0.3)',
              fontSize: '15px', fontWeight: 600, cursor: topic && selectedDepts.length > 0 ? 'pointer' : 'not-allowed',
            }}>开始议政</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            {messages.map((m) => {
              const dept = DEPTS.find(d => d.id === m.dept);
              const Icon = dept ? ICON_MAP[dept.icon] : Crown;
              return (
                <div key={m.id} style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: dept?.color + '20' || 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={dept?.color || '#fff'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: dept?.color || '#fff' }}>{dept?.name || '未知'}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{m.time}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{m.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="输入你的意见..." style={{
              flex: 1, padding: '12px 16px', borderRadius: '10px', border: '0.5px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '14px', outline: 'none',
            }} />
            <button onClick={sendMessage} disabled={!input} style={{
              padding: '12px 20px', borderRadius: '10px', border: 'none',
              background: input ? '#0A84FF' : 'rgba(255,255,255,0.1)',
              color: input ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: input ? 'pointer' : 'not-allowed',
            }}><Send size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
