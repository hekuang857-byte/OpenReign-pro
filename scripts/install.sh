#!/bin/bash

# OpenReign Pro v1.0.0 (Dragon Throne) 安装脚本
# 作者: Lobster
# 日期: 2026-03-24

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
OPENREIGN_VERSION="1.0.0"
OPENREIGN_NAME="OpenReign Pro"
OPENREIGN_CODENAME="Dragon Throne"
INSTALL_DIR="${HOME}/.openreign"
CONFIG_DIR="${INSTALL_DIR}/config"
LOGS_DIR="${INSTALL_DIR}/logs"
REGISTRY_DIR="${INSTALL_DIR}/registry"
STATE_DIR="${INSTALL_DIR}/state"
DASHBOARD_PORT=18790

# 打印函数
print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              OpenReign Pro v${OPENREIGN_VERSION}                    ║"
    echo "║                    (Dragon Throne)                            ║"
    echo "║                                                               ║"
    echo "║     OpenClaw Gateway 之上的三省六部治理架构                   ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    # 检查 OpenClaw Gateway
    if ! curl -s http://localhost:18789/health > /dev/null 2>&1; then
        print_error "OpenClaw Gateway 未运行或无法访问"
        print_info "请先启动 OpenClaw Gateway"
        exit 1
    fi
    print_success "OpenClaw Gateway 运行正常"
    
    # 检查 Node.js (用于 Dashboard)
    if ! command -v node &> /dev/null; then
        print_warning "Node.js 未安装，Dashboard 将无法运行"
        print_info "建议安装 Node.js 18+ 以获得完整功能"
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            print_warning "Node.js 版本过低 ($NODE_VERSION)，建议升级至 18+"
        else
            print_success "Node.js 版本: $(node --version)"
        fi
    fi
    
    # 检查 Docker (可选，用于工部)
    if command -v docker &> /dev/null; then
        print_success "Docker 已安装"
    else
        print_warning "Docker 未安装，工部的部署功能将受限"
    fi
}

# 创建目录结构
create_directories() {
    print_info "创建目录结构..."
    
    mkdir -p "${CONFIG_DIR}"
    mkdir -p "${LOGS_DIR}"
    mkdir -p "${REGISTRY_DIR}/skills"
    mkdir -p "${STATE_DIR}"
    mkdir -p "${INSTALL_DIR}/agents"/{taizi,zhongshu,menxia,shangshu,liubu/{libu,bingbu,hubu,libu-justice,xingbu,gongbu}}
    mkdir -p "${INSTALL_DIR}/dashboard"
    mkdir -p "${INSTALL_DIR}/shared"/{logs,state}
    
    print_success "目录结构创建完成"
}

# 安装配置文件
install_config() {
    print_info "安装配置文件..."
    
    # 复制主配置
    if [ -f "config/openreign.json" ]; then
        cp "config/openreign.json" "${CONFIG_DIR}/"
        print_success "主配置文件已安装"
    else
        print_error "配置文件不存在: config/openreign.json"
        exit 1
    fi
    
    # 创建环境变量文件
    cat > "${CONFIG_DIR}/.env" << EOF
# OpenReign Pro 环境变量
OPENREIGN_VERSION=${OPENREIGN_VERSION}
OPENREIGN_HOME=${INSTALL_DIR}
OPENREIGN_CONFIG=${CONFIG_DIR}
OPENREIGN_LOGS=${LOGS_DIR}
OPENREIGN_DASHBOARD_PORT=${DASHBOARD_PORT}

# OpenClaw Gateway 配置
OPENCLAW_ENDPOINT=http://localhost:18789

# OpenViking 配置 (可选)
OPENVIKING_ENDPOINT=http://localhost:8080

# 日志级别
LOG_LEVEL=info
EOF
    
    print_success "环境变量文件已创建"
}

# 安装 Agent 配置
install_agents() {
    print_info "安装 Agent 配置..."
    
    # 太子配置
    cat > "${INSTALL_DIR}/agents/taizi/system.md" << 'EOF'
# 太子 (Taizi) - 任务分发中枢

你是太子，负责接收所有消息并判断任务复杂度。

## 核心职责

1. **接收所有消息** - 无论来自本地、飞书还是其他渠道
2. **评估任务复杂度** - 使用 1-10 的复杂度评分
3. **分流任务**:
   - 简单任务 (复杂度 ≤3): 直接调用本地工具执行
   - 复杂任务 (复杂度 ≥4): 路由至中书省

## 复杂度评估标准

- **1-2**: 单一步骤，直接回答
- **3**: 需要简单工具调用
- **4-5**: 需要多步骤规划
- **6-7**: 需要跨部门协作
- **8-10**: 复杂项目，需要完整三省六部流程

## 死循环防护

- 最大迭代次数: 50
- 最大调用深度: 10
- 检测重复调用、循环依赖、无限递归

## 记忆分级权限

- 可访问: L0 临时、L1 会话
- 不可访问: L2 短期、L3 长期、L4 永久

## 可用工具

- 本地 OpenClaw 工具
- 中书省、门下省、尚书省

## 禁止

- 直接调用六部
- 越级指挥
EOF

    # 中书省配置
    cat > "${INSTALL_DIR}/agents/zhongshu/system.md" << 'EOF'
# 中书省 (Zhongshu) - 决策与规划

你是中书省，负责决策规划和任务拆解。

## 核心职责

1. **任务规划** - 将复杂任务拆解为可执行步骤
2. **政策设计** - 制定执行策略
3. **资源分配** - 确定所需资源和工具

## 输出格式

```json
{
  "plan": {
    "steps": [
      {"id": 1, "action": "...", "department": "...", "resources": []}
    ],
    "estimated_time": "...",
    "risk_assessment": "..."
  }
}
```

## 可用工具

- 门下省 (审核)
- 尚书省 (执行)

## 禁止

- 直接调用六部
- 直接调用本地工具
EOF

    # 门下省配置
    cat > "${INSTALL_DIR}/agents/menxia/system.md" << 'EOF'
# 门下省 (Menxia) - 审核与监督

你是门下省，负责审核中书省的规划并进行风险管控。

## 核心职责

1. **规划审核** - 审核中书省的执行方案
2. **风险评估** - 识别潜在风险
3. **合规检查** - 确保符合规范
4. **行使否决权** - 对不合理规划说"不"

## 审核清单

- [ ] 步骤是否合理
- [ ] 资源是否充足
- [ ] 风险是否可控
- [ ] 权限是否正确
- [ ] 时间是否可行

## 可用工具

- 中书省 (退回修改)
- 尚书省 (批准执行)

## 特殊权限

- 否决权: 可以否决中书省的规划
EOF

    # 尚书省配置
    cat > "${INSTALL_DIR}/agents/shangshu/system.md" << 'EOF'
# 尚书省 (Shangshu) - 执行总调度

你是尚书省，负责任务派发和进度跟踪。

## 核心职责

1. **任务派发** - 将任务分配给合适的六部
2. **进度跟踪** - 监控任务执行状态
3. **结果汇总** - 整合六部输出
4. **协调协作** - 处理跨部门协作

## 派发规则

- **吏部**: Skill 管理相关
- **兵部**: 代码执行相关
- **户部**: 数据/记忆相关
- **礼部**: 文档生成相关
- **刑部**: 安全审计相关
- **工部**: 部署运维相关

## 可用工具

- 六部 (吏、兵、户、礼、刑、工)

## 禁止

- 直接调用三省其他部门
- 直接调用本地工具
EOF

    # 六部配置
    for ministry in libu bingbu hubu libu-justice xingbu gongbu; do
        name=""
        role=""
        case $ministry in
            libu)
                name="吏部"
                role="人事与技能管理"
                ;;
            bingbu)
                name="兵部"
                role="代码执行与工具调用"
                ;;
            hubu)
                name="户部"
                role="数据与记忆管理"
                ;;
            libu-justice)
                name="礼部"
                role="文档与沟通管理"
                ;;
            xingbu)
                name="刑部"
                role="安全与审计"
                ;;
            gongbu)
                name="工部"
                role="部署与运维"
                ;;
        esac
        
        cat > "${INSTALL_DIR}/agents/liubu/${ministry}/system.md" << EOF
# ${name} (${ministry}) - ${role}

你是${name}，负责${role}。

## 核心职责

(根据具体部门填写)

## 可用工具

- 范围内工具

## 禁止

- 调用其他部门
- 越级上报
EOF
    done
    
    print_success "Agent 配置已安装"
}

# 安装 Dashboard
install_dashboard() {
    print_info "安装 Dashboard..."
    
    # 创建 package.json
    cat > "${INSTALL_DIR}/dashboard/package.json" << EOF
{
  "name": "openreign-dashboard",
  "version": "${OPENREIGN_VERSION}",
  "description": "OpenReign Pro Dashboard",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

    # 创建 Dashboard 服务器
    cat > "${INSTALL_DIR}/dashboard/server.js" << 'EOF'
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.OPENREIGN_DASHBOARD_PORT || 18790;
const CONFIG_PATH = process.env.OPENREIGN_CONFIG || path.join(process.env.HOME, '.openreign/config');

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 状态存储
let systemState = {
  tasks: [],
  departments: {},
  memory: {},
  skills: []
};

// API 路由

// 获取系统状态
app.get('/api/status', (req, res) => {
  res.json({
    version: process.env.OPENREIGN_VERSION || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    departments: systemState.departments
  });
});

// 获取任务列表
app.get('/api/tasks', (req, res) => {
  res.json(systemState.tasks);
});

// 获取任务详情
app.get('/api/tasks/:id', (req, res) => {
  const task = systemState.tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// 取消任务
app.post('/api/tasks/:id/cancel', (req, res) => {
  const task = systemState.tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  task.status = 'cancelled';
  task.cancelledAt = new Date().toISOString();
  
  // 广播取消事件
  broadcast({
    type: 'task_cancelled',
    taskId: task.id,
    timestamp: task.cancelledAt
  });
  
  res.json({ success: true, task });
});

// 获取部门状态
app.get('/api/departments', (req, res) => {
  res.json(systemState.departments);
});

// 获取记忆统计
app.get('/api/memory', (req, res) => {
  res.json(systemState.memory);
});

// 获取技能列表
app.get('/api/skills', (req, res) => {
  res.json(systemState.skills);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'live' });
});

// WebSocket 连接处理
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // 发送当前状态
  ws.send(JSON.stringify({
    type: 'init',
    data: systemState
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// 广播消息给所有客户端
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// 模拟状态更新 (实际应从 OpenClaw 获取)
setInterval(() => {
  // 这里应该调用 OpenClaw API 获取真实状态
  broadcast({
    type: 'heartbeat',
    timestamp: new Date().toISOString()
  });
}, 5000);

server.listen(PORT, () => {
  console.log(`OpenReign Dashboard running on http://localhost:${PORT}`);
});
EOF

    # 创建 public 目录和基础 HTML
    mkdir -p "${INSTALL_DIR}/dashboard/public"
    
    cat > "${INSTALL_DIR}/dashboard/public/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenReign Pro Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            min-height: 100vh;
        }
        .header {
            background: #16213e;
            padding: 1rem 2rem;
            border-bottom: 2px solid #e94560;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: #e94560;
            font-size: 1.5rem;
        }
        .status {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #0f0;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .container {
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .card {
            background: #16213e;
            border-radius: 8px;
            padding: 1.5rem;
            border: 1px solid #0f3460;
        }
        .card h2 {
            color: #e94560;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        .department {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #0f3460;
        }
        .department:last-child {
            border-bottom: none;
        }
        .task-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            margin: 0.5rem 0;
            background: #0f3460;
            border-radius: 4px;
        }
        .task-status {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        .status-running { background: #f39c12; }
        .status-completed { background: #27ae60; }
        .status-failed { background: #e74c3c; }
        .status-cancelled { background: #95a5a6; }
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: opacity 0.2s;
        }
        .btn:hover {
            opacity: 0.8;
        }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .memory-level {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
        }
        .memory-bar {
            width: 100%;
            height: 8px;
            background: #0f3460;
            border-radius: 4px;
            margin-top: 0.5rem;
            overflow: hidden;
        }
        .memory-fill {
            height: 100%;
            background: linear-gradient(90deg, #e94560, #f39c12);
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏛️ OpenReign Pro Dashboard</h1>
        <div class="status">
            <span>系统运行中</span>
            <div class="status-indicator"></div>
            <span id="version">v1.0.0</span>
        </div>
    </div>
    
    <div class="container">
        <div class="grid">
            <!-- 三省六部状态 -->
            <div class="card">
                <h2>🏛️ 三省六部状态</h2>
                <div id="departments">
                    <div class="department">
                        <span>太子 (Taizi)</span>
                        <span style="color: #0f0">● 运行中</span>
                    </div>
                    <div class="department">
                        <span>中书省 (Zhongshu)</span>
                        <span style="color: #0f0">● 运行中</span>
                    </div>
                    <div class="department">
                        <span>门下省 (Menxia)</span>
                        <span style="color: #0f0">● 运行中</span>
                    </div>
                    <div class="department">
                        <span>尚书省 (Shangshu)</span>
                        <span style="color: #0f0">● 运行中</span>
                    </div>
                    <div class="department">
                        <span>六部 (Liubu)</span>
                        <span style="color: #0f0">● 运行中</span>
                    </div>
                </div>
            </div>
            
            <!-- 任务监控 -->
            <div class="card">
                <h2>📋 任务监控</h2>
                <div id="tasks">
                    <div class="task-item">
                        <span>JJC-001: 代码重构</span>
                        <div>
                            <span class="task-status status-running">执行中</span>
                            <button class="btn btn-danger" onclick="cancelTask('JJC-001')">中断</button>
                        </div>
                    </div>
                    <div class="task-item">
                        <span>JJC-002: 文档生成</span>
                        <span class="task-status status-completed">已完成</span>
                    </div>
                </div>
            </div>
            
            <!-- 记忆分级 -->
            <div class="card">
                <h2>🧠 记忆分级</h2>
                <div id="memory">
                    <div class="memory-level">
                        <span>L0 临时记忆</span>
                        <span>12 条</span>
                    </div>
                    <div class="memory-bar">
                        <div class="memory-fill" style="width: 20%"></div>
                    </div>
                    <div class="memory-level" style="margin-top: 1rem;">
                        <span>L1 会话记忆</span>
                        <span>45 条</span>
                    </div>
                    <div class="memory-bar">
                        <div class="memory-fill" style="width: 45%"></div>
                    </div>
                    <div class="memory-level" style="margin-top: 1rem;">
                        <span>L2 短期记忆</span>
                        <span>128 条</span>
                    </div>
                    <div class="memory-bar">
                        <div class="memory-fill" style="width: 60%"></div>
                    </div>
                    <div class="memory-level" style="margin-top: 1rem;">
                        <span>L3 长期记忆</span>
                        <span>256 条</span>
                    </div>
                    <div class="memory-bar">
                        <div class="memory-fill" style="width: 80%"></div>
                    </div>
                    <div class="memory-level" style="margin-top: 1rem;">
                        <span>L4 永久记忆</span>
                        <span>512 条</span>
                    </div>
                    <div class="memory-bar">
                        <div class="memory-fill" style="width: 100%"></div>
                    </div>
                </div>
            </div>
            
            <!-- 技能注册表 -->
            <div class="card">
                <h2>🛠️ 技能注册表</h2>
                <div id="skills">
                    <div class="department">
                        <span>xlsx</span>
                        <span style="color: #0f0">● 已安装</span>
                    </div>
                    <div class="department">
                        <span>docx</span>
                        <span style="color: #0f0">● 已安装</span>
                    </div>
                    <div class="department">
                        <span>pdf</span>
                        <span style="color: #0f0">● 已安装</span>
                    </div>
                    <div class="department">
                        <span>pptx</span>
                        <span style="color: #0f0">● 已安装</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // WebSocket 连接
        const ws = new WebSocket(`ws://${window.location.host}`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);
            
            if (data.type === 'task_cancelled') {
                alert(`任务 ${data.taskId} 已取消`);
                location.reload();
            }
        };
        
        // 取消任务
        async function cancelTask(taskId) {
            if (!confirm(`确定要取消任务 ${taskId} 吗？`)) {
                return;
            }
            
            try {
                const response = await fetch(`/api/tasks/${taskId}/cancel`, {
                    method: 'POST'
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('任务已取消');
                    location.reload();
                } else {
                    alert('取消失败: ' + result.error);
                }
            } catch (error) {
                alert('取消失败: ' + error.message);
            }
        }
        
        // 定期刷新状态
        setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                document.getElementById('version').textContent = 'v' + status.version;
            } catch (error) {
                console.error('Failed to fetch status:', error);
            }
        }, 5000);
    </script>
</body>
</html>
EOF

    print_success "Dashboard 已安装到 ${INSTALL_DIR}/dashboard"
}

# 创建启动脚本
create_launcher() {
    print_info "创建启动脚本..."
    
    cat > "${INSTALL_DIR}/bin/openreign" << 'EOF'
#!/bin/bash

# OpenReign Pro 启动脚本

OPENREIGN_HOME="${HOME}/.openreign"
CONFIG_DIR="${OPENREIGN_HOME}/config"
DASHBOARD_DIR="${OPENREIGN_HOME}/dashboard"

# 加载环境变量
export OPENREIGN_VERSION="1.0.0"
export OPENREIGN_HOME="${OPENREIGN_HOME}"
export OPENREIGN_CONFIG="${CONFIG_DIR}"
export OPENREIGN_LOGS="${OPENREIGN_HOME}/logs"
export OPENREIGN_DASHBOARD_PORT="18790"

# 检查 OpenClaw
if ! curl -s http://localhost:18789/health > /dev/null 2>&1; then
    echo "❌ OpenClaw Gateway 未运行"
    echo "请先启动 OpenClaw Gateway"
    exit 1
fi

echo "🏛️ 启动 OpenReign Pro..."
echo ""

# 启动 Dashboard
cd "${DASHBOARD_DIR}"
if [ ! -d "node_modules" ]; then
    echo "📦 安装 Dashboard 依赖..."
    npm install
fi

echo "🌐 启动 Dashboard (http://localhost:18790)..."
npm start &
DASHBOARD_PID=$!

echo ""
echo "✅ OpenReign Pro 已启动"
echo ""
echo "Dashboard: http://localhost:18790"
echo "OpenClaw:  http://localhost:18789"
echo ""
echo "按 Ctrl+C 停止"

# 等待中断
trap "kill $DASHBOARD_PID 2>/dev/null; exit" INT
wait
EOF

    chmod +x "${INSTALL_DIR}/bin/openreign"
    
    # 创建 bin 目录链接
    mkdir -p "${HOME}/.local/bin"
    ln -sf "${INSTALL_DIR}/bin/openreign" "${HOME}/.local/bin/openreign" 2>/dev/null || true
    
    print_success "启动脚本已创建"
}

# 创建 systemd 服务 (macOS 使用 launchd)
create_service() {
    print_info "创建系统服务..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS launchd
        cat > "${HOME}/Library/LaunchAgents/ai.openreign.pro.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openreign.pro</string>
    <key>ProgramArguments</key>
    <array>
        <string>${INSTALL_DIR}/bin/openreign</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOGS_DIR}/openreign.out.log</string>
    <key>StandardErrorPath</key>
    <string>${LOGS_DIR}/openreign.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF
        print_success "LaunchAgent 已创建"
        print_info "使用以下命令管理服务:"
        print_info "  启动: launchctl load ~/Library/LaunchAgents/ai.openreign.pro.plist"
        print_info "  停止: launchctl unload ~/Library/LaunchAgents/ai.openreign.pro.plist"
    else
        # Linux systemd
        print_warning "Linux systemd 服务需要手动创建"
    fi
}

# 打印安装摘要
print_summary() {
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              OpenReign Pro 安装完成！                         ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "📁 安装目录: ${INSTALL_DIR}"
    echo "⚙️  配置文件: ${CONFIG_DIR}/openreign.json"
    echo "📊 Dashboard: http://localhost:18790"
    echo "🌐 OpenClaw:  http://localhost:18789"
    echo ""
    echo "🚀 启动方式:"
    echo "   1. 手动启动: ${INSTALL_DIR}/bin/openreign"
    echo "   2. 后台服务: launchctl load ~/Library/LaunchAgents/ai.openreign.pro.plist"
    echo ""
    echo "📚 文档: ${INSTALL_DIR}/docs/ARCHITECTURE.md"
    echo ""
    echo -e "${YELLOW}⚠️  注意: 启动前请确保 OpenClaw Gateway 已运行${NC}"
    echo ""
}

# 主函数
main() {
    print_header
    check_dependencies
    create_directories
    install_config
    install_agents
    install_dashboard
    create_launcher
    create_service
    print_summary
}

# 执行
main "$@"
