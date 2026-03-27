import { useEffect, useState } from 'react';

interface HeartbeatStatus {
  status: 'healthy' | 'warning' | 'error';
  lastSeen: number;
  latency: number;
}

export function useHeartbeat(deptId: string) {
  const [status, setStatus] = useState<HeartbeatStatus>({ status: 'healthy', lastSeen: Date.now(), latency: 0 });
  
  useEffect(() => {
    const check = async () => {
      try {
        const start = Date.now();
        const res = await fetch(`/api/heartbeat/${deptId}`);
        const latency = Date.now() - start;
        if (res.ok) {
          setStatus({ status: 'healthy', lastSeen: Date.now(), latency });
        } else {
          setStatus(prev => ({ ...prev, status: 'warning', latency }));
        }
      } catch {
        setStatus(prev => ({ ...prev, status: 'error', latency: -1 }));
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [deptId]);
  
  return status;
}

export function HeartbeatDot({ status }: { status: 'healthy' | 'warning' | 'error' }) {
  const colors = { healthy: '#34C759', warning: '#FF9F0A', error: '#FF453A' };
  return (
    <div style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: colors[status],
      boxShadow: status === 'healthy' ? '0 0 8px #34C759' : 'none',
      animation: status === 'healthy' ? 'pulse 2s infinite' : 'none',
    }} />
  );
}
