# 当前项目 vs 原作者 Edict 架构对比

## 原作者 Edict 核心机制

### 1. 任务执行引擎
```python
# 原作者实现
task_executor.py
├── 超时控制：每个子任务设置超时（默认30分钟）
├── 重试机制：失败自动重试3次
├── 停滞检测：超过阈值自动升级告警
└── 并行执行：六部任务并行，尚书省汇总
```

### 2. 超时处理策略
| 场景 | 原作者处理 |
|------|-----------|
| 子任务超时 | 标记失败，触发重试 |
| 重试3次仍失败 | 升级告警，人工介入 |
| 整体任务超时 | 自动取消，回滚已执行 |
| 超长任务 | 支持分阶段提交（checkpoint） |

### 3. 并行执行
```
尚书省派发：
  ├─ 礼部任务 ──┐
  ├─ 户部任务 ──┤
  ├─ 兵部任务 ──┤── 并行执行
  ├─ 刑部任务 ──┤   Promise.all
  ├─ 工部任务 ──┤
  └─ 吏部任务 ──┘
       ↓
   尚书省汇总（等待全部完成）
```

---

## 当前 OpenReign Pro 实现

### 已实现
- ✅ 三省六部架构配置
- ✅ 任务状态机（10状态）
- ✅ Dashboard 看板展示
- ✅ WebSocket 实时同步
- ✅ 部门动态加载

### 未实现（与原作者差距）
- ❌ 任务执行引擎（当前只是展示层）
- ❌ 超时控制
- ❌ 自动重试
- ❌ 并行执行调度
- ❌ 停滞检测
- ❌ 自动回滚

---

## 关键问题解答

### Q1: 时间限制影响超长任务？

**原作者方案**：
```python
# 支持 checkpoint 机制
class LongRunningTask:
    def execute(self):
        for batch in data.batches():
            result = process(batch)
            self.save_checkpoint(batch.id, result)  # 保存进度
            if self.timeout_approaching():
                self.pause_and_resume_later()  # 暂停，稍后恢复
```

**建议方案**：
- 短任务（<30分钟）：同步执行，超时自动重试
- 长任务（>30分钟）：分阶段执行，支持断点续传
- 超长任务（>2小时）：拆分为多个子任务

### Q2: 如何实现并行执行？

**原作者代码逻辑**：
```python
# 尚书省调度
async def dispatch_to_departments(task, departments):
    # 并行执行六部任务
    results = await asyncio.gather(
        execute_department(task, 'libu'),
        execute_department(task, 'hubu'),
        execute_department(task, 'bingbu'),
        execute_department(task, 'xingbu'),
        execute_department(task, 'gongbu'),
        execute_department(task, 'libu_hr'),
        return_exceptions=True  # 不因为一个失败而全部失败
    )
    
    # 汇总结果
    return aggregate_results(results)
```

**当前项目需要添加**：
```javascript
// server.js 需要添加执行引擎
class TaskExecutor {
  async executeParallel(subtasks) {
    const promises = subtasks.map(t => this.executeSubtask(t));
    return Promise.allSettled(promises);  // 等待全部完成
  }
  
  async executeWithTimeout(task, timeoutMs) {
    return Promise.race([
      this.execute(task),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  }
}
```

---

## 实现建议

### 阶段1：基础执行引擎
```javascript
// 添加任务执行器
class TaskExecutor {
  constructor() {
    this.runningTasks = new Map();
    this.timeouts = new Map();
  }
  
  async execute(task) {
    // 1. 解析任务依赖
    const deps = this.parseDependencies(task);
    
    // 2. 按依赖顺序执行
    for (const batch of deps.batches) {
      // 并行执行同批次任务
      await Promise.all(batch.map(t => this.runWithTimeout(t, 30*60*1000)));
    }
    
    return results;
  }
  
  async runWithTimeout(subtask, timeoutMs) {
    const timeout = setTimeout(() => {
      this.cancel(subtask.id);
    }, timeoutMs);
    
    try {
      const result = await this.run(subtask);
      return result;
    } catch (err) {
      // 重试逻辑
      if (subtask.retries < 3) {
        return this.retry(subtask);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

### 阶段2：超时与重试
- 子任务默认30分钟超时
- 失败自动重试3次
- 支持自定义超时配置

### 阶段3：长任务支持
- checkpoint 机制
- 断点续传
- 进度保存

---

## 当前状态总结

| 功能 | 原作者 | 当前项目 | 差距 |
|------|--------|---------|------|
| 任务执行 | ✅ 完整引擎 | ❌ 只有API | 需开发 |
| 超时控制 | ✅ 有 | ❌ 无 | 需添加 |
| 并行执行 | ✅ 有 | ❌ 无 | 需添加 |
| 自动重试 | ✅ 有 | ❌ 无 | 需添加 |
| 停滞检测 | ✅ 有 | ❌ 无 | 需添加 |
| Dashboard | ✅ 有 | ✅ 有 | 持平 |
| 状态机 | ✅ 有 | ✅ 有 | 持平 |

**结论**：当前项目只是**展示层**，缺少核心的**任务执行引擎**。

要我实现基础的任务执行引擎吗？
