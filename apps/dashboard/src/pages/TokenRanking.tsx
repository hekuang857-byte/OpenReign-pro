import { useState, useEffect } from 'react';
import { Award, Clock, Calendar, BarChart3, Crown, Layers, Shield, Activity, Swords, FileText, Wrench, Database, Globe } from 'lucide-react';

const ICON_MAP: Record<string, any> = { Crown, Layers, Shield, Activity, Swords, FileText, Wrench, Database, Globe };

interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TokenStat {
  dept: string;
  icon: string;
  color: string;
  today: number;
  week: number;
  month: number;
}

export function TokenRanking() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  // departments 预留，后续可能用于部门筛选
  const [, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<TokenStat[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 获取部门列表
    fetch('/api/chaoting/bumen')
      .then(r => r.json())
      .then(data => {
        const depts = (data.departments || []).filter((d: any) => d.enabled !== false);
        setDepartments(depts);
        
        // 生成模拟统计数据（实际应从后端获取）
        const mockStats = depts.map((d: any) => ({
          dept: d.name,
          icon: d.icon,
          color: d.color,
          today: Math.floor(Math.random() * 100000 + 50000),
          week: Math.floor(Math.random() * 600000 + 300000),
          month: Math.floor(Math.random() * 2500000 + 1000000),
        }));
        setStats(mockStats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  
  const sorted = [...stats].sort((a, b) => b[period] - a[period]);
  const total = sorted.reduce((sum, d) => sum + d[period], 0);
  
  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  };
  
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>加载中...</div>;
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>功勋榜</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'today', label: '今日', icon: Clock },
            { key: 'week', label: '本周', icon: Calendar },
            { key: 'month', label: '本月', icon: BarChart3 },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key as any)} style={{
              display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px',
              border: period === p.key ? '1px solid #FFD70040' : '0.5px solid rgba(255,255,255,0.06)',
              background: period === p.key ? 'rgba(255,215,0,0.12)' : 'transparent', color: period === p.key ? '#FFD700' : 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer',
            }}>
              <p.icon size={12} />{p.label}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,215,0,0.05)', border: '0.5px solid rgba(255,215,0,0.15)', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>总消耗</div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFD700' }}>{formatNumber(total)} <span style={{ fontSize: '14px', fontWeight: 400 }}>tokens</span></div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.map((dept, i) => {
          const Icon = ICON_MAP[dept.icon] || Crown;
          const percent = total > 0 ? (dept[period] / total) * 100 : 0;
          return (
            <div key={dept.dept} style={{
              display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: '10px',
              background: i === 0 ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${i === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ width: '24px', fontSize: '14px', fontWeight: 600, color: i < 3 ? '#FFD700' : 'rgba(255,255,255,0.3)' }}>{i + 1}</div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${dept.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                <Icon size={16} color={dept.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{dept.dept}</span>
                  {i === 0 && <Award size={14} color="#FFD700" />}
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: dept.color, borderRadius: '2px' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: dept.color }}>{formatNumber(dept[period])}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{percent.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
