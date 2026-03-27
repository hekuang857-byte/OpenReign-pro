# 扩展部门使用指南

## 概述

OpenReign Pro 支持通过配置添加自定义部门，无需修改核心代码。

## 核心 vs 扩展

| 类型 | 说明 | 配置方式 |
|------|------|---------|
| **核心部门** | 太子、中书省、门下省、尚书省、六部 | 硬编码 + 配置化职责 |
| **扩展部门** | 用户自定义部门 | 纯配置驱动 |

## 添加扩展部门步骤

### 步骤1：编辑配置文件

编辑 `config/departments.json`，在 `extension_departments` 中添加：

```json
{
  "extension_departments": {
    "my_department": {
      "id": "my_department",
      "name": "我的部门",
      "nameEn": "My Department",
      "role": "自定义职责描述",
      "level": 3,
      "type": "extension",
      "parent": "shangshu",
      "enabled": true,
      
      "responsibilities": [
        "responsibility_1",
        "responsibility_2"
      ],
      
      "execution": {
        "mode": "skill",
        "skill": "my-skill",
        "entrypoint": "execute",
        "timeout": 60000
      },
      
      "reporting": {
        "progressTemplate": "我的部门正在{action}：{detail}",
        "todoCategories": ["步骤1", "步骤2", "步骤3"]
      }
    }
  }
}
```

### 步骤2：选择执行模式

#### 模式1：Skill（推荐）

调用已安装的 skill：

```json
{
  "execution": {
    "mode": "skill",
    "skill": "skill-name",
    "entrypoint": "execute",
    "timeout": 60000
  }
}
```

**Skill 示例：**

```javascript
// ~/.stepclaw/skills/my-skill/index.js
module.exports = {
  async execute(task, context) {
    const { kanban, report } = context;
    
    // 上报进度
    await report('开始', '初始化');
    
    // 执行业务逻辑
    const result = await doSomething(task);
    
    // 上报完成
    await kanban.todo(task.id, '1', '步骤1', 'completed', '完成详情');
    
    return {
      status: 'completed',
      output: result,
      summary: '执行完成'
    };
  }
};
```

#### 模式2：Script

调用外部脚本：

```json
{
  "execution": {
    "mode": "script",
    "script": "/path/to/script.sh",
    "args": ["--task-id", "{taskId}", "--input", "{input}"],
    "timeout": 60000
  }
}
```

**变量替换：**
- `{taskId}` → 任务ID
- `{taskTitle}` → 任务标题
- `{taskType}` → 任务类型
- `{input}` → 任务描述（JSON）

#### 模式3：Agent

调用 OpenClaw subagent：

```json
{
  "execution": {
    "mode": "agent",
    "agentId": "my-agent",
    "promptTemplate": "请处理以下任务：{task}",
    "timeout": 120000
  }
}
```

### 步骤3：重启 Dashboard

```bash
npm run server
```

配置会自动加载，无需修改代码。

## 配置字段说明

### 必需字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 部门唯一标识 |
| `name` | string | 部门中文名 |
| `type` | string | 必须是 `"extension"` |
| `level` | number | 3=六部级 |
| `parent` | string | 上级部门，通常是 `"shangshu"` |
| `execution.mode` | string | `skill`/`script`/`agent` |

### 可选字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用 |
| `nameEn` | string | - | 英文名 |
| `role` | string | - | 职责描述 |
| `responsibilities` | array | `[]` | 职责列表 |
| `reporting.progressTemplate` | string | `"{name}正在{action}：{detail}"` | 进度上报模板 |
| `reporting.todoCategories` | array | `[]` | todo 分类 |

## 示例

### 示例1：数据科学院

```json
{
  "data_science": {
    "id": "data_science",
    "name": "数据科学院",
    "role": "高级数据分析与机器学习",
    "level": 3,
    "type": "extension",
    "parent": "shangshu",
    "enabled": true,
    
    "responsibilities": [
      "machine_learning",
      "deep_learning",
      "data_mining"
    ],
    
    "execution": {
      "mode": "skill",
      "skill": "data-science",
      "entrypoint": "analyze",
      "timeout": 300000
    },
    
    "reporting": {
      "progressTemplate": "数据科学院正在{action}：{detail}",
      "todoCategories": ["数据预处理", "特征工程", "模型训练", "结果评估"]
    }
  }
}
```

### 示例2：安全运维中心

```json
{
  "security_ops": {
    "id": "security_ops",
    "name": "安全运维中心",
    "role": "7x24安全监控与应急响应",
    "level": 3,
    "type": "extension",
    "parent": "shangshu",
    "enabled": true,
    
    "execution": {
      "mode": "script",
      "script": "/usr/local/bin/soc-monitor",
      "args": ["--task-id", "{taskId}"],
      "timeout": 60000
    },
    
    "reporting": {
      "progressTemplate": "安全运维中心正在{action}：{detail}",
      "todoCategories": ["威胁检测", "事件分析", "应急响应"]
    }
  }
}
```

## 在任务中使用

中书省规划时，可以指定扩展部门：

```javascript
// 在 plan.subtasks 中使用扩展部门
{
  "subtasks": [
    { "id": "1", "title": "数据清洗", "dept": "hubu", "estimatedTime": "2小时" },
    { "id": "2", "title": "机器学习模型训练", "dept": "data_science", "estimatedTime": "4小时" },
    { "id": "3", "title": "安全审计", "dept": "security_ops", "estimatedTime": "1小时" }
  ]
}
```

## 调试

### 查看加载的部门

```bash
curl http://localhost:18790/api/chaoting/bumen
```

### 查看扩展部门

```javascript
// 在代码中
const extensions = orchestrator.deptConfig.getExtensionDepartments();
console.log(extensions);
```

### 验证配置

```bash
# 检查 JSON 语法
node -e "JSON.parse(require('fs').readFileSync('config/departments.json'))"
```

## 注意事项

1. **ID 唯一性** - 扩展部门 ID 不能与核心部门重复
2. **权限** - 扩展部门默认可被尚书省调用
3. **热重载** - 修改配置后 Dashboard 会自动重载
4. **错误处理** - Skill/Script 执行失败会记录到任务日志

## 故障排查

### 部门未加载

检查：
- `enabled` 是否为 `true`
- JSON 语法是否正确
- `type` 是否为 `"extension"`

### Skill 未找到

检查：
- Skill 是否安装在 `~/.stepclaw/skills/`
- `entrypoint` 函数是否存在

### 脚本执行失败

检查：
- 脚本路径是否正确
- 脚本是否有执行权限
- 变量替换是否正确
