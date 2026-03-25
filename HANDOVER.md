# OpenReign Pro v1.2.0 (Dragon Throne) - 任务交接文档

**交接日期**: 2026-03-25  
**交接人**: 前AI助手  
**项目路径**: `/Users/kuang/Downloads/openreign-pro-v1.2`

---

## 📋 项目概述

OpenReign Pro 是一个基于 OpenClaw Gateway 构建的三省六部治理架构系统，首个正式版本代号 "Dragon Throne"。

### 核心功能
- **三省六部架构**: 太子、中书省、门下省、尚书省 + 六部（吏部、兵部、户部、礼部、刑部、工部）
- **智能任务分流**: 自动评估任务复杂度，简单任务本地执行，复杂任务进入完整流程
- **死循环防护**: 最大50次迭代、10层调用深度限制
- **记忆分级**: L0临时到L4永久五级记忆体系
- **Dashboard看板**: 任务监控、部门状态、记忆管理、技能注册表

---

## 🎯 当前任务状态

### 已完成
- [x] 项目基础架构搭建
- [x] Dashboard 基础UI实现
- [x] 三省六部模拟数据
- [x] OpenClaw 控制面板模板创建 (`/dashboard/src/OpenClawPanel.tsx`)

### 进行中
- [ ] OpenClaw 控制面板集成到主 App
- [ ] 部门详情面板移除 temperature 滑块
- [ ] 命令发送机制实现
- [ ] 连接状态实时刷新功能

### 待开始
- [ ] 斜杠命令完整实现（参考 OpenClaw 官方文档）
- [ ] 模型选择功能
- [ ] 思考深度设置
- [ ] 命令日志历史优化

---

## 📁 关键文件位置

### 核心文件
```
/Users/kuang/Downloads/openreign-pro-v1.2/
├── dashboard/
│   ├── src/
│   │   ├── App.tsx                 # 主应用组件（需要集成 OpenClawPanel）
│   │   ├── OpenClawPanel.tsx       # ✅ 已创建 - OpenClaw 控制面板组件
│   │   └── main.tsx                # 入口文件
│   ├── server.js                   # Express 后端服务器
│   └── package.json
├── core/
│   └── src/
│       ├── gateway.ts              # OpenClaw Gateway 连接
│       ├── emperor.ts              # 皇帝（主控）
│       ├── taizi.ts                # 太子
│       ├── zhongshu.ts             # 中书省
│       ├── menxia.ts               # 门下省
│       ├── shangshu.ts             # 尚书省
│       └── libu/                   # 六部实现
├── docs/
│   └── CHANGELOG.md                # 更新日志
└── scripts/
    └── install.sh                  # 安装脚本
```

---

## 🔧 OpenClaw 控制面板需求

### 位置
Dashboard 总览页面顶部，作为独立组件嵌入。

### 功能清单（用户原始需求）

#### 1. 斜杠命令区域

| 功能 | 命令 | UI 实现 |
|------|------|---------|
| **模型选择** | `/model <model>` | 横向按钮组：GPT-4o / GPT-4o Mini / Claude 3.5 Sonnet / Claude 3 Opus |
| **思考深度** | `/think <level>` | 按钮组：关闭 / 极简 / 轻度 / 中等 / 深度 / 极深 |
| **显示推理** | `/reasoning on/off` | 开关按钮 |
| **压缩上下文** | `/compact` | 按钮 |
| **重置会话** | `/reset` | 按钮（带确认弹窗） |
| **新建会话** | `/new` | 按钮 |
| **终止任务** | `/kill` | 按钮（红色警告） |
| **查看上下文** | `/context` | 按钮 |

#### 2. 命令日志面板
- **位置**: 控制面板下方
- **显示**: 最近 50 条命令历史
- **每条记录**: 时间戳 + 命令 + 执行结果
- **操作**: 清除全部 / 显示/隐藏历史

#### 3. 部门详情面板更新
- **移除**: temperature 滑块
- **添加**: 提示文字："模型切换请使用上方 OpenClaw 控制面板"
- **保留**: 模型选择下拉框（只读展示）

#### 4. 命令发送机制
```typescript
const sendSlashCommand = (command: string) => {
  console.log(`[OpenClaw Command] ${command}`);
  setCommandHistory(prev => [...prev, { command, time: new Date().toLocaleTimeString() }]);
  setCommandOutput(`执行 ${command}...`);
  // 实际实现中会调用 OpenClaw Gateway API
  // fetch('/api/command', { method: 'POST', body: JSON.stringify({ command }) })
};
```

---

## 📚 OpenClaw 官方文档参考

**文档地址**: https://docs.openclaw.ai/

### 关键页面
1. **CLI Reference**: `/cli` - 所有斜杠命令文档
2. **Models**: `/providers` - 支持的模型列表
3. **Gateway**: `/gateway` - Gateway API 和连接方式
4. **Concepts/Models**: `/concepts/models` - 模型配置

### 需要提取的信息
- [ ] 完整的斜杠命令列表及参数
- [ ] 支持的模型提供商和模型名称
- [ ] Gateway 健康检查 API 端点
- [ ] 思考深度的具体参数值
- [ ] 推理显示的开关方式

---

## 🎨 设计建议（来自前AI助手）

### 优化建议

#### 1. 模型选择 - 智能推荐 + 手动覆盖
```
┌─────────────────────────────────────────┐
│  🤖 智能推荐: GPT-4o (基于任务复杂度)    │
├─────────────────────────────────────────┤
│  常用模型                    [自定义 ▼] │
│  [GPT-4o] [Claude 3.5] [Mini] [Opus]   │
└─────────────────────────────────────────┘
```

#### 2. 思考深度 - 滑块 + 快捷标签
```
┌─────────────────────────────────────────┐
│  🧠 思考深度                            │
│  ○━━━━━●━━━━━━━━━━━━━━  中等(3/6)      │
│  [关] [轻] [中] [深] [极深]            │
│  预估Token: ~2,400  |  响应时间: ~3s    │
└─────────────────────────────────────────┘
```

#### 3. 命令日志 - 时间轴 + 分组
```
┌─────────────────────────────────────────┐
│  📜 命令历史                     [清除] │
├─────────────────────────────────────────┤
│  今天 10:30                            │
│  ├─ /think --depth=3            ✓ 2.4s │
│  ├─ /compact                     ✓ 0.8s │
│  今天 10:15                            │
│  ├─ /reset                       ✓ 1.2s │
│  └─ /model claude-3.5-sonnet    ✓      │
└─────────────────────────────────────────┘
```

#### 4. 连接质量指示器
```
┌─────────────────────────────────────────┐
│  🟢 OpenClaw 已连接    [刷新] [设置]   │
│  延迟: 45ms  |  版本: v1.2.0  |  ⬆⬇    │
└─────────────────────────────────────────┘
```

---

## 🔌 技术集成点

### 1. 连接 OpenClaw Gateway
```typescript
// Gateway 默认配置
const OPENCLAW_CONFIG = {
  endpoint: 'http://localhost:18789',
  healthCheckInterval: 5000,  // 5秒检测一次
  retryAttempts: 3,
  retryDelay: 3000
};
```

### 2. API 端点（推测，需确认）
```typescript
// 健康检查
GET /api/health

// 发送命令
POST /api/command
Body: { command: string, params?: object }

// 获取模型列表
GET /api/models

// 获取当前配置
GET /api/config
```

### 3. 集成到 App.tsx
```typescript
import OpenClawPanel from './OpenClawPanel';

// 在总览页面顶部添加
<div className="openclaw-panel-container">
  <OpenClawPanel />
</div>
```

---

## ⚠️ 已知限制

1. **需要 OpenClaw Gateway 预先运行** - Dashboard 依赖 Gateway 提供 API
2. **Dashboard 需要 Node.js 18+** - 确保环境符合要求
3. **工部功能需要 Docker** - 如需完整功能需安装 Docker
4. **OpenClaw 文档需进一步提取** - 当前面板中的命令是基于推测，需对照官方文档调整

---

## 📝 下一步行动清单

### 高优先级
- [ ] 访问 https://docs.openclaw.ai/cli 提取所有斜杠命令
- [ ] 确认 Gateway API 端点和认证方式
- [ ] 将 OpenClawPanel 集成到 App.tsx
- [ ] 实现真实的命令发送 API 调用

### 中优先级
- [ ] 优化模型选择 UI（智能推荐）
- [ ] 实现思考深度滑块
- [ ] 优化命令日志时间轴显示
- [ ] 添加连接质量指标（延迟、版本、运行时长）

### 低优先级
- [ ] 添加键盘快捷键支持
- [ ] 实现命令自动补全
- [ ] 添加命令执行确认机制
- [ ] 优化移动端适配

---

## 🔗 相关资源

- **OpenClaw GitHub**: https://github.com/openclaw/openclaw
- **OpenClaw Releases**: https://github.com/openclaw/openclaw/releases
- **OpenClaw Discord**: https://discord.com/invite/clawd
- **项目路径**: `/Users/kuang/Downloads/openreign-pro-v1.2`

---

## 💬 交接备注

1. **OpenClawPanel.tsx 已创建** - 基础模板完成，但命令参数需根据官方文档调整
2. **用户强调参考官方文档** - 所有斜杠命令必须对照 https://docs.openclaw.ai/ 实现
3. **连接刷新功能** - 用户特别提出需要面板连接刷新器
4. **设计风格** - 保持与 Dashboard 一致的深色主题、圆角、渐变背景
5. **交互细节** - 危险操作（/kill、/reset）需要确认机制

---

**交接完成时间**: 2026-03-25  
**交接文档版本**: v1.0
