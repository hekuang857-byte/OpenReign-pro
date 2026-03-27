import { useState, useEffect } from 'react';
import { Crown, ScrollText, Activity, Users } from 'lucide-react';

export function Ceremony({ onClose, stats }: { onClose: () => void; stats: { 待受理: number; 已批阅: number; activeDepts: number } }) {
  const [counts, setCounts] = useState({ 待受理: 0, 已批阅: 0, activeDepts: 0 });
  
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    const interval = setInterval(() => {
      setCounts(prev => ({
        待受理: Math.min(prev.待受理 + Math.ceil(stats.待受理 / 20), stats.待受理),
        已批阅: Math.min(prev.已批阅 + Math.ceil(stats.已批阅 / 20), stats.已批阅),
        activeDepts: Math.min(prev.activeDepts + 1, stats.activeDepts),
      }));
    }, 80);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [stats, onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.5s ease',
    }}>
      <div style={{
        textAlign: 'center', padding: '60px',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(102,126,234,0.1) 100%)',
        borderRadius: '24px', border: '1px solid rgba(255,215,0,0.2)',
      }}>
        <Crown size={64} color="#FFD700" style={{ marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }} />
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', background: 'linear-gradient(90deg, #FFD700, #FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>上朝仪式</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '40px' }}>OpenReign Pro v1.2.2 · 军机处 Dashboard</p>
        
        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <ScrollText size={24} color="#FF9F0A" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#FF9F0A' }}>{counts.待受理}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>待办旨意</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Activity size={24} color="#34C759" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#34C759' }}>{counts.已批阅}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>已批奏折</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Users size={24} color="#0A84FF" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#0A84FF' }}>{counts.activeDepts}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>活跃官员</div>
          </div>
        </div>
      </div>
    </div>
  );
}
