# OpenReign Pro v1.2.2 (Dragon Throne)

🏛️ **OpenClaw Gateway 之上的三省六部治理架构**

[![Version](https://img.shields.io/badge/version-1.2.2-blue)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

> 用 1300 年前的帝国制度，重新设计 AI 多 Agent 协作架构

![Dashboard Preview](./docs/assets/preview.png)

---

## 🎬 快速预览

**30 秒体验三省六部治理：**

```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro
./start.sh
```

访问 http://localhost:18790

---

## ✨ 核心特性

### 🏛️ 三省六部架构
- **太子** - 任务分拣与意图识别
- **中书省** - 方案规划与任务拆解
- **门下省** - 质量审议与封驳机制
- **尚书省** - 执行调度与进度汇总
- **六部** - 并行执行（礼/户/兵/刑/工/吏）

### 🎨 八大国风功能
| 功能 | 说明 |
|------|------|
| 🗡️ **兵器库** | 技能注册与管理 |
| 📜 **奏折阁** | 已完成任务归档 |
| 📋 **圣旨模板** | 任务模板预设 |
| 🌅 **上朝仪式** | 每日开场动画 |
| 💓 **心跳检测** | Agent 健康监控 |
| ⏰ **军机处** | 定时任务管理 |
| 💬 **朝堂议政** | 多部门讨论 |
| 📊 **Token排行** | 消耗统计排行 |

### ⚡ 技术亮点
- 🔄 **任务执行引擎** - 六部并行执行，超时重试
- 📡 **WebSocket 实时同步** - 看板实时更新
- 🤖 **AI 增强** - 每个部门可配置 AI 技能
- 📱 **响应式设计** - 支持移动端访问

---

## 🚀 快速开始

### 方式一：一键启动（推荐）

```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro
./start.sh
```

访问 http://localhost:18790

### 方式二：手动安装

```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro/dashboard
npm install
node server.js
```

### 方式三：Docker

```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro
docker-compose up -d
```

---

## 📋 系统要求

- **Node.js** >= 18
- **OpenClaw** (可选，用于完整功能)

---

## 🏗️ 架构设计

```
皇上(User) 
    ↓
太子(Taizi) - 任务分拣
    ↓
中书省(Zhongshu) - 方案规划
    ↓
门下省(Menxia) - 质量审议（可封驳）
    ↓
尚书省(Shangshu) - 执行调度
    ↓
六部并行执行（礼/户/兵/刑/工/吏）
    ↓
尚书省汇总 → 中书省回奏 → 皇上
```

**状态机**：Pending → Taizi → Zhongshu → Menxia → Assigned → Doing → Review → Completed

---

## 📚 文档

- [安装指南](./INSTALL.md)
- [架构设计](./docs/ARCHITECTURE.md)
- [部署方案](./docs/DEPLOYMENT.md)
- [性能优化](./docs/PERFORMANCE_OPTIMIZATION.md)
- [API 文档](./docs/API.md)

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE)

---

**OpenReign Pro** - 让 AI 协作像治理国家一样有序 🏛️
- ✅ OpenViking 记忆存储状态
- ✅ 生成本地配置文件

### 手动安装

```bash
cd openreign-pro-v1.2.2/dashboard
npm install
npm run build
npm run server
```

### 启动

```bash
# 启动 Dashboard（包含后端 API）
cd dashboard
npm start

# 或分步启动
npm run build
npm run server
```

### 访问

- **Dashboard**: http://localhost:18790
- **OpenClaw**: http://localhost:18789

## 核心特性

### 🏛️ 三省六部
- **太子**: 任务分发中枢
- **中书省**: 决策规划
- **门下省**: 审核监督
- **尚书省**: 执行调度
- **六部**: 吏、兵、户、礼、刑、工
- **外史院**: 外邦使节管理

### 🔄 智能分流
- 简单任务 (≤3): 直接执行
- 复杂任务 (≥4): 朝廷流程

### 🛡️ 死循环防护
- 最大 50 次迭代
- 最大 10 层深度
- 自动检测阻断

### 🧠 记忆分级
- L0 临时 → L4 永久
- 自动分类
- 智能存储

### 🎛️ OpenClaw 控制面板
Dashboard 集成 OpenClaw 斜杠命令：
- `/think` - 调节推理深度
- `/reasoning` - 思考模式
- `/compact` - 压缩上下文
- `/reset` - 重置会话
- `/kill` - 终止任务
- `/context` - 查看上下文

## 项目结构

```
openreign-pro-v1.2/
├── config/
│   └── openreign.json          # 主配置文件
├── dashboard/                   # Dashboard UI + API
│   ├── src/
│   │   └── App.tsx             # React 前端
│   ├── server.js               # Express 后端 API
│   ├── package.json
│   └── dist/                   # 构建输出
├── docs/
│   ├── ARCHITECTURE.md         # 架构文档
│   ├── CHANGELOG.md            # 更新日志
│   └── UPGRADE.md              # 升级指南
├── scripts/
│   ├── install.sh              # 安装脚本
│   └── validate-config.js      # 配置验证工具
├── agents/                      # Agent 工作区模板
└── README.md
```

## 配置说明

### 部门模型配置

在 `config/openreign.json` 中配置：

```json
{
  "agents": {
    "taizi": {
      "model": "inherit"  // 继承 OpenClaw 默认模型
    },
    "menxia": {
      "model": "gpt-4o-mini"  // 指定轻量级模型
    },
    "bingbu": {
      "model": "claude-3-5-sonnet-20241022"  // 指定代码模型
    }
  }
}
```

**模型选择说明：**
- `inherit`: 使用 OpenClaw 配置的默认模型
- `gpt-4o`: GPT-4o 全能模型
- `gpt-4o-mini`: 轻量级快速响应
- `claude-3-5-sonnet-20241022`: 代码执行专用

**注意**: Temperature 等参数由 OpenClaw 控制，通过 Dashboard 的 `/think` 命令调节。

## 文档

- [架构文档](docs/ARCHITECTURE.md)
- [更新日志](docs/CHANGELOG.md)
- [升级指南](docs/UPGRADE.md)

## 版本

**当前版本**: 1.2.0 (Dragon Throne)  
**发布日期**: 2026-03-24

## 作者

Lobster (heykode)

## 许可

MIT License - 开源可自由使用
