# OpenReign Pro v1.2.0 - OpenClaw 控制面板实现任务

## 任务背景
OpenReign Pro 是基于 OpenClaw Gateway 构建的三省六部治理架构系统。需要在 Dashboard 总览页面顶部添加 OpenClaw 控制面板，用于管理模型选择、思考深度、命令执行等功能。

---

## 📋 需求清单

### 1. 控制面板位置
- **位置**: Dashboard 总览页面顶部
- **组件文件**: `/dashboard/src/OpenClawPanel.tsx` (已创建基础模板)
- **集成方式**: 导入到 `App.tsx` 并嵌入到总览页面

### 2. 功能模块

#### A. 连接状态指示器
- 显示与 OpenClaw Gateway 的连接状态
- 实时刷新按钮（用户特别强调）
- 显示连接详情（端点、端口、响应时间、版本、运行时长）
- 自动重连机制（断开时自动重试3次）

#### B. 斜杠命令按钮组

| 命令 | 功能 | UI 形式 | 备注 |
|------|------|---------|------|
| `/model <model>` | 模型切换 | 横向按钮组 | GPT-4o / GPT-4o Mini / Claude 3.5 / Claude 3 Opus |
| `/think <level>` | 思考深度 | 按钮组 | 关闭 / 极简 / 轻度 / 中等 / 深度 / 极深 |
| `/reasoning on/off` | 显示推理 | 开关按钮 | - |
| `/compact` | 压缩上下文 | 按钮 | - |
| `/reset` | 重置会话 | 按钮 | **需确认弹窗** |
| `/new` | 新建会话 | 按钮 | - |
| `/kill` | 终止任务 | 按钮 | **红色警告，需确认** |
| `/context` | 查看上下文 | 按钮 | - |

#### C. 命令日志面板
- 位置: 控制面板下方
- 显示: 最近 50 条命令历史
- 每条记录: 时间戳 + 命令 + 执行结果 + 响应时间
- 操作: 清除全部 / 显示/隐藏历史

#### D. 部门详情面板更新
- 移除 temperature 滑块
- 添加提示文字: "模型切换请使用上方 OpenClaw 控制面板"
- 保留模型选择下拉框（只读展示）

---

## 🔧 技术实现

### 命令发送机制
```typescript
const sendSlashCommand = (command: string) => {
  console.log(`[OpenClaw Command] ${command}`);
  setCommandHistory(prev => [...prev, { 
    command, 
    time: new Date().toLocaleTimeString(),
    status: 'pending'
  }]);
  
  // 调用 OpenClaw Gateway API
  fetch('/api/command', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }) 
  })
  .then(res => res.json())
  .then(data => {
    // 更新命令状态
  });
};
```

### Gateway 连接配置
```typescript
const OPENCLAW_CONFIG = {
  endpoint: 'http://localhost:18789',  // Gateway 默认端口
  dashboardPort: 18842,                 // Dashboard 端口
  healthCheckInterval: 5000,           // 5秒检测一次
  retryAttempts: 3,
  retryDelay: 3000
};
```

---

## 📚 官方文档参考

**必须参考**: https://docs.openclaw.ai/

### 需要提取的信息
1. **CLI Reference** (`/cli`): 所有斜杠命令的完整语法和参数
2. **Models** (`/providers`): 支持的模型列表和切换方式
3. **Gateway** (`/gateway`): API 端点和连接方式
4. **Concepts/Models** (`/concepts/models`): 模型配置详情

### 关键问题待确认
- [ ] `/think` 命令的具体参数值（--depth 的范围？）
- [ ] `/model` 命令支持的模型名称格式
- [ ] Gateway 健康检查的 API 端点
- [ ] 命令执行的实际 API 路径
- [ ] 是否需要认证/Token

---

## 🎨 设计规范

### 视觉风格
- **主题**: 深色模式
- **背景**: `linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%)`
- **边框**: `1px solid rgba(255,255,255,0.1)`
- **圆角**: `16px` (面板), `8px` (按钮), `10px` (卡片)
- **字体**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### 颜色系统
```
成功/连接: #50C878 (绿色)
错误/断开: #FF6B6B (红色)
警告/连接中: #FF8C42 (橙色)
信息/主色: #4A90D9 (蓝色)
危险: #FF6B6B (红色)
```

### 交互细节
- 按钮悬停: 背景变亮 + 轻微上移
- 危险操作: 二次确认弹窗
- 加载状态: 旋转动画
- 状态指示: 彩色圆点 + 呼吸动画

---

## 📁 文件位置

```
/Users/kuang/Downloads/openreign-pro-v1.2/
├── dashboard/
│   ├── src/
│   │   ├── App.tsx              # 需要集成 OpenClawPanel
│   │   ├── OpenClawPanel.tsx    # ✅ 基础模板已创建
│   │   └── main.tsx
│   └── server.js                # 可能需要添加 API 路由
├── docs/
│   └── CHANGELOG.md             # 项目更新日志
└── HANDOVER.md                  # 本交接文档
```

---

## ✅ 验收标准

1. [ ] 控制面板正确显示在 Dashboard 总览页面顶部
2. [ ] 连接状态实时显示，刷新按钮正常工作
3. [ ] 所有斜杠命令按钮可点击并发送正确命令
4. [ ] 命令历史正确记录和显示
5. [ ] 危险操作（/kill、/reset）有确认弹窗
6. [ ] 部门详情面板已移除 temperature 滑块
7. [ ] 代码参考了 OpenClaw 官方文档
8. [ ] UI 风格与 Dashboard 保持一致

---

## 🚀 启动项目

```bash
# 1. 进入项目目录
cd /Users/kuang/Downloads/openreign-pro-v1.2

# 2. 安装依赖（如未安装）
cd dashboard && npm install

# 3. 启动 Dashboard
cd dashboard && npm run dev

# 4. 确保 OpenClaw Gateway 已运行
# 默认在 http://localhost:18789

# 5. 访问 Dashboard
# http://localhost:18842 或 http://localhost:18790
```

---

## ⚠️ 注意事项

1. **必须先查阅 OpenClaw 官方文档** - 用户特别强调
2. **Gateway 必须预先运行** - Dashboard 依赖 Gateway API
3. **命令参数需对照文档** - 当前模板中的参数是推测的
4. **保留原有功能** - 不要破坏现有的三省六部功能
5. **代码风格一致** - 使用 TypeScript，保持类型安全

---

## 📞 参考资源

- **OpenClaw Docs**: https://docs.openclaw.ai/
- **GitHub**: https://github.com/openclaw/openclaw
- **项目路径**: `/Users/kuang/Downloads/openreign-pro-v1.2`
- **现有模板**: `/dashboard/src/OpenClawPanel.tsx`

---

**任务创建时间**: 2026-03-25  
**优先级**: 高  
**预估工时**: 4-6 小时
