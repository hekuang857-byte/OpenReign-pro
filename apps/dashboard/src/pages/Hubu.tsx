import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, RefreshCw, Eye, EyeOff, Copy } from 'lucide-react';

interface Wenpai {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'expired' | 'unknown';
  base_url: string;
  models: string[];
  ref_count: number;
  used_by: string[];
  api_key_masked: string;
  created_at: string;
  usage: { total_calls: number; total_tokens: number };
}

export function Hubu() {
  const [wenpaiList, setWenpaiList] = useState<Wenpai[]>([]);
  const [filteredList, setFilteredList] = useState<Wenpai[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'unknown'>('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWenpai, setSelectedWenpai] = useState<Wenpai | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [formData, setFormData] = useState({ name: '', api_key: '', base_url: 'https://api.openai.com/v1', models: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchWenpai = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hubu/wenpai');
      const data = await res.json();
      if (data.success) {
        setWenpaiList(data.wenpai);
        applyFilter(data.wenpai, statusFilter);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const applyFilter = (list: Wenpai[], filter: string) => {
    if (filter === 'all') setFilteredList(list);
    else setFilteredList(list.filter(w => w.status === filter));
  };

  useEffect(() => { fetchWenpai(); }, []);
  useEffect(() => { applyFilter(wenpaiList, statusFilter); }, [statusFilter, wenpaiList]);

  const stats = {
    total: wenpaiList.length,
    active: wenpaiList.filter(w => w.status === 'active').length,
    expired: wenpaiList.filter(w => w.status === 'expired').length,
    unknown: wenpaiList.filter(w => w.status === 'unknown').length,
    totalCalls: wenpaiList.reduce((sum, w) => sum + (w.usage?.total_calls || 0), 0),
    totalCost: wenpaiList.reduce((sum, w) => sum + ((w.usage?.total_tokens || 0) * 0.00003), 0).toFixed(2)
  };

  const fetchModels = async () => {
    if (!formData.api_key || !formData.base_url) {
      setErrorMsg('请填写API密钥和API地址');
      return;
    }
    setErrorMsg('获取中...');
    try {
      const res = await fetch('/api/hubu/wenpai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: formData.api_key, base_url: formData.base_url })
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setFormData(prev => ({ ...prev, models: data.available_models?.join(', ') || '' }));
        setSuccessMsg(`获取成功！共${data.available_models?.length || 0}个模型`);
        setErrorMsg('');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.error || '获取失败，请检查密钥和地址');
      }
    } catch (e) { setErrorMsg('网络错误'); }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.api_key) { setErrorMsg('请填写名称和API密钥'); return; }
    try {
      const res = await fetch('/api/hubu/wenpai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, provider: 'openai', models: formData.models.split(',').map(m => m.trim()).filter(m => m) })
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ name: '', api_key: '', base_url: 'https://api.openai.com/v1', models: '' });
        setErrorMsg('');
        fetchWenpai();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || '创建失败');
      }
    } catch (e) { setErrorMsg('创建失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此API密钥?')) return;
    try {
      const res = await fetch(`/api/hubu/wenpai/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchWenpai();
      else if (data.impact) alert(`该密钥被 ${data.impact.ref_count} 个项目使用，无法删除`);
    } catch (e) { alert('删除失败'); }
  };

  const glass = { background: 'rgba(28,28,30,0.6)', backdropFilter: 'blur(40px)', border: '0.5px solid rgba(255,255,255,0.08)' };

  return (
    <div style={{ padding: '20px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} color="#D4AF37" />
            户部 · 通关文牒司
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>管理API密钥，监控调用与成本</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchWenpai} style={{ padding: '10px 16px', background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.3)', borderRadius: '10px', color: '#0A84FF', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <RefreshCw size={14} /> 刷新
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 16px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Plus size={14} /> 新增文牒
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ ...glass, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>总文牒</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>{stats.total}</div>
        </div>
        <div style={{ ...glass, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#34C759', marginBottom: '6px' }}>正常</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#34C759' }}>{stats.active}</div>
        </div>
        <div style={{ ...glass, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#FF453A', marginBottom: '6px' }}>失效</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#FF453A' }}>{stats.expired}</div>
        </div>
        <div style={{ ...glass, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#0A84FF', marginBottom: '6px' }}>总调用</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0A84FF' }}>{stats.totalCalls.toLocaleString()}</div>
        </div>
        <div style={{ ...glass, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#AF52DE', marginBottom: '6px' }}>总成本</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#AF52DE' }}>${stats.totalCost}</div>
        </div>
      </div>

      {/* 状态筛选 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { key: 'all', label: '全部', color: '#fff' },
          { key: 'active', label: '正常', color: '#34C759' },
          { key: 'expired', label: '失效', color: '#FF453A' },
          { key: 'unknown', label: '未知', color: '#FF9F0A' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key as any)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid ' + (statusFilter === f.key ? f.color : 'rgba(255,255,255,0.1)'),
              background: statusFilter === f.key ? f.color + '20' : 'transparent',
              color: f.color,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 文牒列表 */}
      <div style={{ ...glass, borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>加载中...</div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <Database size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
            <div>暂无文牒</div>
            <div style={{ fontSize: '13px', marginTop: '8px' }}>点击"新增文牒"添加API密钥</div>
          </div>
        ) : (
          filteredList.map(w => (
            <div
              key={w.id}
              onClick={() => { setSelectedWenpai(w); setShowDetailModal(true); setShowKey(false); }}
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 500 }}>{w.name}</span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: w.status === 'active' ? 'rgba(52,199,89,0.15)' : w.status === 'expired' ? 'rgba(255,69,58,0.15)' : 'rgba(255,159,10,0.15)',
                    color: w.status === 'active' ? '#34C759' : w.status === 'expired' ? '#FF453A' : '#FF9F0A'
                  }}>
                    {w.status === 'active' ? '● 正常' : w.status === 'expired' ? '● 失效' : '● 未知'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {w.base_url} · {(w.usage?.total_calls || 0).toLocaleString()}次调用 · 引用{w.ref_count}个项目
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                style={{
                  padding: '8px',
                  background: 'rgba(255,69,58,0.1)',
                  border: '1px solid rgba(255,69,58,0.25)',
                  borderRadius: '8px',
                  color: '#FF453A',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 新增弹窗 */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...glass, borderRadius: '16px', padding: '24px', width: '420px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>新增通关文牒</h3>
            <input placeholder="名称" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px' }} />
            <input type="password" placeholder="API密钥 (sk-...)" value={formData.api_key} onChange={e => setFormData({...formData, api_key: e.target.value})} style={{ width: '100%', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px' }} />
            <input placeholder="API地址" value={formData.base_url} onChange={e => setFormData({...formData, base_url: e.target.value})} style={{ width: '100%', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input placeholder="模型 (逗号分隔)" value={formData.models} onChange={e => setFormData({...formData, models: e.target.value})} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px' }} />
              <button onClick={fetchModels} style={{ padding: '12px 16px', background: 'rgba(10,132,255,0.15)', border: '1px solid rgba(10,132,255,0.3)', borderRadius: '10px', color: '#0A84FF', fontSize: '13px', whiteSpace: 'nowrap' }}>获取模型</button>
            </div>
            {errorMsg && <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(255,69,58,0.1)', borderRadius: '8px', color: '#FF453A', fontSize: '13px' }}>{errorMsg}</div>}
            {successMsg && <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(52,199,89,0.1)', borderRadius: '8px', color: '#34C759', fontSize: '13px' }}>{successMsg}</div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>取消</button>
              <button onClick={handleCreate} style={{ padding: '10px 20px', background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', color: '#D4AF37', fontSize: '14px' }}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetailModal && selectedWenpai && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...glass, borderRadius: '16px', padding: '24px', width: '460px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedWenpai.name}</h3>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>状态</div>
              <span style={{ padding: '4px 12px', borderRadius: '10px', fontSize: '12px', background: selectedWenpai.status === 'active' ? 'rgba(52,199,89,0.15)' : 'rgba(255,69,58,0.15)', color: selectedWenpai.status === 'active' ? '#34C759' : '#FF453A' }}>
                {selectedWenpai.status === 'active' ? '● 正常' : '● 失效'}
              </span>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>API地址</div>
              <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{selectedWenpai.base_url}</div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>API密钥</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
                  {showKey ? selectedWenpai.api_key_masked : 'sk-••••••••••••••••••••••••••••••'}
                </code>
                <button onClick={() => setShowKey(!showKey)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)' }}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => navigator.clipboard.writeText(selectedWenpai.api_key_masked)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)' }}>
                  <Copy size={16} />
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>可用模型</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedWenpai.models.map(m => (
                  <span key={m} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '12px' }}>{m}</span>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>消耗记录</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>总调用</div>
                  <div style={{ fontSize: '18px', color: '#0A84FF' }}>{(selectedWenpai.usage?.total_calls || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>总Tokens</div>
                  <div style={{ fontSize: '18px', color: '#AF52DE' }}>{((selectedWenpai.usage?.total_tokens || 0) / 1000).toFixed(1)}K</div>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>引用项目 ({selectedWenpai.ref_count})</div>
              {selectedWenpai.used_by?.length > 0 ? (
                selectedWenpai.used_by.map(pid => (
                  <div key={pid} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '13px', marginBottom: '4px' }}>{pid}</div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>暂无项目引用</div>
              )}
            </div>
            
            <button onClick={() => setShowDetailModal(false)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer' }}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
