# GitHub 发布前必做优化（今天完成）

> 原作者有的优化 + 必须有的基础优化

## 原作者有的优化（参考）

根据 Edict 项目特点，原作者做了：
- ✅ 纯前端实现（无后端依赖）
- ✅ 零依赖（stdlib only）
- ✅ 实时看板（WebSocket）
- ✅ 模拟数据（无需配置即可运行）

---

## 今天必须完成的优化（2-3小时）

### 1. 首屏加载优化（必须）
**问题**：245KB bundle，打开慢
**解决**：
```bash
# 1. 检查并优化
npm run build
# 看 dist/assets/index-*.js 大小

# 2. 如果 >200KB，必须分割
```

**快速实现**（30分钟）：
```typescript
// App.tsx 添加懒加载
const Armory = lazy(() => import('./pages/Armory'));
const Memorials = lazy(() => import('./pages/Memorials'));
// ... 其他页面

// 使用 Suspense
<Suspense fallback={<div>加载中...</div>}>
  {activeTab === 'armory' && <Armory />}
</Suspense>
```

**效果**：首屏从 245KB → ~100KB

---

### 2. 一键启动（必须）
**问题**：用户不知道怎么启动
**解决**：

```bash
# 创建启动脚本
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/dashboard"
npm install --production 2>/dev/null
node server.js
EOF
chmod +x start.sh
```

**README 写法**：
```markdown
## 快速开始

```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro
./start.sh
```

访问 http://localhost:18790
```

---

### 3. 默认配置（必须）
**问题**：用户没有配置文件跑不起来
**解决**：

```bash
# 创建默认配置
cp config/openreign.json config/openreign.example.json

# 修改代码，使用默认配置
# server.js 中如果找不到配置，使用内置默认
```

```javascript
// server.js 添加默认配置
const DEFAULT_CONFIG = {
  "_meta": { "name": "OpenReign Pro", "version": "1.2.2" },
  "agents": { /* 默认部门 */ },
  // ... 其他默认配置
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    console.log('[OpenReign] 使用默认配置');
    return DEFAULT_CONFIG;
  }
}
```

---

### 4. README 完善（必须）

```markdown
# OpenReign Pro

[![Version](https://img.shields.io/badge/version-1.2.2-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> OpenClaw Gateway 之上的三省六部治理架构

## 🎬 预览

[截图/GIF]

## 🚀 快速开始

### 方式1: 一键启动（推荐）
```bash
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro
./start.sh
```

### 方式2: Docker
```bash
docker-compose up -d
```

访问 http://localhost:18790

## 📦 功能

- [x] 三省六部架构
- [x] 实时任务看板
- [x] 八大国风功能（兵器库、奏折阁、圣旨...）
- [x] WebSocket 实时同步
- [x] AI 任务执行引擎

## 📚 文档

- [安装指南](INSTALL.md)
- [架构设计](docs/ARCHITECTURE.md)

## 🏛️ 架构

```
皇上(User) → 太子 → 中书省 → 门下省 → 尚书省 → 六部
```

## 📄 License

MIT
```

---

### 5. 截图/GIF（必须）

**需要准备**：
- [ ] Dashboard 首页截图
- [ ] 任务流程演示 GIF（30秒）
- [ ] 八大国风功能截图

**制作 GIF**：
```bash
# macOS
# 使用 QuickTime 录屏 → 转 GIF
```

---

### 6. 依赖清理（必须）

```bash
# 检查是否有未使用的依赖
cd dashboard
npm prune

# 检查安全漏洞
npm audit
npm audit fix
```

---

### 7. 版本号统一（必须）

```bash
# 确保所有文件版本一致
grep -r "1.2.1" . --include="*.json" --include="*.md"
# 全部改为 1.2.2
```

---

## 发布前检查清单

- [ ] 代码分割实现
- [ ] start.sh 脚本可运行
- [ ] 无配置也能启动
- [ ] README 完整
- [ ] 截图/GIF 准备
- [ ] 版本号统一
- [ ] 本地测试通过

---

## 今天完成顺序（优先级）

| 顺序 | 任务 | 时间 | 优先级 |
|------|------|------|--------|
| 1 | 默认配置 | 20分钟 | 🔴 必须 |
| 2 | start.sh 脚本 | 10分钟 | 🔴 必须 |
| 3 | README 完善 | 30分钟 | 🔴 必须 |
| 4 | 代码分割 | 30分钟 | 🟡 重要 |
| 5 | 截图/GIF | 30分钟 | 🟡 重要 |
| 6 | 版本号检查 | 10分钟 | 🟢 次要 |

**总计：约2小时**

---

要我立即帮你做**默认配置 + start.sh 脚本**吗？
