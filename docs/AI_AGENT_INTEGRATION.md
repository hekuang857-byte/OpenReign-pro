# OpenReign Pro + AI Agent 融合方案

## 核心概念

将我的编码能力和思维方式封装为 OpenReign 的 **"军机处·AI Agent"** 部门，成为三省六部之上的智能决策层。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenReign Pro v1.3.0                     │
├─────────────────────────────────────────────────────────────┤
│  用户输入 → 太子(意图识别) → AI Agent(智能规划) → 三省六部   │
│                              ↓                               │
│                    ┌──────────────────┐                     │
│                    │   军机处·AI Agent │                     │
│                    │  - 代码生成        │                     │
│                    │  - 文件操作        │                     │
│                    │  - 工具调用        │                     │
│                    │  - 自我验证        │                     │
│                    └──────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 功能模块

### 1. 智能规划引擎 (AI Planning)
**部门**: 中书省·AI 分署

**能力**:
- 任务拆解：将复杂需求分解为可执行步骤
- 依赖分析：自动识别文件/技能依赖关系
- 风险评估：预判潜在问题并给出规避方案

**示例**:
```
用户: "添加用户认证功能"
AI规划:
  1. [兵部] 创建 auth.ts 核心模块
  2. [礼部] 编写 API 文档
  3. [户部] 设计用户数据表
  4. [刑部] 添加安全验证
  5. [工部] 部署配置更新
```

### 2. 代码生成器 (Code Generator)
**部门**: 兵部·AI 编程署

**能力**:
- 多语言代码生成 (TypeScript/Python/Go)
- 上下文感知：读取现有代码风格保持一致
- 自动补全：根据注释生成完整实现

**调用方式**:
```typescript
// 通过 OpenReign API 调用
POST /api/ai/generate-code
{
  "task": "创建用户登录接口",
  "context": ["src/types/user.ts", "src/db/schema.ts"],
  "style": "existing", // 保持现有代码风格
  "tests": true        // 同时生成测试
}
```

### 3. 文件操作助手 (File Ops)
**部门**: 户部·AI 文档署

**能力**:
- 智能文件创建：根据需求自动创建目录结构
- 批量重构：安全地重命名/移动文件
- 变更追踪：记录所有文件操作便于回滚

**技能集成**:
- `skill:file-ops` - 文件读写
- `skill:git` - 版本控制
- `skill:search` - 代码搜索替换

### 4. 工具调用编排 (Tool Orchestration)
**部门**: 工部·AI 部署署

**能力**:
- 自动选择最优工具链
- 并行执行无依赖任务
- 失败自动重试和降级

**示例工作流**:
```yaml
workflow: 部署新版本
steps:
  - tool: git/commit          # 礼部
  - tool: npm/build           # 兵部
  - tool: docker/build        # 工部
  - tool: k8s/deploy          # 工部
  - tool: slack/notify        # 外史院
```

### 5. 自我验证系统 (Self-Validation)
**部门**: 门下省·AI 审核署

**能力**:
- 代码审查：自动检查潜在 bug
- 测试生成：为修改的代码生成测试用例
- 回归验证：确保修改不破坏现有功能

**验证循环**:
```
生成代码 → 编译检查 → 单元测试 → 集成测试 → 人工审核
    ↑                                              ↓
    └────────────── 修复问题 ←─────────────────────┘
```

## 实现方案

### 方案 A: 独立 Agent 部门 (推荐)

新增 **"军机处"** 作为第 7 个一级部门：

```json
{
  "id": "junjichu",
  "name": "军机处",
  "nameEn": "AI Agent",
  "level": 1,
  "role": "智能决策中枢",
  "functions": [
    "task_planning",
    "code_generation",
    "file_operations",
    "tool_orchestration",
    "self_validation"
  ],
  "can_call": ["all_departments"],
  "model": "stepfun/step-alpha",
  "features": {
    "auto_plan": true,
    "auto_execute": false,  // 需要确认
    "self_heal": true       // 错误自动修复
  }
}
```

### 方案 B: 技能插件化

将我的能力封装为技能包：

```
skills/
├── ai-agent/
│   ├── SKILL.md
│   ├── package.json
│   └── src/
│       ├── planner.ts      # 任务规划
│       ├── generator.ts    # 代码生成
│       ├── validator.ts    # 自我验证
│       └── executor.ts     # 执行引擎
```

安装方式：
```bash
openclaw skill install ai-agent
```

### 方案 C: 混合模式 (最终形态)

```
┌────────────────────────────────────┐
│         OpenReign Pro              │
├────────────────────────────────────┤
│  太子 → 判断是否需要 AI 介入        │
│   ↓                                │
│  军机处 (AI Agent)                 │
│   ├─ 规划 → 生成执行计划           │
│   ├─ 执行 → 调用六部技能           │
│   ├─ 验证 → 自动测试验证           │
│   └─ 学习 → 记录成功经验           │
│   ↓                                │
│  六部执行具体任务                   │
└────────────────────────────────────┘
```

## 技术实现

### 新增 API 端点

```typescript
// AI Agent 主接口
POST /api/ai/execute
{
  "instruction": "创建用户认证模块",
  "context": {
    "existing_files": ["src/types.ts"],
    "requirements": ["JWT", "refresh_token"]
  },
  "mode": "plan_first" | "execute_direct" | "full_auto"
}

// 返回执行计划
{
  "plan_id": "PLN-20260325-001",
  "steps": [
    { "dept": "bingbu", "action": "create_file", "file": "src/auth.ts" },
    { "dept": "libu", "action": "write_doc", "file": "docs/auth.md" },
    { "dept": "xingbu", "action": "security_audit" }
  ],
  "estimated_time": "15m",
  "confidence": 0.92
}
```

### 前端界面

新增 **"军机处"** 页面：

```
┌────────────────────────────────────────┐
│  军机处 · AI Agent                      │
├────────────────────────────────────────┤
│  [自然语言输入框]                       │
│  "帮我重构用户模块，添加缓存机制"        │
├────────────────────────────────────────┤
│  执行计划                               │
│  1. [兵部] 分析现有代码... ✓            │
│  2. [兵部] 生成缓存层代码... →          │
│  3. [户部] 更新数据模型... ⏸            │
│  4. [刑部] 安全审查... ○                │
├────────────────────────────────────────┤
│  [查看代码] [修改] [确认执行] [取消]    │
└────────────────────────────────────────┘
```

## 工作流程示例

### 场景：添加新功能

**传统方式**:
1. 用户 → 太子 → 中书 → 兵部 → 手动编写代码 → 测试 → 完成

**AI Agent 方式**:
1. 用户 → 太子 → **军机处(AI)**
2. AI 分析需求 → 自动生成代码 → 自我测试
3. AI 提交给 门下省 审核
4. 审核通过 → 自动部署
5. 记录经验 → 下次类似任务更快

### 场景：Bug 修复

```
用户: "登录功能报错"
        ↓
军机处: 分析错误日志
        ↓
       [兵部] 定位问题代码
       [兵部] 生成修复方案
       [刑部] 验证修复安全性
       [工部] 部署热修复
        ↓
用户: 确认修复完成
```

## 配置示例

```json
{
  "agents": {
    "junjichu": {
      "enabled": true,
      "model": "stepfun/step-alpha",
      "thinking": "high",
      "features": {
        "auto_plan": true,
        "auto_code": true,
        "auto_test": true,
        "auto_deploy": false
      },
      "constraints": {
        "max_files_per_task": 10,
        "require_approval_for": ["delete", "deploy_prod"],
        "blacklist_tools": ["rm -rf", "drop_database"]
      }
    }
  }
}
```

## 下一步

1. **实现方案 A**：添加军机处部门
2. **开发核心模块**：规划器 + 代码生成器
3. **集成测试**：与现有三省六部协作
4. **经验学习**：记录成功案例优化策略

要我立即开始实现 **方案 A** 吗？
