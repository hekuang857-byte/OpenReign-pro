# OpenReign Pro

<p align="center">
  <strong>基于三省六部制的 AI 多 Agent 协作框架</strong><br>
  <sub>用 1300 年前的帝国制度，重新设计 AI 协作架构</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OpenClaw-Required-blue?style=flat-square" alt="OpenClaw">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Agents-10_Specialized-8B5CF6?style=flat-square" alt="Agents">
  <img src="https://img.shields.io/badge/Dashboard-Real--time-F59E0B?style=flat-square" alt="Dashboard">
  <img src="https://img.shields.io/badge/License-MIT-22C55E?style=flat-square" alt="License">
</p>

---

## 🏛️ 架构概览

```
皇上/陛下 → 太子(分拣) → 中书省(规划) → 门下省(审议) → 尚书省(派发) → 六部(执行) → 回奏
```

### 核心特性

| 特性 | 说明 |
|------|------|
| **门下省审核** | 专职审议，可封驳不合格方案 |
| **实时看板** | 军机处 Kanban，实时追踪任务状态 |
| **奏折存档** | 完整五阶段时间线，一键导出 Markdown |
| **古风体验** | 完整文言术语体系，沉浸式古代办公 |
| **扩展部门** | 配置化添加新部门，无需改代码 |

---

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd openreign-pro-v1.2.1

# 安装依赖
cd dashboard
npm install

# 构建前端
npm run build
```

### 启动服务

```bash
# 启动 Dashboard 服务
npm run server

# 服务地址
# Dashboard: http://localhost:18790
# WebSocket: ws://localhost:18790/ws
# API:       http://localhost:18790/api
```

### 配置部门

编辑 `config/departments.json` 自定义部门：

```json
{
  "my_dept": {
    "id": "my_dept",
    "name": "我的部门",
    "type": "extension",
    "execution": {
      "mode": "skill",
      "skill": "my-skill"
    }
  }
}
```

---

## 📋 功能模块

### 1. 三省六部核心

| 部门 | 职责 | 状态 |
|------|------|------|
| 太子 | 消息分拣，意图识别 | ✅ |
| 中书省 | 方案规划，子任务拆解 | ✅ |
| 门下省 | 方案审议，可封驳 | ✅ |
| 尚书省 | 任务派发，调度协调 | ✅ |
| 六部 | 专项执行 | ✅ |

### 2. 看板 API

对齐 [edict](https://github.com/cft0808/edict) 的 kanban_update.py：

| 端点 | 功能 |
|------|------|
| `POST /api/kanban/create` | 创建任务 |
| `POST /api/kanban/state` | 更新状态 |
| `POST /api/kanban/flow` | 记录流转 |
| `POST /api/kanban/progress` | 进度上报 |
| `POST /api/kanban/todo` | 子任务详情 |
| `GET /api/kanban/memorial/:id` | 获取奏折 |
| `GET /api/kanban/memorial/:id/markdown` | 导出 Markdown |

### 3. 奏折可视化

- 📜 **五阶段时间线**：圣旨→东宫→中书→门下→尚书→六部→回奏
- 📋 **奏折原文**：古风边框格式
- 📝 **Markdown 导出**：一键复制
- 📊 **统计信息**：进度、耗时、子任务

---

## 🎨 古风体验

### 术语映射

| 现代 | 古风 |
|------|------|
| 任务 | 奏折/要务 |
| 创建 | 草拟 |
| 执行 | 施行 |
| 完成 | 告竣 |
| 代码 | 文书 |
| 数据 | 典籍 |

### 消息示例

```
启奏陛下，中书省正在辨析，拆解核心要点
启奏陛下，兵部正在施行，攻城略地
事已告竣，恭请圣裁
```

---

## 📁 项目结构

```
openreign-pro-v1.2.1/
├── config/
│   ├── openreign.json          # 主配置
│   ├── departments.json        # 部门配置
│   └── classical-terms.json    # 古风术语
├── dashboard/
│   ├── src/
│   │   ├── api-routes/         # API 路由
│   │   ├── components/         # React 组件
│   │   ├── orchestrator.js     # 三省六部编排器
│   │   ├── memorial-formatter.js # 奏折格式化
│   │   └── classical-formatter.js # 古风格式化
│   ├── server.js               # 服务入口
│   └── package.json
├── docs/
│   ├── classical-style-guide.md # 古风指南
│   └── extension-departments.md # 扩展部门指南
└── README.md
```

---

## 🔧 配置说明

### 部门配置

```json
{
  "id": "bingbu",
  "name": "兵部",
  "type": "core",
  "responsibilities": ["code_execution", "debugging"],
  "execution": {
    "mode": "skill_based"
  },
  "reporting": {
    "progressTemplate": "启奏陛下，兵部正在{action}，{detail}"
  }
}
```

### 扩展部门

```json
{
  "id": "my_dept",
  "name": "我的部门",
  "type": "extension",
  "execution": {
    "mode": "skill",
    "skill": "my-skill",
    "entrypoint": "execute"
  }
}
```

---

## 📚 文档

- [古风使用指南](docs/classical-style-guide.md)
- [扩展部门指南](docs/extension-departments.md)
- [API 文档](docs/api.md) (待补充)

---

## 🤝 与 edict 的关系

本项目参考 [edict](https://github.com/cft0808/edict) 的三省六部架构，主要差异：

| 特性 | edict | OpenReign Pro |
|------|-------|---------------|
| 技术栈 | Python | Node.js |
| 配置化 | 基础 | 完整配置驱动 |
| 扩展部门 | 基础 | 三种执行模式 |
| 古风体验 | 有 | 更完善的术语体系 |
| 前端 | React | React + 奏折可视化 |

---

## 📄 License

MIT License

---

<p align="center">
  <sub>谨具奏闻，伏候圣裁。</sub>
</p>


---

## 📁 项目架构

本项目遵循 **万能通用项目架构规范**：

```
openreign-pro/
├── src/              # 核心源代码
│   ├── core/         # 核心引擎（三省六部编排器、状态机）
│   ├── agent/        # 智能体模块（太子、中书、门下、尚书、六部）
│   ├── tools/        # 工具、插件
│   ├── memory/       # 记忆、状态
│   ├── config/       # 配置管理
│   └── utils/        # 通用工具函数
├── apps/             # 应用层
│   ├── server/       # 后端服务
│   └── dashboard/    # 前端 Dashboard
├── packages/         # 共享包
├── tests/            # 测试
├── examples/         # 使用示例
├── docs/             # 文档
├── scripts/          # 部署脚本
├── logs/             # 日志
└── config/           # 运行时配置
```

### 快速启动

```bash
# 安装依赖
npm install

# 启动服务器
npm run start:server

# 启动前端（新终端）
npm run start:dashboard
```
