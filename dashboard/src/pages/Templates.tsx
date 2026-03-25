import { useState } from 'react';
import { Scroll, Plus, Terminal, FileText, Search, Bug, Play } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'openclaw-repair',
    name: 'OpenClaw修复',
    category: '系统维护',
    icon: Terminal,
    color: '#FF6B6B',
    desc: '诊断并修复OpenClaw Gateway常见问题',
    complexity: 4,
    params: [
      { name: 'check_gateway', label: '检查Gateway状态', type: 'boolean', default: true },
      { name: 'check_ports', label: '检查端口占用', type: 'boolean', default: true },
      { name: 'auto_fix', label: '尝试自动修复', type: 'boolean', default: false },
    ],
  },
  {
    id: 'code-review',
    name: '代码审查',
    category: '开发',
    icon: FileText,
    color: '#4A90D9',
    desc: '对指定代码进行全面审查',
    complexity: 5,
    params: [
      { name: 'file_path', label: '文件路径', type: 'string', required: true },
      { name: 'focus', label: '审查重点', type: 'select', options: ['security', 'performance', 'style'], default: 'security' },
    ],
  },
  {
    id: 'write-docs',
    name: '编写文档',
    category: '文档',
    icon: Scroll,
    color: '#E74C3C',
    desc: '自动生成项目文档',
    complexity: 3,
    params: [
      { name: 'doc_type', label: '文档类型', type: 'select', options: ['api', 'readme', 'changelog'], default: 'api' },
      { name: 'target_dir', label: '目标目录', type: 'string', default: './docs' },
    ],
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    category: '数据',
    icon: Search,
    color: '#9B59B6',
    desc: '分析数据并生成报告',
    complexity: 4,
    params: [
      { name: 'data_source', label: '数据源', type: 'string', required: true },
      { name: 'analysis_type', label: '分析类型', type: 'select', options: ['summary', 'trend', 'anomaly'], default: 'summary' },
    ],
  },
  {
    id: 'bug-investigation',
    name: '故障排查',
    category: '运维',
    icon: Bug,
    color: '#FF9F0A',
    desc: '系统性排查故障原因',
    complexity: 5,
    params: [
      { name: 'error_msg', label: '错误信息', type: 'string', required: true },
      { name: 'check_logs', label: '检查日志', type: 'boolean', default: true },
    ],
  },
];

export function Templates() {
  const [selected, setSelected] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  
  const template = TEMPLATES.find(t => t.id === selected);
  
  const handleCreate = () => {
    // 诏令宣读动画效果
    const announcement = document.createElement('div');
    announcement.className = 'edict-announcement';
    announcement.innerHTML = `
      <div class="edict-scroll">
        <div class="edict-content">
          <div class="edict-title">诏令</div>
          <div class="edict-body">拟写奏折: ${template?.name}</div>
          <div class="edict-seal">敕</div>
        </div>
      </div>
    `;
    document.body.appendChild(announcement);
    
    // 3秒后移除
    setTimeout(() => {
      announcement.style.opacity = '0';
      setTimeout(() => document.body.removeChild(announcement), 500);
    }, 3000);
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>诏令司</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
          border: '0.5px solid rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.08)', color: '#FFD700', fontSize: '13px', cursor: 'pointer',
        }}>
          <Plus size={14} />新建模板
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {TEMPLATES.map(t => (
          <div key={t.id} onClick={() => { setSelected(t.id); setParams({}); }} style={{
            padding: '16px', borderRadius: '12px', cursor: 'pointer',
            background: selected === t.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            border: `0.5px solid ${selected === t.id ? t.color + '40' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <t.icon size={20} color={t.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{t.category}</div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{t.desc}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>复杂度 {t.complexity}</span>
            </div>
          </div>
        ))}
      </div>
      
      {template && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: '380px',
          background: 'rgba(18,18,22,0.95)', backdropFilter: 'blur(40px)',
          borderLeft: '0.5px solid rgba(255,255,255,0.06)', padding: '20px', zIndex: 100,
        }}>
          <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${template.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <template.icon size={24} color={template.color} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{template.name}</h3>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{template.category} · 复杂度 {template.complexity}</div>
            </div>
          </div>
          
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>{template.desc}</p>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', textTransform: 'uppercase' }}>参数配置</div>
            {template.params.map(param => (
              <div key={param.name} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  {param.label}{'required' in param && param.required && <span style={{ color: '#FF453A' }}>*</span>}
                </label>
                {param.type === 'boolean' ? (
                  <button onClick={() => setParams(p => ({ ...p, [param.name]: !p[param.name] }))} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', cursor: 'pointer',
                  }}>
                    <span>{params[param.name] ?? param.default ? '开启' : '关闭'}</span>
                    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: (params[param.name] ?? param.default) ? '#34C759' : 'rgba(255,255,255,0.15)', position: 'relative' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: (params[param.name] ?? param.default) ? '18px' : '2px', transition: 'left 0.2s' }} />
                    </div>
                  </button>
                ) : param.type === 'select' ? (
                  <select value={params[param.name] ?? param.default} onChange={e => setParams(p => ({ ...p, [param.name]: e.target.value }))} style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px',
                  }}>
                    {'options' in param && param.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={params[param.name] ?? ''} onChange={e => setParams(p => ({ ...p, [param.name]: e.target.value }))} placeholder={param.label} style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px',
                  }} />
                )}
              </div>
            ))}
          </div>
          
          <button onClick={handleCreate} style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            background: template.color, color: '#000', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>
            <Play size={16} style={{ marginRight: '6px' }} />下旨执行
          </button>
        </div>
      )}
    </div>
  );
}
