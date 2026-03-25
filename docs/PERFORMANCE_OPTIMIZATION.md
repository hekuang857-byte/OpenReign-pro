# OpenReign Pro 性能优化方案

> 基于 OpenClaw 官方文档和最佳实践

## 一、当前性能瓶颈分析

### 1.1 已识别问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 前端 bundle 245KB | 首屏加载慢 | 🔴 高 |
| 无代码分割 | 所有功能一次性加载 | 🔴 高 |
| WebSocket 全量广播 | 网络开销大 | 🟡 中 |
| 任务执行无流式输出 | 用户等待时间长 | 🟡 中 |
| 无缓存机制 | 重复请求 | 🟡 中 |
| 图片资源未优化 | 加载慢 | 🟢 低 |

---

## 二、优化方案（按优先级）

### 2.1 前端优化

#### A. 代码分割（Code Splitting）
```typescript
// 当前：所有页面一次性加载
import { Armory } from './pages/Armory';
import { Memorials } from './pages/Memorials';
// ... 所有页面

// 优化：按需加载
const Armory = lazy(() => import('./pages/Armory'));
const Memorials = lazy(() => import('./pages/Memorials'));

// 添加 Suspense
<Suspense fallback={<Loading />}>
  {activeTab === 'armory' && <Armory />}
</Suspense>
```

**效果**：首屏从 245KB → ~80KB

#### B. 组件懒加载
```typescript
// 大组件延迟加载
const ChartComponent = lazy(() => import('./components/Chart'));
const EditorComponent = lazy(() => import('./components/Editor'));
```

#### C. 虚拟列表（长列表优化）
```typescript
// 任务列表、部门列表使用虚拟滚动
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={tasks.length}
  itemSize={80}
>
  {TaskRow}
</FixedSizeList>
```

---

### 2.2 后端优化

#### A. 流式响应（Streaming）
```javascript
// 当前：等待全部完成再返回
app.post('/api/tasks/execute', async (req, res) => {
  const result = await taskExecutor.execute(task); // 阻塞
  res.json(result);
});

// 优化：流式返回进度
app.post('/api/tasks/execute', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  
  taskExecutor.on('task:status', ({ taskId, status }) => {
    res.write(`data: ${JSON.stringify({ taskId, status })}\n\n`);
  });
});
```

#### B. 连接池优化
```javascript
// 数据库/外部服务连接池
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,        // 最大并发连接
  maxFreeSockets: 10,    // 空闲连接
  timeout: 30000,
  freeSocketTimeout: 30000
});

// 使用连接池
fetch(url, { agent: httpAgent });
```

#### C. 缓存层
```javascript
// 部门配置缓存（5分钟）
const deptCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getDepartments() {
  const cached = deptCache.get('departments');
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }
  
  const data = readConfig().agents;
  deptCache.set('departments', { data, time: Date.now() });
  return data;
}
```

---

### 2.3 WebSocket 优化

#### A. 增量更新（Diff）
```javascript
// 当前：全量广播
broadcast({ type: 'config_changed', data: fullConfig });

// 优化：只发送变更
const diff = getDiff(oldConfig, newConfig);
broadcast({ type: 'config_patch', patches: diff });
```

#### B. 心跳优化
```javascript
// 当前：固定30秒
setInterval(checkHeartbeat, 30000);

// 优化：自适应心跳
// - 活跃时：30秒
// - 空闲时：60秒
// - 后台时：120秒
```

#### C. 连接复用
```javascript
// 使用单个 WebSocket 连接多路复用
const multiplexer = new WebSocketMultiplexer(ws);

multiplexer.subscribe('task:status', callback);
multiplexer.subscribe('config:update', callback);
```

---

### 2.4 任务执行优化

#### A. 并行度控制
```javascript
// 当前：全部并行
Promise.all(departments.map(d => execute(d)));

// 优化：限制并发数
const pLimit = require('p-limit');
const limit = pLimit(3); // 最多3个并行

Promise.all(departments.map(d => limit(() => execute(d))));
```

#### B. 任务队列
```javascript
// 使用队列避免过载
const Queue = require('bull');
const taskQueue = new Queue('tasks', redis);

taskQueue.process(3, async (job) => { // 3个并发worker
  return taskExecutor.execute(job.data);
});
```

#### C. 超时精细化
```javascript
// 不同任务不同超时
const timeouts = {
  'bingbu': 30 * 60 * 1000,    // 代码生成30分钟
  'libu': 5 * 60 * 1000,       // 文档5分钟
  'xingbu': 10 * 60 * 1000,    // 测试10分钟
};
```

---

### 2.5 模型调用优化（OpenClaw适配）

#### A. 模型降级策略
```json
// openclaw.json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "stepfun/step-alpha",
        "fallbacks": [
          "openai/gpt-4o-mini",    // 降级1：更便宜
          "anthropic/claude-3-haiku" // 降级2：更快
        ]
      }
    }
  }
}
```

#### B. 上下文压缩
```javascript
// 长对话自动压缩
if (context.length > 8000) {
  const summary = await ai.summarize(context);
  context = [summary, ...recentMessages];
}
```

#### C. 工具调用优化
```javascript
// 批量工具调用
const results = await Promise.allSettled(
  tools.map(t => callTool(t))
);
```

---

## 三、实施计划

### 第一阶段（1-2天）：前端优化
- [ ] 代码分割实现
- [ ] 懒加载组件
- [ ] 虚拟列表

### 第二阶段（2-3天）：后端优化
- [ ] 流式响应
- [ ] 连接池
- [ ] 缓存层

### 第三阶段（1-2天）：WebSocket优化
- [ ] 增量更新
- [ ] 自适应心跳

### 第四阶段（2-3天）：任务执行优化
- [ ] 并发控制
- [ ] 任务队列
- [ ] 精细化超时

---

## 四、预期效果

| 指标 | 当前 | 优化后 | 提升 |
|------|------|--------|------|
| 首屏加载 | 245KB | ~80KB | 67% ↓ |
| 首屏时间 | 3s | <1s | 70% ↓ |
| 并发任务 | 无限制 | 3-5个 | 稳定性↑ |
| 内存占用 | 高 | 中等 | 40% ↓ |
| 响应延迟 | 500ms | <100ms | 80% ↓ |

---

## 五、监控指标

```javascript
// 性能监控
const metrics = {
  // 前端
  bundleSize: 245,        // KB
  firstPaint: 3000,       // ms
  timeToInteractive: 5000,// ms
  
  // 后端
  apiLatency: 100,        // ms
  wsLatency: 50,          // ms
  memoryUsage: 200,       // MB
  cpuUsage: 30,           // %
  
  // 任务
  taskSuccessRate: 95,    // %
  avgTaskDuration: 300,   // s
  queueLength: 5          // 任务数
};
```

要我立即实施**第一阶段（代码分割）**吗？
