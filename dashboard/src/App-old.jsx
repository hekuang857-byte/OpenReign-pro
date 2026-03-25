import React, { useState, useEffect } from 'react'
import { 
  Crown, Building2, Shield, Gavel, 
  Users, Sword, Database, FileText, 
  Scale, Wrench, Activity, Settings,
  Terminal, XCircle
} from 'lucide-react'

// 动态部门配置（从后端读取）
const DEPARTMENTS_CONFIG = {
  taizi: {
    id: 'taizi',
    name: '太子',
    nameEn: 'Crown Prince',
    role: '任务分发中枢',
    icon: Crown,
    color: '#FFD700',
    position: 1,
    showInDashboard: true,
    stats: ['tasksProcessed', 'avgComplexity', 'routingAccuracy']
  },
  zhongshu: {
    id: 'zhongshu',
    name: '中书省',
    nameEn: 'Chancellery',
    role: '决策与规划',
    icon: Building2,
    color: '#4A90D9',
    position: 2,
    showInDashboard: true,
    stats: ['plansCreated', 'avgPlanningTime', 'successRate']
  },
  menxia: {
    id: 'menxia',
    name: '门下省',
    nameEn: 'Menxia Province',
    role: '审核与监督',
    icon: Shield,
    color: '#9B59B6',
    position: 3,
    showInDashboard: true,
    stats: ['reviewsCompleted', 'vetoCount', 'complianceRate']
  },
  shangshu: {
    id: 'shangshu',
    name: '尚书省',
    nameEn: 'Shangshu Province',
    role: '执行总调度',
    icon: Gavel,
    color: '#E74C3C',
    position: 4,
    showInDashboard: true,
    stats: ['tasksDispatched', 'activeTasks', 'completionRate']
  },
  libu: {
    id: 'libu',
    name: '吏部',
    nameEn: 'Ministry of Personnel',
    role: '人事与技能管理',
    icon: Users,
    color: '#27AE60',
    position: 5,
    showInDashboard: true,
    stats: ['skillsInstalled', 'skillConflicts', 'registrySize']
  },
  bingbu: {
    id: 'bingbu',
    name: '兵部',
    nameEn: 'Ministry of War',
    role: '代码执行与工具调用',
    icon: Sword,
    color: '#C0392B',
    position: 6,
    showInDashboard: true,
    stats: ['executions', 'avgExecTime', 'successRate']
  },
  hubu: {
    id: 'hubu',
    name: '户部',
    nameEn: 'Ministry of Revenue',
    role: '数据与记忆管理',
    icon: Database,
    color: '#F39C12',
    position: 7,
    showInDashboard: true,
    stats: ['memoriesStored', 'retrievalRate', 'storageUsed']
  },
  'libu-justice': {
    id: 'libu-justice',
    name: '礼部',
    nameEn: 'Ministry of Rites',
    role: '文档与沟通管理',
    icon: FileText,
    color: '#1ABC9C',
    position: 8,
    showInDashboard: true,
    stats: ['docsGenerated', 'templatesUsed', 'formatSuccess']
  },
  xingbu: {
    id: 'xingbu',
    name: '刑部',
    nameEn: 'Ministry of Justice',
    role: '安全与审计',
    icon: Scale,
    color: '#8E44AD',
    position: 9,
    showInDashboard: true,
    stats: ['audits', 'violations', 'securityScore']
  },
  gongbu: {
    id: 'gongbu',
    name: '工部',
    nameEn: 'Ministry of Works',
    role: '部署与运维',
    icon: Wrench,
    color: '#7F8C8D',
    position: 10,
    showInDashboard: true,
    stats: ['deployments', 'uptime', 'resources']
  }
}

// 模拟实时数据
const useRealtimeData = () => {
  const [data, setData] = useState({
    tasks: [],
    departments: {},
    system: { status: 'running', uptime: 0 }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        system: {
          status: 'running',
          uptime: prev.system.uptime + 1
        }
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return data
}

// 部门卡片组件
const DepartmentCard = ({ config, data }) => {
  const Icon = config.icon
  const isActive = data?.status === 'active'
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(20,20,30,0.9), rgba(30,30,45,0.9))',
      borderRadius: '12px',
      padding: '20px',
      border: `2px solid ${isActive ? config.color : '#333'}`,
      boxShadow: isActive ? `0 0 20px ${config.color}40` : 'none',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${config.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={config.color} />
        </div>
        <div>
          <h3 style={{ margin: 0, color: config.color, fontSize: '18px' }}>{config.name}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{config.nameEn}</p>
        </div>
        <div style={{
          marginLeft: 'auto',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: isActive ? '#00FF88' : '#FF4444',
          boxShadow: isActive ? '0 0 10px #00FF88' : 'none'
        }} />
      </div>
      
      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#aaa' }}>{config.role}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {config.stats.map((stat, idx) => (
          <div key={idx} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>{stat}</div>
            <div style={{ fontSize: '16px', color: config.color, fontWeight: 'bold' }}>
              {Math.floor(Math.random() * 100)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 任务列表组件
const TaskList = () => {
  const [tasks, setTasks] = useState([
    { id: 'JJC-20260324-001', status: 'running', department: 'taizi', progress: 45 },
    { id: 'JJC-20260324-002', status: 'completed', department: 'zhongshu', progress: 100 },
    { id: 'JJC-20260324-003', status: 'pending', department: 'shangshu', progress: 0 }
  ])

  const getStatusColor = (status) => {
    const colors = {
      running: '#F39C12',
      completed: '#27AE60',
      pending: '#7F8C8D',
      failed: '#E74C3C',
      cancelled: '#95A5A6'
    }
    return colors[status] || '#888'
  }

  const handleCancel = (taskId) => {
    if (confirm(`确定要取消任务 ${taskId} 吗？`)) {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'cancelled', progress: 0 } : t
      ))
    }
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Activity size={20} color="#4A90D9" />
        任务监控
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.map(task => (
          <div key={task.id} style={{
            background: 'rgba(20,20,30,0.8)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #333'
          }}>
            <div style={{ fontFamily: 'monospace', color: '#4A90D9', minWidth: '180px' }}>
              {task.id}
            </div>
            
            <div style={{ 
              padding: '4px 12px', 
              borderRadius: '4px',
              background: `${getStatusColor(task.status)}20`,
              color: getStatusColor(task.status),
              fontSize: '12px',
              textTransform: 'uppercase',
              minWidth: '80px',
              textAlign: 'center'
            }}>
              {task.status}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                height: '6px', 
                background: '#333', 
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${task.progress}%`,
                  height: '100%',
                  background: getStatusColor(task.status),
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            
            <div style={{ color: '#888', fontSize: '12px' }}>
              {DEPARTMENTS_CONFIG[task.department]?.name || task.department}
            </div>
            
            {task.status === 'running' && (
              <button 
                onClick={() => handleCancel(task.id)}
                style={{
                  background: '#E74C3C',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px'
                }}
              >
                <XCircle size={14} />
                取消
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 主应用
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const realtimeData = useRealtimeData()

  const visibleDepartments = Object.values(DEPARTMENTS_CONFIG)
    .filter(d => d.showInDashboard)
    .sort((a, b) => a.position - b.position)

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <aside style={{
        width: '240px',
        background: 'rgba(10,10,15,0.95)',
        borderRight: '1px solid #222',
        padding: '24px'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            OpenReign Pro
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            Dragon Throne v1.0.0
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'dashboard', label: '总览看板', icon: Activity },
            { id: 'tasks', label: '任务管理', icon: Terminal },
            { id: 'memory', label: '记忆浏览', icon: Database },
            { id: 'skills', label: '技能注册表', icon: Settings }
          ].map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === item.id ? 'rgba(74,144,217,0.2)' : 'transparent',
                  color: activeTab === item.id ? '#4A90D9' : '#888',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0,255,136,0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(0,255,136,0.3)'
          }}>
            <div style={{ fontSize: '12px', color: '#00FF88', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00FF88' }} />
              系统运行中
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              运行时间: {Math.floor(realtimeData.system.uptime / 60)}m {realtimeData.system.uptime % 60}s
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown size={24} color="#FFD700" />
              三省六部状态
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '20px' 
            }}>
              {visibleDepartments.map(dept => (
                <DepartmentCard 
                  key={dept.id} 
                  config={dept} 
                  data={{ status: 'active' }}
                />
              ))}
            </div>

            <TaskList />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <h2>任务管理</h2>
            <p style={{ color: '#666' }}>查看和管理所有任务...</p>
          </div>
        )}

        {activeTab === 'memory' && (
          <div>
            <h2>记忆浏览</h2>
            <p style={{ color: '#666' }}>查看分级记忆...</p>
          </div>
        )}

        {activeTab === 'skills' && (
          <div>
            <h2>技能注册表</h2>
            <p style={{ color: '#666' }}>管理已安装技能...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App