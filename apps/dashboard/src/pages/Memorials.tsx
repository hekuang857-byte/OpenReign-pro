import { useState, useEffect } from 'react';
import { Download, ChevronRight } from 'lucide-react';

// ICON_MAP 预留，后续可能用于图标映射
// const ICON_MAP: Record<string, any> = { Crown, Layers, Shield, Activity, Swords, ScrollText: ScrollText, CheckCircle2, Globe };

interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: number;
}

interface Memorial {
  id: string;
  title: string;
  deptId: string;
  已批阅At: string;
  stages: string[];
}

export function Memorials() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [stageConfig, setStageConfig] = useState<Record<string, { name: string; color: string }>>({});
  
  useEffect(() => {
    fetch('/api/chaoting/bumen')
      .then(r => r.json())
      .then(data => {
        const depts = data.departments || [];
        setDepartments(depts);
        
        // 动态生成 stageConfig
        const config: Record<string, { name: string; color: string }> = {
          已批阅: { name: '回奏完成', color: '#34C759' },
        };
        depts.forEach((d: Department) => {
          const roleName = d.level === 1 ? '分拣' : d.level === 2 ? '辅政' : '执行';
          config[d.id] = { name: `${d.name}${roleName}`, color: d.color };
        });
        setStageConfig(config);
        
        // 模拟奏折数据（实际应从后端获取）
        setMemorials([
          { id: 'JJC-20260324-001', title: 'Dashboard重构任务', deptId: 'bingbu', 已批阅At: '2026-03-24 15:30', stages: ['taizi', 'zhongshu', 'menxia', 'shangshu', 'bingbu', '已批阅'] },
          { id: 'JJC-20260324-002', title: 'OpenClaw控制面板集成', deptId: 'libu-justice', 已批阅At: '2026-03-24 14:20', stages: ['taizi', 'zhongshu', 'menxia', 'shangshu', 'libu-justice', '已批阅'] },
          { id: 'JJC-20260323-001', title: '模型选择器优化', deptId: 'hubu', 已批阅At: '2026-03-23 18:00', stages: ['taizi', 'zhongshu', 'menxia', 'shangshu', 'hubu', '已批阅'] },
        ]);
      })
      .catch(() => {});
  }, []);
  
  const getDeptName = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || deptId;
  };
  
  const exportMarkdown = (m: Memorial) => {
    const content = `# 奏折 · ${m.id}\n\n**${m.title}**\n\n- 执行部门：${getDeptName(m.deptId)}\n- 完成时间：${m.已批阅At}\n\n## 流转记录\n\n${m.stages.map((s, i) => `${i + 1}. ${stageConfig[s]?.name || s}`).join('\n')}\n\n---\n*OpenReign Pro 军机处*\n`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${m.id}.md`;
    a.click();
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>存档阁</h2>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>已批奏折归档</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {memorials.map(m => (
          <div key={m.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{m.id}</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{m.title}</div>
              </div>
              <button onClick={() => exportMarkdown(m)} style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px',
                border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer',
              }}>
                <Download size={12} />导出
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {m.stages.map((stage, i) => {
                const cfg = stageConfig[stage];
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px',
                      background: `${cfg?.color || '#667eea'}15`,
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg?.color || '#667eea' }} />
                      <span style={{ fontSize: '11px', color: cfg?.color || '#667eea' }}>{cfg?.name || stage}</span>
                    </div>
                    {i < m.stages.length - 1 && <ChevronRight size={12} color="rgba(255,255,255,0.2)" style={{ margin: '0 4px' }} />}
                  </div>
                );
              })}
            </div>
            
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>完成于 {m.已批阅At}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
