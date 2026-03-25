import { useState, useEffect } from 'react';
import { Swords, Shield, FileText, Wrench, Database, Search, Package } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
  role?: string;
}

const SKILLS = [
  { id: 'step-search', name: '网络搜索', category: 'treasury', version: '1.1.0', uses: 156, desc: 'StepFun搜索引擎集成' },
  { id: 'agent-reach', name: '多平台搜索', category: 'treasury', version: '2.0.0', uses: 89, desc: '16平台内容获取' },
  { id: 'github', name: 'GitHub操作', category: 'bingbu', version: '1.5.0', uses: 234, desc: '代码仓库管理' },
  { id: 'terminal', name: '终端执行', category: 'bingbu', version: '1.2.0', uses: 567, desc: 'Shell命令执行' },
  { id: 'docx', name: 'Word处理', category: 'libu', version: '2.0.1', uses: 123, desc: '文档生成修订' },
  { id: 'pdf', name: 'PDF处理', category: 'libu', version: '1.5.0', uses: 98, desc: 'PDF操作转换' },
  { id: 'docker', name: 'Docker管理', category: 'gongbu', version: '1.3.0', uses: 45, desc: '容器编排部署' },
  { id: 'openviking', name: '记忆存储', category: 'hubu', version: '1.0.0', uses: 312, desc: '长期记忆管理' },
  { id: 'security-audit', name: '安全审计', category: 'xingbu', version: '1.1.0', uses: 67, desc: '代码安全扫描' },
];

export function Armory() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  useEffect(() => {
    fetch('/api/chaoting/bumen')
      .then(r => r.json())
      .then(data => {
        const depts = (data.departments || []).filter((d: any) => d.level >= 2);
        setDepartments([{ id: 'treasury', name: '国库', icon: 'Package', color: '#FFD700' }, ...depts]);
      })
      .catch(() => setDepartments([{ id: 'treasury', name: '国库', icon: 'Package', color: '#FFD700' }]));
  }, []);
  
  const filtered = SKILLS.filter(s => {
    const catMatch = category === 'all' || s.category === category;
    const searchMatch = s.name.includes(search) || s.desc.includes(search);
    return catMatch && searchMatch;
  });
  
  const selectedSkill = SKILLS.find(s => s.id === selected);
  
  const getCategoryName = (catId: string) => {
    if (catId === 'treasury') return '国库';
    const dept = departments.find(d => d.id === catId);
    return dept?.name || catId;
  };
  
  const getCategoryColor = (catId: string) => {
    if (catId === 'treasury') return '#FFD700';
    const dept = departments.find(d => d.id === catId);
    return dept?.color || '#667eea';
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>武备司</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Search size={14} color="rgba(255,255,255,0.3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索兵器..." style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', width: '160px' }} />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setCategory('all')} style={{
          padding: '6px 12px', borderRadius: '8px', border: category === 'all' ? '1px solid #FFD70040' : '0.5px solid rgba(255,255,255,0.06)',
          background: category === 'all' ? 'rgba(255,215,0,0.12)' : 'transparent', color: category === 'all' ? '#FFD700' : 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer',
        }}>全部</button>
        {departments.map(cat => (
          <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px',
            border: category === cat.id ? `1px solid ${cat.color}40` : '0.5px solid rgba(255,255,255,0.06)',
            background: category === cat.id ? `${cat.color}12` : 'transparent', color: category === cat.id ? cat.color : 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer',
          }}>
            {cat.name}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
        {filtered.map(skill => {
          const catColor = getCategoryColor(skill.category);
          const catName = getCategoryName(skill.category);
          return (
            <div key={skill.id} onClick={() => setSelected(skill.id)} style={{
              padding: '14px', borderRadius: '12px', cursor: 'pointer',
              background: selected === skill.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: `0.5px solid ${selected === skill.id ? catColor + '40' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Swords size={16} color={catColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{skill.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{catName}</div>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>v{skill.version}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{skill.desc}</div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>使用 {skill.uses} 次</div>
            </div>
          );
        })}
      </div>
      
      {selectedSkill && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px',
          background: 'rgba(18,18,22,0.95)', backdropFilter: 'blur(40px)',
          borderLeft: '0.5px solid rgba(255,255,255,0.06)', padding: '20px', zIndex: 100,
        }}>
          <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
          <h3 style={{ marginBottom: '16px' }}>{selectedSkill.name}</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>{selectedSkill.desc}</p>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>版本</div>
            <div style={{ fontSize: '13px' }}>{selectedSkill.version}</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>使用次数</div>
            <div style={{ fontSize: '13px' }}>{selectedSkill.uses} 次</div>
          </div>
        </div>
      )}
    </div>
  );
}
