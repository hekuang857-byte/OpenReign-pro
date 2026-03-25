import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2,
  Terminal, ChevronDown, ChevronUp, Trash2, Clock, Brain,
  Eye, Zap, RotateCcw, PlusCircle, XCircle, Package,
  Activity, Square, MessageSquare, Shield, Cpu,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface CommandRecord {
  id: string;
  command: string;
  timestamp: Date;
  status: 'success' | 'error' | '待受理';
  output?: string;
  duration?: number;
}

interface ConnectionInfo {
  endpoint: string;
  responseTime: number | null;
  version: string | null;
  uptime: string | null;
  model: string | null;
}

// ─── OpenClaw Slash Commands (from official docs) ─────
// Reference: https://docs.openclaw.ai/tools/slash-commands

const THINKING_LEVELS = [
  { value: 'off',     label: '关闭',   desc: '无推理' },
  { value: 'minimal', label: '极简',   desc: 'think' },
  { value: 'low',     label: '轻度',   desc: 'think hard' },
  { value: 'medium',  label: '中等',   desc: 'think harder' },
  { value: 'high',    label: '深度',   desc: 'ultrathink' },
  { value: 'xhigh',  label: '极深',   desc: 'ultrathink+' },
] as const;

const REASONING_LEVELS = [
  { value: 'on',     label: '开启',   desc: '显示推理过程' },
  { value: 'off',    label: '关闭',   desc: '隐藏推理过程' },
  { value: 'stream', label: '流式',   desc: 'Telegram draft 流式' },
] as const;

const VERBOSE_LEVELS = [
  { value: 'on',   label: '开启', desc: '显示工具调用摘要' },
  { value: 'full', label: '完整', desc: '显示完整工具输出' },
  { value: 'off',  label: '关闭', desc: '静默模式' },
] as const;

const ELEVATED_LEVELS = [
  { value: 'on',   label: '开启', desc: '允许提权操作' },
  { value: 'off',  label: '关闭', desc: '禁止提权操作' },
  { value: 'ask',  label: '询问', desc: '提权时询问确认' },
  { value: 'full', label: '完全', desc: '跳过 exec 审批' },
] as const;

const QUICK_COMMANDS: Array<{ cmd: string; icon: any; label: string; desc: string; color: string; category: string; confirm?: boolean }> = [
  { cmd: '/status',    icon: Activity,      label: '状态',     desc: '查看当前状态',       color: '#50C878', category: 'info' },
  { cmd: '/context',   icon: MessageSquare, label: '上下文',   desc: '查看上下文详情',     color: '#4A90D9', category: 'info' },
  { cmd: '/compact',   icon: Package,       label: '压缩',     desc: '压缩上下文',         color: '#FF8C42', category: 'manage' },
  { cmd: '/new',       icon: PlusCircle,    label: '新会话',   desc: '创建新会话',         color: '#667eea', category: 'manage' },
  { cmd: '/stop',      icon: Square,        label: '停止',     desc: '停止当前任务',       color: '#FFD700', category: 'danger' },
  { cmd: '/reset',     icon: RotateCcw,     label: '重置',     desc: '重置会话',           color: '#FF8C42', category: 'danger', confirm: true },
  { cmd: '/kill all',  icon: XCircle,       label: '终止全部', desc: '终止所有子 agent',   color: '#FF6B6B', category: 'danger', confirm: true },
];

// ─── Model Presets — loaded dynamically from /api/models ──
// Fallback shown while loading or if API fails
const FALLBACK_MODELS: Array<{ id: string; name: string; provider: string; reasoning?: boolean }> = [
  { id: 'inherit', name: '继承默认', provider: 'system' },
];

// ─── Gateway Config ───────────────────────────────────
const GATEWAY_ENDPOINT = 'http://localhost:18789';
const HEALTH_CHECK_INTERVAL = 5000;
const MAX_RETRIES = 3;
const MAX_HISTORY = 50;

// ─── Component ────────────────────────────────────────
interface OpenClawPanelProps {
  onCommandExecuted?: (command: string, result: any) => void;
}

export default function OpenClawPanel({ onCommandExecuted }: OpenClawPanelProps) {
  // ─ Connection state
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('connecting');
  const [connInfo, setConnInfo] = useState<ConnectionInfo>({
    endpoint: GATEWAY_ENDPOINT,
    responseTime: null,
    version: null,
    uptime: null,
    model: null,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastPing, setLastPing] = useState<Date>(new Date());

  // ─ UI state
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);

  // ─ Session state (from Gateway)
  const [thinkLevel, setThinkLevel] = useState<string>('low');
  const [reasoningLevel, setReasoningLevel] = useState<string>('off');
  const [verboseLevel, setVerboseLevel] = useState<string>('off');
  const [elevatedLevel, setElevatedLevel] = useState<string>('off');
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; provider: string; reasoning?: boolean }>>([]);
  const [primaryModel, setPrimaryModel] = useState<string | null>(null);

  // ─ Command history
  const [history, setHistory] = useState<CommandRecord[]>([]);

  // ─ Custom command input
  const [customCmd, setCustomCmd] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Health Check ──────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      const elapsed = Date.now() - start;

      if (res.ok) {
        const data = await res.json();
        setConnStatus('connected');
        setRetryCount(0);
        setConnInfo(prev => ({
          ...prev,
          responseTime: elapsed,
          version: data?.openclaw?.version || data?.version || prev.version,
          uptime: data?.openclaw?.uptime || data?.uptime || prev.uptime,
          model: data?.openclaw?.model || data?.model || prev.model,
        }));
      } else {
        setConnStatus('error');
      }
    } catch {
      setConnStatus('disconnected');
    }
    setLastPing(new Date());
  }, []);

  // Periodic health check
  useEffect(() => {
    checkHealth();
    const iv = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(iv);
  }, [checkHealth]);

  // Auto-retry on disconnect
  useEffect(() => {
    if (connStatus === 'disconnected' && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        checkHealth();
        setRetryCount(c => c + 1);
      }, 3000 * (retryCount + 1));
      return () => clearTimeout(timer);
    }
  }, [connStatus, retryCount, checkHealth]);

  // Fetch available models from config
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          if (data.models?.length) {
            setAvailableModels(data.models);
          }
          if (data.primary) {
            setPrimaryModel(data.primary);
            if (!currentModel) setCurrentModel(data.primary);
          }
        }
      } catch {}
    };
    fetchModels();
  }, []);

  // ─── Send Command ─────────────────────────────────
  const sendCommand = useCallback(async (command: string) => {
    const record: CommandRecord = {
      id: Date.now().toString(),
      command,
      timestamp: new Date(),
      status: '待受理',
    };
    setHistory(prev => [record, ...prev].slice(0, MAX_HISTORY));

    const start = Date.now();
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      const duration = Date.now() - start;

      setHistory(prev =>
        prev.map(r =>
          r.id === record.id
            ? { ...r, status: res.ok ? 'success' : 'error', output: data.message || JSON.stringify(data), duration }
            : r
        )
      );

      // Update local state based on command
      if (command.startsWith('/think')) {
        const lvl = command.split(/\s+/)[1];
        if (lvl) setThinkLevel(lvl);
      } else if (command.startsWith('/reasoning')) {
        const lvl = command.split(/\s+/)[1];
        if (lvl) setReasoningLevel(lvl);
      } else if (command.startsWith('/verbose')) {
        const lvl = command.split(/\s+/)[1];
        if (lvl) setVerboseLevel(lvl);
      } else if (command.startsWith('/elevated')) {
        const lvl = command.split(/\s+/)[1];
        if (lvl) setElevatedLevel(lvl);
      } else if (command.startsWith('/fast')) {
        const mode = command.split(/\s+/)[1];
        if (mode === 'on') setFastMode(true);
        else if (mode === 'off') setFastMode(false);
      } else if (command.startsWith('/model') && command.split(/\s+/).length > 1) {
        const m = command.replace('/model', '').trim();
        if (m && m !== 'list' && m !== 'status') setCurrentModel(m);
      }

      onCommandExecuted?.(command, data);
    } catch (err: any) {
      setHistory(prev =>
        prev.map(r =>
          r.id === record.id
            ? { ...r, status: 'error', output: `网络错误: ${err.message}`, duration: Date.now() - start }
            : r
        )
      );
    }
  }, [onCommandExecuted]);

  // Handle command with optional confirmation
  const handleCommand = (cmd: string, needsConfirm?: boolean) => {
    if (needsConfirm) {
      setConfirmCmd(cmd);
    } else {
      sendCommand(cmd);
    }
  };

  // Handle custom command submit
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = customCmd.trim();
    if (!cmd) return;
    sendCommand(cmd.startsWith('/') ? cmd : `/${cmd}`);
    setCustomCmd('');
  };

  // ─── Manual Refresh ───────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setConnStatus('connecting');
    await checkHealth();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // ─── Helpers ──────────────────────────────────────
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const statusColor = (() => {
    switch (connStatus) {
      case 'connected': return '#50C878';
      case 'disconnected': return '#FF6B6B';
      case 'connecting': return '#FF8C42';
      case 'error': return '#FFD700';
    }
  })();

  const statusText = (() => {
    switch (connStatus) {
      case 'connected': return 'Gateway 已连接';
      case 'disconnected': return retryCount > 0 ? `未连接 (重试 ${retryCount}/${MAX_RETRIES})` : '未连接';
      case 'connecting': return '连接中...';
      case 'error': return '连接异常';
    }
  })();

  // ─── Styles ────────────────────────────────────────
  const s = {
    panel: {
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '24px',
      color: '#fff',
      marginBottom: '24px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.45)',
      fontWeight: 500 as const,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    } as React.CSSProperties,
    btnGroup: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '6px',
    } as React.CSSProperties,
    divider: {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
      margin: '16px 0',
    } as React.CSSProperties,
  };

  const makeBtn = (active: boolean, color: string) => ({
    padding: '6px 12px',
    borderRadius: '6px',
    border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
    background: active ? `${color}20` : 'rgba(255,255,255,0.04)',
    color: active ? color : 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  });

  // ─── Render ────────────────────────────────────────
  return (
    <div style={s.panel}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Terminal size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>OpenClaw 控制面板</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              斜杠命令 · 实时控制
            </div>
          </div>
        </div>
        <button onClick={handleRefresh} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '6px',
          background: 'rgba(102,126,234,0.12)', border: '1px solid rgba(102,126,234,0.25)',
          color: '#667eea', fontSize: '12px', cursor: 'pointer',
        }}>
          <RefreshCw size={13} style={{ animation: isRefreshing ? 'openclaw-spin 0.5s linear infinite' : 'none' }} />
          刷新
        </button>
      </div>

      {/* ── Connection Status Bar ── */}
      <div
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: showDetails ? '10px 10px 0 0' : '10px',
          cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)',
          borderBottom: showDetails ? 'none' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: statusColor,
            boxShadow: connStatus === 'connected' ? `0 0 8px ${statusColor}` : 'none',
            animation: connStatus === 'connecting' ? 'openclaw-pulse 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: '13px', color: statusColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {connStatus === 'connected' ? <Wifi size={13} /> : connStatus === 'disconnected' ? <WifiOff size={13} /> : <RefreshCw size={13} />}
            {statusText}
          </span>
          {connInfo.responseTime !== null && connStatus === 'connected' && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{connInfo.responseTime}ms</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {formatTime(lastPing)}
          </span>
          {showDetails ? <ChevronUp size={13} color="#666" /> : <ChevronDown size={13} color="#666" />}
        </div>
      </div>

      {/* ── Connection Details ── */}
      {showDetails && (
        <div style={{
          padding: '14px', background: 'rgba(0,0,0,0.15)',
          borderRadius: '0 0 10px 10px', marginBottom: '0',
          border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none',
        }}>
          {[
            { label: 'Gateway 端点', value: connInfo.endpoint },
            { label: '响应时间', value: connInfo.responseTime ? `${connInfo.responseTime}ms` : '—' },
            { label: '版本', value: connInfo.version || '—' },
            { label: '运行时长', value: connInfo.uptime || '—' },
            { label: '当前模型', value: currentModel || connInfo.model || '—' },
          ].map((item, i, arr) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '6px 0',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{item.label}</span>
              <span style={{ fontSize: '12px', color: '#ccc', fontFamily: 'monospace' }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s.divider} />

      {/* ── Thinking Level ── */}
      <div style={{ marginBottom: '14px' }}>
        <div style={s.sectionTitle}>
          <Brain size={12} /> 思考深度 <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>/think</code>
        </div>
        <div style={s.btnGroup}>
          {THINKING_LEVELS.map(lvl => (
            <button
              key={lvl.value}
              onClick={() => handleCommand(`/think ${lvl.value}`)}
              title={lvl.desc}
              style={makeBtn(thinkLevel === lvl.value, '#4A90D9')}
              onMouseEnter={e => { if (thinkLevel !== lvl.value) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { if (thinkLevel !== lvl.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Model Selector ── */}
      <div style={{ marginBottom: '14px' }}>
        <div style={s.sectionTitle}>
          <Cpu size={12} /> 模型选择 <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>/model</code>
        </div>
        {/* Current model display + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: showModelPicker ? '10px' : '0' }}>
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '13px', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: currentModel ? '#50C878' : 'rgba(255,255,255,0.2)',
              }} />
              <span style={{ fontFamily: 'monospace' }}>
                {currentModel || '默认模型'}
              </span>
            </div>
            <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{
              transform: showModelPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
            }} />
          </button>
          <button
            onClick={() => handleCommand('/model list')}
            title="查看所有可用模型"
            style={{
              padding: '8px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer',
            }}
          >
            列表
          </button>
        </div>
        {/* Model picker dropdown */}
        {showModelPicker && (
          <div style={{
            background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
          }}>
            {(() => {
              // Group models by provider
              const modelList = availableModels.length > 0 ? availableModels : FALLBACK_MODELS;
              const groups: Record<string, typeof modelList> = {};
              for (const m of modelList) {
                const p = m.provider || 'other';
                if (!groups[p]) groups[p] = [];
                groups[p].push(m);
              }
              const PROVIDER_COLORS: Record<string, string> = {
                anthropic: '#D97706', openai: '#10B981', stepfun: '#667eea',
                google: '#4285F4', moonshot: '#FF6B9D', system: '#888',
              };
              return Object.entries(groups).map(([provider, models], gi) => {
                const color = PROVIDER_COLORS[provider] || '#667eea';
                return (
                  <div key={provider}>
                    <div style={{
                      padding: '8px 12px', fontSize: '11px', fontWeight: 600,
                      color, background: 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      ...(gi > 0 ? { borderTop: '1px solid rgba(255,255,255,0.04)' } : {}),
                      textTransform: 'capitalize' as const,
                    }}>
                      {provider}
                    </div>
                    {models.map(model => {
                      const isActive = currentModel === model.id;
                      const isPrimary = primaryModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            handleCommand(`/model ${model.id}`);
                            setShowModelPicker(false);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '9px 12px', border: 'none', textAlign: 'left' as const,
                            background: isActive ? `${color}15` : 'transparent',
                            color: isActive ? color : 'rgba(255,255,255,0.7)',
                            fontSize: '13px', cursor: 'pointer', transition: 'background 0.1s',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isActive && <CheckCircle2 size={13} color={color} />}
                            <span style={{ fontFamily: 'monospace' }}>{model.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {model.reasoning && (
                              <span style={{
                                fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                background: 'rgba(74,144,217,0.15)', color: '#4A90D9',
                              }}>推理</span>
                            )}
                            {isPrimary && (
                              <span style={{
                                fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                background: 'rgba(80,200,120,0.15)', color: '#50C878',
                              }}>默认</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* ── Reasoning + Verbose + Fast ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        {/* Reasoning */}
        <div>
          <div style={s.sectionTitle}>
            <Eye size={12} /> 推理显示
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {REASONING_LEVELS.map(lvl => (
              <button
                key={lvl.value}
                onClick={() => handleCommand(`/reasoning ${lvl.value}`)}
                title={lvl.desc}
                style={{ ...makeBtn(reasoningLevel === lvl.value, '#9B59B6'), width: '100%', textAlign: 'left' as const }}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
        {/* Verbose */}
        <div>
          <div style={s.sectionTitle}>
            <MessageSquare size={12} /> 详细输出
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {VERBOSE_LEVELS.map(lvl => (
              <button
                key={lvl.value}
                onClick={() => handleCommand(`/verbose ${lvl.value}`)}
                title={lvl.desc}
                style={{ ...makeBtn(verboseLevel === lvl.value, '#FF8C42'), width: '100%', textAlign: 'left' as const }}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
        {/* Fast Mode */}
        <div>
          <div style={s.sectionTitle}>
            <Zap size={12} /> 快速模式
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => handleCommand(`/fast ${fastMode ? 'off' : 'on'}`)}
              style={{
                ...makeBtn(fastMode, '#50C878'),
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>{fastMode ? '已开启' : '已关闭'}</span>
              <div style={{
                width: '28px', height: '16px', borderRadius: '8px',
                background: fastMode ? '#50C878' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '2px',
                  left: fastMode ? '14px' : '2px', transition: 'left 0.2s',
                }} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Advanced: Elevated ── */}
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '12px', cursor: 'pointer', padding: '4px 0',
          }}
        >
          <ChevronRight size={12} style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          高级设置
        </button>
        {showAdvanced && (
          <div style={{ marginTop: '10px' }}>
            <div style={s.sectionTitle}>
              <Shield size={12} /> 提权模式 <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>/elevated</code>
            </div>
            <div style={s.btnGroup}>
              {ELEVATED_LEVELS.map(lvl => (
                <button
                  key={lvl.value}
                  onClick={() => handleCommand(`/elevated ${lvl.value}`)}
                  title={lvl.desc}
                  style={makeBtn(elevatedLevel === lvl.value, '#E74C3C')}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={s.divider} />

      {/* ── Quick Commands ── */}
      <div style={{ marginBottom: '14px' }}>
        <div style={s.sectionTitle}>
          <Terminal size={12} /> 快捷命令
        </div>
        <div style={s.btnGroup}>
          {QUICK_COMMANDS.map(({ cmd, icon: Icon, label, desc, color, confirm }) => (
            <button
              key={cmd}
              onClick={() => handleCommand(cmd, confirm)}
              title={desc}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 13px', borderRadius: '6px',
                border: `1px solid ${color}30`,
                background: `${color}10`,
                color,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom Command Input ── */}
      <form onSubmit={handleCustomSubmit} style={{
        display: 'flex', gap: '8px', marginBottom: '16px',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '0 12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontFamily: 'monospace' }}>/</span>
          <input
            ref={inputRef}
            value={customCmd}
            onChange={e => setCustomCmd(e.target.value)}
            placeholder="输入命令... (think high, model list, compact)"
            style={{
              flex: 1, background: 'transparent', border: 'none', color: '#fff',
              fontSize: '13px', padding: '10px 0', outline: 'none', fontFamily: 'monospace',
            }}
          />
        </div>
        <button type="submit" style={{
          padding: '0 16px', borderRadius: '8px', border: 'none',
          background: customCmd.trim() ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.05)',
          color: customCmd.trim() ? '#667eea' : 'rgba(255,255,255,0.3)',
          fontSize: '13px', fontWeight: 500, cursor: customCmd.trim() ? 'pointer' : 'default',
        }}>
          执行
        </button>
      </form>

      <div style={s.divider} />

      {/* ── Command History ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              ...s.sectionTitle,
              background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0,
            }}
          >
            <Clock size={12} /> 命令历史 ({history.length})
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', background: 'transparent', border: 'none',
                color: '#FF6B6B', fontSize: '11px', cursor: 'pointer', borderRadius: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={11} /> 清除
            </button>
          )}
        </div>

        {showHistory && (
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                暂无命令记录
              </div>
            ) : (
              history.map(rec => (
                <div key={rec.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ paddingTop: '1px' }}>
                    {rec.status === 'success' && <CheckCircle2 size={14} color="#50C878" />}
                    {rec.status === 'error' && <AlertCircle size={14} color="#FF6B6B" />}
                    {rec.status === '待受理' && <RefreshCw size={14} color="#FF8C42" style={{ animation: 'openclaw-spin 1s linear infinite' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', color: '#ccc', fontFamily: 'monospace' }}>{rec.command}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {rec.duration != null && (
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{rec.duration}ms</span>
                        )}
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{formatTime(rec.timestamp)}</span>
                      </div>
                    </div>
                    {rec.output && (
                      <div style={{
                        fontSize: '11px', color: rec.status === 'error' ? '#FF6B6B' : 'rgba(255,255,255,0.45)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        maxHeight: '60px', overflow: 'hidden',
                      }}>
                        {rec.output.substring(0, 200)}{rec.output.length > 200 ? '…' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmCmd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}
          onClick={() => setConfirmCmd(null)}
        >
          <div
            style={{
              background: '#1a1a2e', borderRadius: '16px', padding: '24px', width: '360px',
              border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,107,107,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={22} color="#FF6B6B" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>确认执行</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>此操作不可撤销</div>
              </div>
            </div>
            <div style={{
              padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '20px',
              fontFamily: 'monospace', fontSize: '14px', color: '#FF6B6B',
            }}>
              {confirmCmd}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmCmd(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: '#fff', fontSize: '13px', cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={() => { sendCommand(confirmCmd); setConfirmCmd(null); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: 'rgba(255,107,107,0.3)', color: '#FF6B6B', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes openclaw-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes openclaw-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
