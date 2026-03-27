# 部门安装指南（三省六部流程版）

## 概述

OpenReign Pro 支持通过**三省六部标准流程**安装新部门，确保每个新部门都经过完整的规划、审议、执行、验收流程。

## 安装流程

```
用户请求 → 太子分拣 → 中书规划 → 门下审议 → 尚书派发 → 六部执行 → 勘验司验收 → 回奏
```

## 详细步骤

### 第一步：太子分拣

**触发**：用户发送"安装部门"请求

```
用户：帮我安装一个新部门叫"智能司"

太子：识别为部门安装任务
     → 创建任务 JJC-INSTALL-001
     → 转交中书省规划
```

### 第二步：中书省规划

**职责**：制定部门安装方案

**输出**：
```json
{
  "plan": {
    "title": "安装智能司部门",
    "subtasks": [
      {
        "id": "config-design",
        "title": "设计部门配置",
        "dept": "zhongshu",
        "detail": "确定ID、名称、类型、职责、执行配置"
      },
      {
        "id": "term-design", 
        "title": "设计古风术语",
        "dept": "zhongshu",
        "detail": "确定官职、自称、上报模板"
      },
      {
        "id": "dept-register",
        "title": "注册部门",
        "dept": "libu",
        "detail": "添加到departments.json"
      },
      {
        "id": "skill-create",
        "title": "创建Skill",
        "dept": "bingbu",
        "detail": "实现execute方法，创建skill文件"
      },
      {
        "id": "term-add",
        "title": "添加术语",
        "dept": "libu-justice",
        "detail": "添加到classical-terms.json"
      },
      {
        "id": "docs-write",
        "title": "编写文档",
        "dept": "libu-justice",
        "detail": "编写使用文档"
      },
      {
        "id": "integration-check",
        "title": "集成检查",
        "dept": "kanys",
        "detail": "配置检查、术语检查、代码检查、展示检查",
        "blocking": true
      }
    ]
  }
}
```

### 第三步：门下省审议

**职责**：审查安装方案

**审查维度**：
1. **配置完整性**：必需字段是否齐全
2. **命名规范**：ID是否符合规范
3. **流程合理性**：在架构中的位置是否合适
4. **依赖检查**：skill/script是否存在

**结果**：
- ✅ 准奏 → 进入尚书省派发
- ❌ 封驳 → 返回中书省修改

### 第四步：尚书省派发

**职责**：分派安装子任务

```
尚书省分析：
- 吏部：部门注册
- 兵部：代码实现
- 工部：配置部署
- 礼部：文档编写
```

### 第五步：六部并行执行

#### 吏部：部门注册
```javascript
// 添加到 departments.json
{
  "zhinengsi": {
    "id": "zhinengsi",
    "name": "智能司",
    "type": "extension",
    "parent": "shangshu",
    "responsibilities": ["智能分析", "辅助决策"],
    "execution": {
      "mode": "skill",
      "skill": "zhinengsi"
    }
  }
}
```

#### 兵部：代码实现
```javascript
// 创建 skill
~/.stepclaw/skills/zhinengsi/
├── index.js
├── skill.json
└── execute.js
```

#### 礼部：添加术语
```json
// 添加到 classical-terms.json
{
  "zhinengsi": {
    "name": "智能司",
    "title": "智能司郎中",
    "role": "演算智能，辅助决策",
    "reporting": {
      "progressTemplate": "启奏陛下，智能司正在{action}，{detail}"
    }
  }
}
```

#### 工部：配置部署
```bash
# 验证配置格式
npm run validate:config

# 重启服务（如需）
npm run server:restart
```

### 第六步：勘验司验收（关键！）

**职责**：集成检查，确保无遗漏

**检查清单**：

| 类别 | 检查项 | 通过标准 |
|------|--------|---------|
| **配置** | 部门ID唯一性 | 无重复 |
| | 必需字段齐全 | id/name/type/execution |
| | parent有效性 | 父部门存在 |
| **术语** | 已添加术语 | classical-terms.json包含 |
| | 术语完整性 | name/title/role/reporting |
| **代码** | execute方法 | 已实现（core类型） |
| | skill文件 | 存在（skill模式） |
| | 无硬编码 | 无旧部门引用 |
| **展示** | memorial-formatter | 包含新部门 |
| | 时间线显示 | 正确显示 |

**结果**：
- ✅ 通过 → 进入回奏
- ❌ 不通过 → 返回工部修复

### 第七步：中书省回奏

**职责**：汇总安装结果

```
启奏陛下，智能司已安装完毕：
- 配置已生效
- 术语已添加
- 代码已实现
- 检查已通过
- 文档已更新

谨具奏闻，伏候圣裁。
```

## 自动化检查脚本

勘验司自动执行以下检查：

```bash
# 运行集成检查
node test-dept-integration.js

# 输出：
✅ 配置检查通过
✅ 术语检查通过
✅ 代码检查通过
✅ 展示检查通过

总计: 0 错误, 0 警告
```

## 使用示例

### 用户请求
```
帮我安装一个新部门：
- ID: zhinengsi
- 名称: 智能司
- 职责: AI分析、智能推荐
- 执行模式: skill
```

### 系统响应
```
📝 已创建任务 JJC-INSTALL-001

📋 安装方案：
1. 中书省：设计配置和术语
2. 门下省：审议方案
3. 尚书省：派发执行任务
4. 吏部：注册部门
5. 兵部：创建Skill
6. 礼部：添加术语和文档
7. 工部：部署配置
8. 勘验司：集成检查 ✅

预计耗时：30分钟
```

### 执行过程
```
[太子] 分拣完成 → 中书省
[中书] 规划完成 → 门下省
[门下] 审议通过 → 尚书省
[尚书] 派发完成 → 六部执行
[吏部] 注册完成 ✓
[兵部] 代码完成 ✓
[礼部] 术语完成 ✓
[工部] 部署完成 ✓
[勘验] 检查通过 ✓
[中书] 回奏完成
```

### 最终结果
```
✅ 智能司安装成功！

配置位置：config/departments.json
术语位置：config/classical-terms.json
Skill位置：~/.stepclaw/skills/zhinengsi/
文档位置：docs/zhinengsi-guide.md

可用命令：
- 查看部门：curl /api/kanban/departments/zhinengsi
- 执行任务：自动派发至智能司
```

## 关键设计

### 1. 强制验收
- 勘验司检查是**阻塞式**的
- 不通过不能回奏
- 自动返回修复

### 2. 自动修复
- 术语缺失 → 自动生成默认
- skill不存在 → 创建模板

### 3. 完整记录
- 所有步骤记录到flowLog
- 生成安装奏折
- 可追溯可审计

## 总结

通过三省六部流程安装部门：
- ✅ 规划完整（中书）
- ✅ 质量把关（门下）
- ✅ 分工明确（尚书）
- ✅ 专业执行（六部）
- ✅ 强制验收（勘验司）

确保每个新部门都**完整、规范、可用**！
