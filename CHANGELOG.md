# Changelog

## [1.2.3] - 2026-03-27

### 新增

#### 勘验司收编
- ✅ 勘验司从扩展部门收编为核心部门
- ✅ 定位：六部执行后、中书省回奏前的技术验收
- ✅ 职责：环境检测、功能测试、安全扫描、性能测试、文档审查
- ✅ 权力：阻塞式验收（不通过则退回工部修复）
- ✅ 流程：六部 → 尚书省汇总 → **勘验司验收** → 中书省回奏
- ✅ 配置：`inspectionRules` 支持自定义验收规则
- ✅ 方法：`executeKanys()` 实现五阶段验收

## [1.2.2] - 2026-03-27

### 新增

#### 古风优化
- ✅ 创建 `config/classical-terms.json` - 完整古风术语映射
- ✅ 创建 `src/classical-formatter.js` - 古风格式化器
- ✅ 修改 `src/kanban-client.js` - 集成古风支持
- ✅ 更新 `config/departments.json` - 古风术语
- ✅ 创建 `docs/classical-style-guide.md` - 古风使用指南

#### 奏折可视化
- ✅ 创建 `src/memorial-formatter.js` - 奏折格式化器
- ✅ 新增 API 端点：
  - `GET /api/kanban/memorial/:taskId` - 获取奏折
  - `GET /api/kanban/memorials` - 获取奏折列表
  - `GET /api/kanban/memorial/:taskId/markdown` - 导出 Markdown
- ✅ 创建前端组件：
  - `MemorialTimeline` - 五阶段时间线
  - `MemorialCard` - 奏折卡片
- ✅ 五阶段时间线：圣旨→东宫→中书→门下→尚书→六部→回奏

#### 扩展框架
- ✅ 创建 `src/extension-executor.js` - 扩展部门执行器
- ✅ 支持三种执行模式：skill/script/agent
- ✅ 尚书省自动识别扩展部门
- ✅ 创建示例扩展部门：勘验司

#### 配置化
- ✅ 创建 `config/department-schema.json` - 配置 Schema
- ✅ 创建 `src/department-config.js` - 配置管理器
- ✅ 六部职责可配置
- ✅ 审核规则可配置

### 优化
- ✅ 门下省审核逻辑配置化
- ✅ 上报消息模板配置化
- ✅ 任务执行超时配置

### 文档
- ✅ 创建 README.md
- ✅ 创建 CHANGELOG.md
- ✅ 创建古风使用指南
- ✅ 创建扩展部门指南

---

## [1.2.1] - 2026-03-25

### 基础功能
- ✅ 看板 API（8个端点）
- ✅ WebSocket 实时更新
- ✅ 任务状态流转
- ✅ 流转记录（flowLog）
- ✅ 进度上报（progressLog）
- ✅ 子任务详情（todos）

### 三省六部核心
- ✅ 太子分拣
- ✅ 中书省规划
- ✅ 门下省审议
- ✅ 尚书省派发
- ✅ 六部执行

---

## 版本说明

- **1.2.2**: 古风优化 + 奏折可视化 + 扩展框架
- **1.2.1**: 基础看板 + 三省六部核心
