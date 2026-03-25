# OpenReign Pro v1.2.2 更新日志

## v1.2.2 (Dragon Throne) — 2026-03-25

### ✨ 新增8大功能

#### 1. 兵器库 (Armory)
- 技能注册表更名为兵器库，帝国化命名
- 按部门分类：国库（通用）、兵部、礼部、工部、户部、刑部
- 技能详情面板：描述、版本、使用次数
- 部门筛选标签

#### 2. 奏折阁 (Memorials)
- 已完成任务归档展示
- 五阶段时间线：太子→中书→门下→尚书→六部→回奏
- 一键导出 Markdown 奏折
- 按部门/时间筛选

#### 3. 圣旨模板 (Edict Templates)
- 预设模板：OpenClaw修复、代码审查、写文档、数据分析、故障排查
- 模板参数表单
- 宽松指令识别："加个模板"、"新建圣旨：xxx"
- 支持自定义模板

#### 4. 上朝仪式 (Morning Ceremony)
- 每日首次打开播放开场动画
- 显示今日统计：待办X件、已完成Y件、活跃部门Z个
- 3.5秒自动消失
- 数字递增动画

#### 5. 心跳检测 (Heartbeat)
- 每30秒检测Agent健康状态
- 部门卡片显示 🟢🟡🔴 状态
- 基于最近活跃时间计算
- 实时状态指示器

#### 6. 军机处·定时任务 (Cron Tasks)
- 替代天下要闻
- 定时任务列表：兵器库扫描、心跳检测、Token统计、记忆清理
- 状态：运行中/已暂停
- 操作：手动触发、暂停、恢复

#### 7. 朝堂议政 (Court Discussion)
- 多部门围绕议题展开讨论
- 选择参与部门
- LLM驱动辩论
- 保留讨论记录，导出结论

#### 8. Token排行榜 (Token Ranking)
- 每小时统计Token消耗
- 部门消耗排行榜
- 今日/本周/本月视图
- 图表展示

### 🔧 技术改进
- WebSocket实时同步所有新功能
- Apple风格毛玻璃UI
- TypeScript零错误
- 后端API全面扩展

### 📁 新增文件
- `dashboard/src/pages/Armory.tsx`
- `dashboard/src/pages/Memorials.tsx`
- `dashboard/src/pages/Templates.tsx`
- `dashboard/src/pages/CronTasks.tsx`
- `dashboard/src/pages/CourtDiscussion.tsx`
- `dashboard/src/pages/TokenRanking.tsx`
- `dashboard/src/components/Ceremony.tsx`
- `dashboard/src/components/HeartbeatIndicator.tsx`
- `config/templates/edicts.json`
