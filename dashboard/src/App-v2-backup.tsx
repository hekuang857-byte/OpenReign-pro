import { useState, useEffect, useCallback } from 'react';
import {
  Activity, CheckCircle2, Play, Settings, Search, Zap, Layers,
  Database, Shield, Wrench, FileText, Crown, X, Globe, Eye, Trash2,
  ChevronDown, AlertCircle, Info
} from 'lucide-react';
import './design-system.css';
import './imperial-theme.css';
import './animations.css';
import OpenClawPanel from './OpenClawPanel';
// @ts-ignore - 新功能组件，待整合
import { Ceremony } from './components/Ceremony';
import { Ceremony } from './components/Ceremony';
// @ts-ignore
import { Memorials } from './pages/Memorials';
// @ts-ignore
import { Armory } from './pages/Armory';
// @ts-ignore
import { Memorials } from './pages/Memorials';
// @ts-ignore
import { Templates } from './pages/Templates';
// @ts-ignore
import { CronTasks } from './pages/CronTasks';
// @ts-ignore
import { CourtDiscussion } from './pages/CourtDiscussion';
// @ts-ignore
import { TokenRanking } from './pages/TokenRanking';

// ═══════════════════════════════════════════
// Toast System (Apple-style glassmorphism)
// ═══════════════════════════════════════════
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: number; type: ToastType; message: string; exiting?: boolean }
let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3000);
  }, []);
  return { toasts, add };
}

const TOAST_COLORS: Record<ToastType, string> = { success: '#34C759', error: '#FF453A', info: '#0A84FF', warning: '#FF9F0A' };
const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = { success: CheckCircle2, error: AlertCircle, info: Info, warning: AlertCircle };

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => {
        const Icon = TOAST_ICONS[t.type]; const color = TOAST_COLORS[t.type];
        return (
          <div key={t.id} className={t.exiting ? 'toast-exit' : 'toast-enter'} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderRadius: '14px',
            background: 'rgba(28,28,30,0.82)', backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: '0.5px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            minWidth: '240px',
          }}>
            <Icon size={16} color={color} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// Count-up Animation
// ═══════════════════════════════════════════
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      // Apple ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const d = useCountUp(value);
  return <>{d}{suffix}</>;
}

// ═══════════════════════════════════════════
// Icon Map (lucide name → component)
// ═══════════════════════════════════════════
const ICON_MAP: Record<string, any> = {
  Crown, Layers, Shield, Activity, Globe, Database, FileText, Wrench, Zap,
};

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface Department {
  id: string; name: string; nameEn: string; level: number; status: string;
  model: string; role: string; icon: string; color: string;
  canCall: string[]; cannotCall: string[]; functions: string[]; enabled: boolean;
  resourceLimits?: any;
}

interface MemoryLevel {
  id: string; key: string; description: string; storage: string; ttl: string;
}

// ═══════════════════════════════════════════
// Fallback mock data (used when API unavailable)
// ═══════════════════════════════════════════
const MOCK_TASKS = [
  { id: 'JJC-20260324-001', status: 'zhongshu', department: '中书省', progress: 45, time: '2分钟前', created: '2026-03-24 10:30', phase: '任务规划与拆解', totalCost: 0.05, totalTokens: 1500 },
  { id: 'JJC-20260324-002', status: 'doing', department: '兵部', progress: 78, time: '5分钟前', created: '2026-03-24 10:25', phase: '代码执行中', totalCost: 0.12, totalTokens: 3200 },
  { id: 'JJC-20260324-003', status: '已批阅', department: '户部', progress: 100, time: '10分钟前', created: '2026-03-24 10:15', phase: '已完成', totalCost: 0.08, totalTokens: 2100 },
  { id: 'JJC-20260324-004', status: 'menxia', department: '门下省', progress: 30, time: '15分钟前', created: '2026-03-24 10:10', phase: '审核监督中', totalCost: 0.03, totalTokens: 900 },
  { id: 'JJC-20260324-005', status: 'doing', department: '礼部', progress: 60, time: '20分钟前', created: '2026-03-24 10:05', phase: '文档生成中', totalCost: 0.06, totalTokens: 1800 },
];

const MOCK_SKILLS = [
  { id: 'xlsx', name: 'Excel处理', version: '1.2.0', status: 'installed', description: 'Excel文件读写和数据分析' },
  { id: 'docx', name: 'Word处理', version: '2.0.1', status: 'update-available', description: 'Word文档生成和修订' },
  { id: 'pdf', name: 'PDF处理', version: '1.5.0', status: 'installed', description: 'PDF文件操作和转换' },
  { id: 'pptx', name: 'PPT处理', version: '1.0.0', status: 'conflict', description: '演示文稿创建和修订' },
];

const MOCK_MEMORY = [
  { id: '1', level: 'L0', content: '当前计算草稿', time: '刚刚', size: '0.5KB' },
  { id: '2', level: 'L1', content: '当前会话上下文', time: '刚刚', size: '2.3KB' },
  { id: '3', level: 'L2', content: 'Dashboard 重构任务', time: '2小时前', size: '5.1KB' },
  { id: '4', level: 'L3', content: '项目架构信息', time: '1天前', size: '12.5KB' },
  { id: '5', level: 'L3', content: '用户偏好配置', time: '3天前', size: '8.3KB' },
  { id: '6', level: 'L4', content: '核心知识库', time: '7天前', size: '25.6KB' },
  { id: '7', level: 'L4', content: '系统安全策略', time: '30天前', size: '15.2KB' },
];

const LEVEL_COLORS: Record<string, string> = { L0: '#8E8E93', L1: '#34C759', L2: '#FF9F0A', L3: '#0A84FF', L4: '#AF52DE' };
const LEVEL_NAMES: Record<string, string> = { L0: '临时', L1: '会话', L2: '短期', L3: '长期', L4: '永久' };

// 新状态机颜色
const STATUS_COLORS: Record<string, string> = {
  待受理: '#8E8E93',    // 等待中 - 灰色
  taizi: '#FFD700',      // 太子分拣 - 金色
  zhongshu: '#4A90D9',   // 中书规划 - 蓝色
  menxia: '#7B68EE',     // 门下审核 - 紫色
  assigned: '#FF8C42',   // 已派发 - 橙色
  doing: '#34C759',      // 执行中 - 绿色
  review: '#0A84FF',     // 汇总审核 - 亮蓝
  已批阅: '#34C759',  // 已完成 - 绿色
  被驳回: '#FF453A',     // 失败 - 红色
  cancelled: '#8E8E93',  // 已取消 - 灰色
};

const STATUS_NAMES: Record<string, string> = {
  待受理: '等待中',
  taizi: '太子分拣',
  zhongshu: '中书规划',
  menxia: '门下审核',
  assigned: '已派发',
  doing: '执行中',
  review: '汇总审核',
  已批阅: '已完成',
  被驳回: '失败',
  cancelled: '已取消',
  active: '活跃',
  busy: '忙碌',
  idle: '空闲',
};

// ═══════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════
function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [cancelledTasks, setCancelledTasks] = useState<string[]>([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [skillFilter, setSkillFilter] = useState('all');
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryLevelFilter, setMemoryLevelFilter] = useState('all');
  const [pageAnimation, setPageAnimation] = useState('');

  // Dynamic data from API
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levelDefs, setLevelDefs] = useState<Array<{ level: number; name: string; color: string }>>([]);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [skills, setSkills] = useState(MOCK_SKILLS);
  const [memoryLevels, setMemoryLevels] = useState<MemoryLevel[]>([]);
  const [memoryData] = useState(MOCK_MEMORY);
  const [openvikingStatus, setOpenvikingStatus] = useState<{ enabled: boolean; connected: boolean; message: string; endpoint: string | null }>({ enabled: false, connected: false, message: '', endpoint: null });
  const [configWarnings, setConfigWarnings] = useState<string[]>([]);
  const [deptModels, setDeptModels] = useState<Record<string, string>>({});
  
  // 获取真实任务数据
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/zouzhe/kanban?view=all');
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          // 转换后端数据格式到前端格式
          const formattedTasks = data.tasks.map((t: any) => ({
            id: t.taskId,
            status: t.status,
            department: t.currentDept || '未知',
            progress: t.progress || 0,
            time: t.lastProgressAt ? new Date(t.lastProgressAt).toLocaleString() : '未知',
            created: new Date(t.startTime).toLocaleString(),
            phase: t.metadata?.phase || '执行中',
            totalCost: t.totalCost || 0,
            totalTokens: t.totalTokens || 0,
          }));
          setTasks(formattedTasks);
        }
      }
    } catch (e) {
      console.error('获取任务失败:', e);
    }
  };

  // 初始加载任务
  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 10000); // 10秒刷新
    return () => clearInterval(timer);
  }, []);
  const animations = ['page-transition-scroll', 'page-transition-ink', 'page-transition-dragon', 'page-transition-burst', 'page-transition-mist'];
  
  const handleTabChange = (tabId: string) => {
    setPageAnimation(animations[Math.floor(Math.random() * animations.length)]);
    setActiveTab(tabId);
    // 回到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 动画结束后清除类名
    setTimeout(() => setPageAnimation(''), 1000);
  };
  const [configVersion, setConfigVersion] = useState<number>(0);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  const { toasts, add: addToast } = useToast();

  // ─── WebSocket 实时同步 ───
  useEffect(() => {
    const ws = new WebSocket("ws://" + window.location.host + "/ws");
    
    ws.onopen = () => console.log('[Dashboard] WebSocket 已连接');
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'config_changed') {
          console.log('[Dashboard] 配置已精进:', msg.version);
          setConfigVersion(msg.version);
          setShowUpdateToast(true);
          // 3秒后自动刷新
          setTimeout(() => { setShowUpdateToast(false); refreshAllData(); }, 3000);
        }
      } catch {}
    };
    
    ws.onclose = () => console.log('[Dashboard] WebSocket 已断开');
    
    return () => ws.close();
  }, []);

  // 刷新所有数据
  const refreshAllData = () => {
    fetch('/api/chaoting/bumen').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.departments?.length) { setDepartments(data.departments); if (data.levelDefinitions?.length) setLevelDefs(data.levelDefinitions); }
    }).catch(() => {});
    fetch('/api/models').then(r => r.ok ? r.json() : null).then(data => { if (data?.models?.length) setAvailableModels(data.models); }).catch(() => {});
    fetch('/api/skills').then(r => r.ok ? r.json() : null).then(data => { if (data?.skills?.length) setSkills(data.skills); }).catch(() => {});
    fetch('/api/shiguan').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.levels?.length) setMemoryLevels(data.levels);
      if (data?.integration?.openviking) setOpenvikingStatus(data.integration.openviking);
    }).catch(() => {});
    fetch('/api/config/validate').then(r => r.ok ? r.json() : null).then(data => { if (data?.warnings?.length) setConfigWarnings(data.warnings); }).catch(() => {});
  };

  // ─── Load data from API ───
  useEffect(() => {
    // Departments
    fetch('/api/chaoting/bumen').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.departments?.length) {
        setDepartments(data.departments);
        if (data.levelDefinitions?.length) {
          setLevelDefs(data.levelDefinitions.map((l: any) => ({ level: l.level, name: l.name || l.description, color: l.color })));
        }
      }
    }).catch(() => {});

    // Models
    fetch('/api/models').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.models?.length) setAvailableModels(data.models);
    }).catch(() => {});

    // Skills
    fetch('/api/skills').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.skills?.length) setSkills(data.skills);
    }).catch(() => {});

    // Memory config
    fetch('/api/shiguan').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.levels?.length) setMemoryLevels(data.levels);
      if (data?.integration?.openviking) {
        setOpenvikingStatus(data.integration.openviking);
      }
    }).catch(() => {});

    // Config validation
    fetch('/api/config/validate').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.warnings?.length) setConfigWarnings(data.warnings);
    }).catch(() => {});
  }, []);

  // ─── Computed ───
  const 办理中Count = tasks.filter(t => ['taizi', 'zhongshu', 'menxia', 'doing', 'review'].includes(t.status)).length;
  const 已批阅Count = tasks.filter(t => t.status === '已批阅').length;
  const activeDeptCount = departments.filter(d => d.status === 'active' || d.status === 'busy').length || 9;

  const filteredTasks = tasks.filter(task => {
    const ms = task.id.toLowerCase().includes(searchQuery.toLowerCase()) || task.department.includes(searchQuery);
    const mf = taskFilter === 'all' || task.status === taskFilter;
    return ms && mf;
  });
  const taskStats = {
    all: tasks.length,
    待受理: tasks.filter(t => t.status === '待受理' || t.status === 'pending').length,
    taizi: tasks.filter(t => t.status === 'taizi').length,
    zhongshu: tasks.filter(t => t.status === 'zhongshu').length,
    menxia: tasks.filter(t => t.status === 'menxia').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    review: tasks.filter(t => t.status === 'review').length,
    已批阅: tasks.filter(t => ['已批阅', 'completed', 'done'].includes(t.status)).length,
    // 审理中 = 所有非终态任务（自动包含新增部门）
    running: tasks.filter(t => !['completed', 'failed', 'cancelled', '已批阅', 'done'].includes(t.status)).length,
    failed: tasks.filter(t => t.status === 'failed').length,
    totalCost: tasks.reduce((sum, t) => sum + (t.totalCost || 0), 0),
  };

  const filteredSkills = skills.filter(s => skillFilter === 'all' || s.status === skillFilter);

  const filteredMemory = memoryData.filter(m => {
    const ms = m.content.includes(memorySearch);
    const ml = memoryLevelFilter === 'all' || m.level === memoryLevelFilter;
    return ms && ml;
  });
  const memoryStats = Object.fromEntries(['L0', 'L1', 'L2', 'L3', 'L4'].map(l => [l, memoryData.filter(m => m.level === l).length]));

  const handleCancelTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/zouzhe/${taskId}/quxiao`, { method: 'POST' });
      if (res.ok) {
        setCancelledTasks(prev => [...prev, taskId]);
        addToast('warning', `任务 ${taskId} 已中断`);
        fetchTasks(); // 刷新列表
      }
    } catch (e) {
      console.error('中断失败:', e);
      addToast('error', '中断任务失败');
    }
  };
  const getStatusText = (s: string) => STATUS_NAMES[s] || s;
  const SC = STATUS_COLORS;

  // ─── Reusable: glass panel style ───
  const glass = (extra: any = {}) => ({
    background: 'rgba(28,28,30,0.55)', backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '0.5px solid rgba(255,255,255,0.06)', ...extra,
  });

  // ═══ TaskRow ═══
  const TaskRow = ({ task }: { task: typeof MOCK_TASKS[0] }) => {
    const isCancelled = cancelledTasks.includes(task.id);
    const isExpanded = expandedTask === task.id;
    return (
      <div className="apple-card" style={{ ...glass({ borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', opacity: isCancelled ? 0.4 : 1 }) }}>
        <div onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <span style={{ fontFamily: 'SF Mono, monospace', fontSize: '13px', color: '#0A84FF', fontWeight: 500 }}>{task.id}</span>
              <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: "" + SC[task.status] + "18", color: SC[task.status] }}>{getStatusText(task.status)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              <span>{task.department}</span><span>{task.progress}%</span><span>{task.time}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '80px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: "" + task.progress + "%", height: '100%', background: SC[task.status], borderRadius: '2px', transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
            </div>
            <ChevronDown size={14} color="rgba(255,255,255,0.2)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
          </div>
        </div>
        {isExpanded && (
          <div className="animate-slide-down" style={{ padding: '0 16px 14px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', fontSize: '12px' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>创建时间</span><div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>{task.created}</div></div>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>当前阶段</span><div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>{task.phase}</div></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {!isCancelled && task.status !== '已批阅' && (
                <button onClick={e => { e.stopPropagation(); handleCancelTask(task.id); }} className="apple-btn" style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,69,58,0.12)', color: '#FF453A', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>中断</button>
              )}
              <button onClick={e => { e.stopPropagation(); addToast('info', "重试 " + task.id + ""); }} className="apple-btn" style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(10,132,255,0.12)', color: '#0A84FF', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>重试</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}><Icon size={24} color="rgba(255,255,255,0.15)" /></div>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '13px' }}>{description}</div>
    </div>
  );

  // ═══ DepartmentCard ═══
  const DepartmentCard = ({ dept }: { dept: Department }) => {
    const Icon = ICON_MAP[dept.icon] || Activity;
    const isSelected = selectedDept === dept.id;
    return (
      <div onClick={() => setSelectedDept(isSelected ? null : dept.id)} className="card-base" style={{
        borderColor: isSelected ? `var(--${dept.color})` : 'var(--imperial-gold-10)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="jade-shine" />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: "linear-gradient(90deg, " + dept.color + "80, transparent)" }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ 
            width: '34px', height: '34px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, ' + dept.color + '20 0%, ' + dept.color + '05 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid ' + dept.color + '30'
          }}><Icon size={17} color={dept.color} /></div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.2px', color: '#F5F5DC' }}>{dept.name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(212,175,55,0.5)' }}>{dept.nameEn}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ 
            padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, 
            background: dept.status === 'active' ? 'rgba(0,168,107,0.15)' : dept.status === 'busy' ? 'rgba(212,175,55,0.15)' : 'rgba(142,142,147,0.15)', 
            color: dept.status === 'active' ? '#00A86B' : dept.status === 'busy' ? '#D4AF37' : '#8E8E93',
            border: '1px solid ' + (dept.status === 'active' ? 'rgba(0,168,107,0.3)' : dept.status === 'busy' ? 'rgba(212,175,55,0.3)' : 'rgba(142,142,147,0.3)'),
          }}>{getStatusText(dept.status)}</span>
          <span style={{ fontSize: '10px', color: 'rgba(212,175,55,0.4)', fontFamily: 'SF Mono, monospace' }}>{dept.model}</span>
        </div>
      </div>
    );
  };

  // Use level definitions from API or fallback
  const tiers = levelDefs.length > 0 ? levelDefs : [
    { level: 1, name: '中枢层', color: '#FFD700' },
    { level: 2, name: '辅政层', color: '#0A84FF' },
    { level: 3, name: '执行层', color: '#34C759' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff' }}>
      {/* 龙纹粒子背景 + 金色尘埃 */}
      <div className="dragon-pattern-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      {[...Array(20)].map((_, i) => (
        <div key={i} className="dragon-particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 15}s` }} />
      ))}
      {[...Array(30)].map((_, i) => (
        <div key={`dust-${i}`} className="gold-dust" style={{ 
          left: `${Math.random() * 100}%`, 
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 10}s`,
          animationDuration: `${8 + Math.random() * 6}s`
        }} />
      ))}
      
      <ToastContainer toasts={toasts} />

      {/* 配置精进提示 */}
      {showUpdateToast && (
        <div className="animate-slide-down" style={{
          position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998,
          padding: '10px 20px', borderRadius: '20px', ...glass({ border: '0.5px solid rgba(10,132,255,0.3)' }),
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0A84FF', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>配置已精进 (v{configVersion})，正在同步...</span>
        </div>
      )}

      {/* ═══ Header (Apple glass nav) ═══ */}
      <header className="page-enter" style={{
        height: '52px', display: 'flex', alignItems: 'center', padding: '0 20px',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.9) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '32px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #D4AF37 0%, #8B6914 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(212,175,55,0.3)' }}><Crown size={16} color="#0A0A0A" /></div>
          <div>
            <div className="shiny-text" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.3px' }}>OpenReign Pro</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.1px' }}>v1.2.2</div>
          </div>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1px', flex: 1 }}>
          {[
            { id: 'overview', label: '天下大势', icon: '🏛️' },
            { id: 'tasks', label: '奏折', icon: '📜' },
            { id: 'departments', label: '朝廷架构', icon: '🏯' },
            { id: 'armory', label: '武备司', icon: '⚔️' },
            { id: 'memorials', label: '存档阁', icon: '📚' },
            { id: 'templates', label: '诏令司', icon: '📋' },
            { id: 'cron', label: '钦天监', icon: '⏰' },
            { id: 'court', label: '朝会', icon: '👥' },
            { id: 'tokens', label: '功勋榜', icon: '🏆' },
            { id: 'memory', label: '史官', icon: '📖' },
          ].map(item => {
            const isA = activeTab === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => handleTabChange(item.id)} 
                className={`nav-item ${isA ? 'nav-active' : ''}`}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)', 
                  padding: 'var(--space-2) var(--space-3)', 
                  borderRadius: 'var(--radius-md)', 
                  border: isA ? '0.5px solid var(--imperial-gold-30)' : '0.5px solid transparent', 
                  background: isA ? 'var(--imperial-gold-10)' : 'transparent', 
                  color: isA ? 'var(--imperial-gold)' : 'var(--rice-paper-60)', 
                  fontSize: 'var(--text-base)', 
                  fontWeight: isA ? 'var(--font-medium)' : 'var(--font-normal)', 
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-default)'
                }}
              >
                <span style={{ fontSize: '14px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button onClick={() => setShowSettings(true)} className="btn-base btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Settings size={13} /><span className="hide-mobile">设置</span>
        </button>
      </header>

      {/* Config warnings banner */}
      {configWarnings.length > 0 && activeTab === 'overview' && (
        <div style={{ margin: '16px 20px 0', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,159,10,0.08)', border: '0.5px solid rgba(255,159,10,0.2)', fontSize: '12px', color: '#FF9F0A' }}>
          <strong>⚠️ 配置警告</strong>
          {configWarnings.map((w, i) => <div key={i} style={{ marginTop: '4px', color: 'rgba(255,255,255,0.5)' }}>{w}</div>)}
        </div>
      )}

      {/* ═══ Main ═══ */}
      <main className={pageAnimation} style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', animation: pageAnimation ? `${pageAnimation} 0.5s ease` : 'none' }}>

        {/* ─── 总览 ─── */}
        {activeTab === 'overview' && (
          <div>
            <OpenClawPanel onCommandExecuted={(cmd) => addToast('success', cmd + ' 执行成功')} />
            <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: '运行中', value: 办理中Count, color: '#34C759', icon: Play, suffix: '', tab: 'tasks' },
                { label: '已完成', value: 已批阅Count, color: '#0A84FF', icon: CheckCircle2, suffix: '', tab: 'tasks' },
                { label: 'Token', value: 12.5, color: '#FF9F0A', icon: Zap, suffix: 'K', tab: 'tokens' },
                { label: '活跃部门', value: activeDeptCount, color: '#AF52DE', icon: Layers, suffix: '/' + departments.length || 11, tab: 'departments' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} 
                    onClick={() => s.tab && handleTabChange(s.tab)}
                    className="card-base hover-lift"
                    style={{ cursor: s.tab ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={s.color} /></div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, letterSpacing: '-1px', fontFeatureSettings: '"tnum"' }}><AnimatedNumber value={s.value} suffix={s.suffix} /></div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>最近任务</h2>
              <button onClick={() => setActiveTab('tasks')} className="apple-btn" style={{ fontSize: '12px', color: '#0A84FF', background: 'transparent', border: 'none', cursor: 'pointer' }}>查看全部 →</button>
            </div>
            {filteredTasks.slice(0, 3).map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        )}

        {/* ─── 任务管理（奏折）─── */}
        {activeTab === 'tasks' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 600 }}>📜 奏折阁 · 任务审理</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  总成本: ${taskStats.totalCost?.toFixed(2) || '0.00'} | 
                  运行中: {taskStats.running} | 
                  失败: {taskStats.failed}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => fetchTasks?.()} 
                  style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '6px', color: '#D4AF37', fontSize: '12px', cursor: 'pointer' }}
                >
                  🔄 刷新
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <Search size={13} color="rgba(255,255,255,0.3)" />
                  <input type="text" placeholder="搜索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', width: '160px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: '📜 全部奏折', color: '#D4AF37', count: taskStats.all },
                { key: 'running', label: '🔄 审理中', color: '#4A90D9', count: taskStats.running },
                { key: 'attention', label: '⚠️ 需关注', color: '#FF453A', count: taskStats.failed },
                { key: '待受理', label: '⏳ 等待中', color: '#8E8E93', count: taskStats.待受理 },
                { key: 'taizi', label: '👑 太子分拣', color: '#FFD700', count: taskStats.taizi },
                { key: 'zhongshu', label: '📋 中书规划', color: '#4A90D9', count: taskStats.zhongshu },
                { key: 'menxia', label: '🔍 门下审核', color: '#7B68EE', count: taskStats.menxia },
                { key: 'doing', label: '⚙️ 执行中', color: '#34C759', count: taskStats.doing },
                { key: 'review', label: '📊 汇总审核', color: '#0A84FF', count: taskStats.review },
                { key: '已批阅', label: '✅ 已批阅', color: '#8E8E93', count: taskStats.已批阅 },
              ].map(tab => {
                const isA = taskFilter === tab.key;
                return (
                  <button key={tab.key} onClick={() => setTaskFilter(tab.key)} className="nav-jade" style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px',
                    border: isA ? '1px solid ' + tab.color : '1px solid rgba(212,175,55,0.15)',
                    background: isA ? tab.color + '15' : 'rgba(26,26,26,0.8)',
                    color: isA ? tab.color : 'rgba(245,245,220,0.6)',
                    fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    {tab.label}<span style={{ fontSize: '10px', opacity: 0.7 }}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
            {filteredTasks.length === 0 ? <EmptyState icon={CheckCircle2} title="暂无任务" description={taskFilter === 'all' ? "所有部门处于空闲状态" : '无此状态任务'} /> : filteredTasks.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        )}

        {/* ─── 组织架构 ─── */}
        {activeTab === 'departments' && (
          <div className="animate-fade-in">
            <div style={{ marginTop: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 600 }}>组织架构</h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>太子监国 · 三省辅政 · 六部执行 · 共 {departments.length} 个部门</p>
              </div>
            {tiers.map(tier => {
              const depts = departments.filter(d => d.level === tier.level);
              if (!depts.length) return null;
              return (
                <div key={tier.level} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: tier.color }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: tier.color }}>{tier.name}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{depts.length} 个部门</span>
                  </div>
                  <div className="grid-departments" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    {depts.map(dept => <DepartmentCard key={dept.id} dept={dept} />)}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* ─── 记忆管理 ─── */}
        {activeTab === 'memory' && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '14px', fontSize: '17px', fontWeight: 600 }}>记忆管理</h2>

            {/* OpenViking 状态卡片 */}
            <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '10px', ...glass({ border: openvikingStatus.connected ? '0.5px solid rgba(52,199,89,0.2)' : '0.5px solid rgba(255,159,10,0.2)' }) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: openvikingStatus.connected ? '#34C759' : openvikingStatus.enabled ? '#FF9F0A' : '#8E8E93',
                    boxShadow: openvikingStatus.connected ? '0 0 8px #34C759' : 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>OpenViking 记忆存储</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {openvikingStatus.connected
                        ? '已连接 · ' + openvikingStatus.endpoint
                        : openvikingStatus.enabled
                          ? '未运行 · ' + openvikingStatus.message + ' · ' + (openvikingStatus.endpoint || 'localhost:8080')
                          : '未启用 · 由户部管理'}
                    </div>
                  </div>
                </div>
                {!openvikingStatus.connected && (
                  <button onClick={() => addToast('info', '户部提示: 请配置 OpenViking 或检查服务状态')} className="apple-btn" style={{
                    padding: '5px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,159,10,0.3)',
                    background: 'rgba(255,159,10,0.08)', color: '#FF9F0A', fontSize: '11px', cursor: 'pointer',
                  }}>配置指南</button>
                )}
              </div>
              {!openvikingStatus.connected && openvikingStatus.enabled && (
                <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(255,159,10,0.06)', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#FF9F0A' }}>户部提示：</strong>
                  OpenViking 未运行。L2-L4 记忆将回退到 session 存储（7天后丢失）。<br />
                  习得: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '4px' }}>git clone https://github.com/volcengine/OpenViking</code>
                </div>
              )}
            </div>

            {/* 记忆分级说明 */}
            {memoryLevels.length > 0 && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(10,132,255,0.06)', border: '0.5px solid rgba(10,132,255,0.15)', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                📦 消息 → 户部分级 → {memoryLevels.map(l => l.id + '(' + l.storage + ')').join(' → ')}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setMemoryLevelFilter('all')} className="apple-btn" style={{ padding: '5px 10px', borderRadius: '8px', border: memoryLevelFilter === 'all' ? '1px solid #0A84FF40' : '0.5px solid rgba(255,255,255,0.06)', background: memoryLevelFilter === 'all' ? 'rgba(10,132,255,0.12)' : 'transparent', color: memoryLevelFilter === 'all' ? '#0A84FF' : 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>全部</button>
              {['L0', 'L1', 'L2', 'L3', 'L4'].map(l => (
                <button key={l} onClick={() => setMemoryLevelFilter(memoryLevelFilter === l ? 'all' : l)} className="apple-btn" style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px',
                  border: memoryLevelFilter === l ? "1px solid " + LEVEL_COLORS[l] + "40" : '0.5px solid rgba(255,255,255,0.06)',
                  background: memoryLevelFilter === l ? "" + LEVEL_COLORS[l] + "12" : 'transparent', color: memoryLevelFilter === l ? LEVEL_COLORS[l] : 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer',
                }}>{l}<span style={{ fontSize: '10px' }}>{LEVEL_NAMES[l]}</span><span style={{ fontSize: '10px', opacity: 0.6 }}>{memoryStats[l]}</span></button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', marginBottom: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Search size={13} color="rgba(255,255,255,0.3)" /><input type="text" placeholder="搜索记忆..." value={memorySearch} onChange={e => setMemorySearch(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', flex: 1 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredMemory.length === 0 ? <EmptyState icon={Database} title="无匹配记忆" description="调整筛选条件" /> : filteredMemory.map(item => (
                <div key={item.id} className="apple-card" style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', ...glass({ borderRadius: '10px' }) }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, marginRight: '12px', background: "" + LEVEL_COLORS[item.level] + "12", color: LEVEL_COLORS[item.level] }}>{item.level}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', marginBottom: '2px' }}>{item.content}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{item.time} · {item.size}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => addToast('info', "查看: " + item.content + "")} className="apple-btn" style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}><Eye size={12} /></button>
                    <button onClick={() => addToast('warning', "已革除: " + item.content + "")} className="apple-btn" style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,69,58,0.08)', color: '#FF453A', fontSize: '11px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 技能注册表 ─── */}
        {activeTab === 'skills' && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '14px', fontSize: '17px', fontWeight: 600 }}>技艺司</h2>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: '全部', count: skills.length },
                { key: 'installed', label: '已掌握', count: skills.filter(s => s.status === 'installed').length },
                { key: 'update-available', label: '可精进', count: skills.filter(s => s.status === 'update-available').length },
                { key: 'conflict', label: '冲突', count: skills.filter(s => s.status === 'conflict').length },
              ].map(tab => {
                const isA = skillFilter === tab.key;
                return (
                  <button key={tab.key} onClick={() => setSkillFilter(tab.key)} className="apple-btn" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', border: isA ? '1px solid #0A84FF40' : '0.5px solid rgba(255,255,255,0.06)', background: isA ? 'rgba(10,132,255,0.12)' : 'transparent', color: isA ? '#0A84FF' : 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>
                    {tab.label}<span style={{ fontSize: '10px', opacity: 0.7 }}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredSkills.map(skill => (
                <div key={skill.id} className="apple-card" style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', ...glass({ borderRadius: '10px' }) }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}><Zap size={15} color="#0A84FF" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{skill.name}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>v{skill.version}</span>
                      <span style={{ padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 500, background: skill.status === 'installed' ? 'rgba(52,199,89,0.1)' : skill.status === 'update-available' ? 'rgba(255,159,10,0.1)' : 'rgba(255,69,58,0.1)', color: skill.status === 'installed' ? '#34C759' : skill.status === 'update-available' ? '#FF9F0A' : '#FF453A' }}>
                        {skill.status === 'installed' ? '已习得' : skill.status === 'update-available' ? '可精进' : '冲突'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{skill.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {skill.status === 'update-available' && <button onClick={() => addToast('success', "" + skill.name + " 已精进")} className="apple-btn" style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(255,159,10,0.1)', color: '#FF9F0A', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>精进</button>}
                    <button onClick={() => addToast('info', "" + skill.name + " 配置")} className="apple-btn" style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: '11px', cursor: 'pointer' }}>配置</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 兵器库 ─── */}
        {activeTab === 'armory' && <Armory />}

        {/* ─── 存档阁 ─── */}
        {activeTab === 'memorials' && <Memorials />}

        {/* ─── 圣旨模板 ─── */}
        {activeTab === 'templates' && <Templates />}

        {/* ─── 军机处·定时任务 ─── */}
        {activeTab === 'cron' && <CronTasks />}

        {/* ─── 朝堂议政 ─── */}
        {activeTab === 'court' && <CourtDiscussion />}

        {/* ─── Token排行榜 ─── */}
        {activeTab === 'tokens' && <TokenRanking />}
      </main>

      {/* ═══ Department Detail Panel ═══ */}
      {selectedDept && (() => {
        const dept = departments.find(d => d.id === selectedDept);
        if (!dept) return null;
        const Icon = ICON_MAP[dept.icon] || Activity;
        return (
          <>
            <div onClick={() => setSelectedDept(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 49 }} />
            <div className="animate-slide-right" style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px',
              background: 'rgba(18,18,22,0.92)', backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderLeft: '0.5px solid rgba(255,255,255,0.06)', padding: '20px', zIndex: 50, overflow: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>部门配置</h3>
                <button onClick={() => setSelectedDept(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', 
                background: 'linear-gradient(145deg, rgba(26,26,26,0.9) 0%, rgba(10,10,10,0.95) 100%)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: '12px', 
                marginBottom: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', 
                  background: "linear-gradient(135deg, ${dept.color}25 0%, " + dept.color + "10 100%)", 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: "1px solid " + dept.color + "40"
                }}><Icon size={22} color={dept.color} /></div>
                <div><div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.3px', color: '#F5F5DC' }}>{dept.name}</div><div style={{ fontSize: '11px', color: 'rgba(212,175,55,0.5)' }}>{dept.nameEn} · L{dept.level}</div></div>
              </div>

              {/* Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: '12px', ...glass({ borderRadius: '8px' }) }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>启用状态</span>
                <button onClick={() => {
                  const en = !dept.enabled;
                  fetch("/api/chaoting/bumen/" + dept.id + "/toggle", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: en }) })
                    .then(r => r.json()).then(d => { addToast(en ? 'success' : 'warning', d.message); /* Re-fetch */ fetch('/api/chaoting/bumen').then(r => r.ok ? r.json() : null).then(d => { if (d?.departments) setDepartments(d.departments); }); })
                    .catch(() => addToast('error', '操作失败'));
                }} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: dept.enabled ? '#34C759' : 'rgba(255,255,255,0.12)', position: 'relative', cursor: 'pointer', transition: 'background 0.25s' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: dept.enabled ? '18px' : '2px', transition: 'left 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                </button>
              </div>

              {/* Role */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>职责</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', padding: '8px 10px', ...glass({ borderRadius: '8px' }) }}>{dept.role}</div>
              </div>

              {/* Permissions */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>权限矩阵</div>
                <div style={{ padding: '10px', ...glass({ borderRadius: '8px' }) }}>
                  <div style={{ fontSize: '11px', color: '#34C759', marginBottom: '4px' }}>✓ 可调用</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {dept.canCall.length > 0 ? dept.canCall.map(c => <span key={c} style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', background: 'rgba(52,199,89,0.08)', color: '#34C759' }}>{c}</span>) : <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>无</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#FF453A', marginBottom: '4px' }}>✗ 不可调用</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {dept.cannotCall.length > 0 ? dept.cannotCall.map(c => <span key={c} style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', background: 'rgba(255,69,58,0.06)', color: '#FF453A' }}>{c}</span>) : <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>无限制</span>}
                  </div>
                </div>
              </div>

              {/* Model */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>模型</div>
                <select value={deptModels[dept.id] || dept.model} onChange={e => setDeptModels(prev => ({ ...prev, [dept.id]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                  <option value="inherit">继承默认</option>
                  {availableModels.map(m => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                </select>
              </div>

              {/* Queue */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: '16px', ...glass({ borderRadius: '8px' }) }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>任务队列</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: dept.color }}>{tasks.filter(t => t.department === dept.name && t.status !== '已批阅').length}</span>
              </div>

              <button onClick={() => {
                const model = deptModels[dept.id] || dept.model;
                fetch("/api/chaoting/bumen/" + dept.id + "/model", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) })
                  .then(r => r.json()).then(d => addToast('success', d.message || '已存案')).catch(() => addToast('error', '存案失败'));
              }} className="apple-btn" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: dept.color, color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                存案配置
              </button>
            </div>
          </>
        );
      })()}

      {/* ═══ Settings Panel ═══ */}
      {showSettings && (
        <>
          <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 199 }} />
          <div className="animate-slide-right" style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '320px',
            background: 'rgba(18,18,22,0.92)', backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderLeft: '0.5px solid rgba(255,255,255,0.06)', padding: '20px', zIndex: 200, overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>设置</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            {[
              { label: '版本', value: 'v1.2.1 (Dragon Throne)' },
              { label: '架构模式', value: 'overlay / 治理层' },
              { label: 'Gateway', value: 'localhost:18789' },
              { label: '主题', value: '深色' },
              { label: '自动刷新', value: '5s' },
              { label: '部门数量', value: departments.length },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'SF Mono, monospace', fontSize: '12px' }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: '20px', padding: '12px', ...glass({ borderRadius: '10px' }), fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              <strong style={{ color: 'rgba(255,255,255,0.5)' }}>关于 OpenReign Pro</strong><br />
              构建于 OpenClaw Gateway 之上的治理架构层。太子监国，三省辅政，六部执行。所有部门配置从 openreign.json 动态加载。
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;

