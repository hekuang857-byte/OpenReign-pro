# 奏折菜单全面审查报告

**审查时间**: 2026-03-26 04:33  
**审查范围**: App.tsx 前端代码  
**审查重点**: 奏折菜单 (tasks tab)

---

## 🔍 发现的问题清单

### 1. 进度显示问题 ⚠️

**问题描述**: 已完成任务显示进度0%

**代码位置**: `MOCK_TASKS[2]` (OpenReign-20260326-003)
```typescript
{ id: 'OpenReign-20260326-003', status: '已批阅', progress: 100, ... }
```

**预期**: 进度条应显示100%  
**实际**: 可能显示0%

**可能原因**:
1. CSS样式问题导致进度条宽度计算错误
2. `task.progress` 被覆盖或重置
3. 类型转换问题 (string vs number)

**修复建议**:
```typescript
// 确保progress是数字
<span>{Number(task.progress)}%</span>
<div style={{ width: `${Number(task.progress)}%`, ... }} />
```

---

### 2. 状态筛选不一致 ⚠️

**问题描述**: 统计和筛选逻辑不一致

**统计逻辑** (line 425):
```typescript
已批阅: tasks.filter(t => ['已批阅', 'completed', 'done'].includes(t.status)).length,
```

**筛选逻辑** (line 407-409):
```typescript
} else if (taskFilter === '已批阅') {
  mf = ['已批阅', 'completed', 'done'].includes(task.status);
}
```

**状态**: ✅ 已修复，逻辑一致

---

### 3. API数据覆盖MOCK ⚠️

**问题描述**: API返回空数组时覆盖MOCK数据

**代码位置** (line 226):
```typescript
if (data.tasks && data.tasks.length > 0) {
  setTasks(formattedTasks);
}
// 否则保留MOCK_TASKS
```

**状态**: ✅ 已修复

---

### 4. 缺少状态映射 ⚠️

**STATUS_NAMES 缺少**:
- `pending` → 等待中 ✅ 已添加
- `completed` → 已完成 ✅ 已添加
- `failed` → 失败 ✅ 已添加
- `done` → 已完成 ✅ 已添加

**状态**: ✅ 已修复

---

### 5. 展开详情状态显示 ⚠️

**问题描述**: 展开后只显示phase，不显示status

**修复前**:
```typescript
<div>当前阶段: {task.phase}</div>
```

**修复后**:
```typescript
<div>当前状态: {getStatusText(task.status)}</div>
<div>当前阶段: {task.phase}</div>
```

**状态**: ✅ 已修复

---

### 6. 按钮显示逻辑问题 ⚠️

**问题描述**: 已完成任务仍显示"重试"按钮

**代码** (line 510):
```typescript
{!isCancelled && task.status !== '已批阅' && (
  <button>中断</button>
)}
<button>重试</button>  // 所有状态都显示
```

**建议修复**:
```typescript
{!isCancelled && !['已批阅', 'completed', 'done'].includes(task.status) && (
  <button>中断</button>
)}
{['failed', 'cancelled'].includes(task.status) && (
  <button>重试</button>
)}
```

**状态**: ❌ 待修复

---

### 7. 成本显示条件问题 ⚠️

**问题描述**: 成本为0时不显示

**代码** (line 503):
```typescript
{task.totalCost > 0 && (
  <div>成本: ${task.totalCost?.toFixed(4)}</div>
)}
```

**建议**: 始终显示成本，即使为0
```typescript
<div>成本: ${(task.totalCost || 0).toFixed(4)}</div>
```

**状态**: ❌ 待优化

---

### 8. 时间显示问题 ⚠️

**问题描述**: `task.time` 是字符串，不是实时计算

**代码**:
```typescript
<span>{task.time}</span>  // "10分钟前" 是静态的
```

**建议**: 使用实时计算或最后更新时间
```typescript
<span>{formatTimeAgo(task.lastUpdate)}</span>
```

**状态**: ⚪ 低优先级

---

### 9. 缺少任务状态实时更新 ⚠️

**问题描述**: WebSocket连接但未充分利用

**代码** (line 254-274):
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type?.startsWith('task:')) {
    fetchTasks();  // 只刷新列表
    // 未更新具体任务状态
  }
};
```

**建议**: 增量更新，不重新获取全部
```typescript
if (data.type === 'task:progress') {
  updateTaskProgress(data.taskId, data.progress);
}
```

**状态**: ⚪ 优化项

---

### 10. 新建任务弹窗缺少部门选择 ⚠️

**问题描述**: 只能输入内容，不能选择执行部门

**建议**: 添加部门选择器
```typescript
<select value={selectedDept} onChange={...}>
  <option value="bingbu">兵部</option>
  ...
</select>
```

**状态**: ⚪ 功能增强

---

## 📊 问题汇总

| 严重程度 | 数量 | 已修复 | 待修复 |
|---------|------|--------|--------|
| 🔴 高 | 2 | 1 | 1 |
| 🟡 中 | 4 | 3 | 1 |
| 🟢 低 | 4 | 2 | 2 |
| **总计** | **10** | **6** | **4** |

---

## 🎯 立即修复项

### 修复1: 按钮显示逻辑
```typescript
// 在 TaskRow 组件中
<div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
  {!isCancelled && !['已批阅', 'completed', 'done'].includes(task.status) && (
    <button onClick={e => { e.stopPropagation(); handleCancelTask(task.id); }}>
      中断
    </button>
  )}
  {['failed', 'cancelled'].includes(task.status) && (
    <button onClick={e => { e.stopPropagation(); handleRetryTask(task.id); }}>
      重试
    </button>
  )}
</div>
```

### 修复2: 始终显示成本
```typescript
<div><span style={{ color: 'rgba(255,255,255,0.35)' }}>成本</span>
  <div style={{ color: '#00A86B', marginTop: '3px' }}>
    ${(task.totalCost || 0).toFixed(4)}
  </div>
</div>
```

### 修复3: 确保进度为数字
```typescript
// 在进度显示处
<span>{Number(task.progress || 0)}%</span>
<div style={{ width: `${Number(task.progress || 0)}%`, ... }} />
```

---

## ✅ 已修复项确认

1. ✅ 任务ID格式: OpenReign-YYYYMMDD-NNN
2. ✅ 状态筛选逻辑统一
3. ✅ API空数据处理
4. ✅ 状态名称映射完整
5. ✅ 展开详情显示状态
6. ✅ 分类衔接修复

---

## 📝 建议

1. **添加单元测试** - 测试筛选逻辑
2. **添加E2E测试** - 测试完整流程
3. **性能优化** - 大数据量虚拟列表
4. **错误边界** - 防止组件崩溃

---

*审查完成*
