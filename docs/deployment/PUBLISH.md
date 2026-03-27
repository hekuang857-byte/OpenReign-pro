# 发布到 GitHub

## 发布前检查

```bash
cd "/Users/kuang/Documents/GitHub项目/openreign-pro-v1.2.1.backup"

# 1. 检查文件
git status

# 2. 测试启动
./start.sh
# 确认能正常打开 http://localhost:18790

# 3. 停止测试
lsof -ti:18790 | xargs kill -9
```

## 发布步骤

### 第一步：初始化 Git

```bash
cd "/Users/kuang/Documents/GitHub项目/openreign-pro-v1.2.1.backup"

# 初始化
git init

# 添加所有文件
git add .

# 提交
git commit -m "🎉 OpenReign Pro v1.2.2

- 八大国风功能（兵器库、奏折阁、圣旨、军机处、议政、排行、心跳、上朝）
- 三省六部任务执行引擎
- 六部并行执行
- WebSocket 实时同步
- 一键启动脚本
- 默认配置支持"
```

### 第二步：创建 GitHub 仓库

1. 打开 https://github.com/new
2. 仓库名：`openreign-pro`
3. 描述：`OpenClaw Gateway 之上的三省六部治理架构`
4. 选择 Public
5. 不要勾选 README（已经有了）
6. 点击 Create repository

### 第三步：推送代码

```bash
# 添加远程仓库（替换 yourname 为你的 GitHub 用户名）
git remote add origin https://github.com/yourname/openreign-pro.git

# 推送
git push -u origin main
```

### 第四步：验证

1. 打开 `https://github.com/yourname/openreign-pro`
2. 确认文件都在
3. 确认 README 显示正常

## 发布后分享

```markdown
🎉 发布了 OpenReign Pro v1.2.2

基于 OpenClaw 的三省六部 AI 治理架构

✨ 特性：
- 八大国风功能
- 任务执行引擎
- 实时看板

🚀 一键体验：
```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro
./start.sh
```

🔗 地址：https://github.com/yourname/openreign-pro
```

## 后续维护

```bash
# 修改后提交
git add .
git commit -m "fix: xxx"
git push

# 打标签
git tag v1.2.3
git push origin v1.2.3
```

---

**现在执行第一步？**（初始化 Git）
