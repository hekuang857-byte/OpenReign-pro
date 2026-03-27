# OpenReign Pro 安装指南

> **推荐方案：Docker（原作者同款）+ 手动（开发）**

## 🚀 30秒快速体验（推荐）

```bash
# Docker 一键启动（无需安装依赖）
docker run -p 18790:18790 yourname/openreign-pro

# 访问
open http://localhost:18790
```

---

## 📦 三种部署方式（任选其一）

### 方式一：Docker（推荐 / 原作者同款）

**适用**：快速体验、生产部署、团队协作

```bash
# 1. 克隆项目
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro

# 2. Docker Compose 启动（推荐）
docker-compose up -d

# 3. 访问
open http://localhost:18790
```

**管理命令**：
```bash
docker-compose ps        # 查看状态
docker-compose logs -f   # 查看日志
docker-compose down      # 停止
docker-compose up -d     # 重启
```

---

### 方式二：手动安装（开发推荐）

**适用**：本地开发、自定义修改

```bash
# 1. 克隆项目
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro

# 2. 安装依赖
cd dashboard && npm install

# 3. 启动
node server.js

# 4. 访问
open http://localhost:18790
```

**后台运行**：
```bash
nohup node server.js > ../openreign.log 2>&1 &
```

---

### 方式三：PM2（生产推荐）

**适用**：长期运行、自动重启、日志管理

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动
cd openreign-pro/dashboard
pm2 start server.js --name openreign

# 3. 保存配置（开机自启）
pm2 save
pm2 startup
```

**管理命令**：
```bash
pm2 status          # 查看状态
pm2 logs openreign  # 查看日志
pm2 restart openreign # 重启
pm2 stop openreign  # 停止
```

---

## 🔧 环境要求

| 环境 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥18 | 运行后端服务 |
| OpenClaw | 最新 | 核心网关（可选）|
| Docker | ≥20 | Docker部署需要 |

---

## ⚙️ 配置说明

```bash
# 复制默认配置
cp config/openreign.example.json config/openreign.json

# 编辑配置
vim config/openreign.json
```

---

## 🎯 方案选择建议

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 第一次体验 | **Docker** | 一键启动，无需配置 |
| 本地开发 | **手动** | 实时修改，即时生效 |
| 个人服务器 | **PM2** | 自动重启，日志管理 |
| 团队协作 | **Docker** | 环境一致，易于分享 |
| 生产环境 | **PM2** / **Docker** | 稳定可靠 |

---

## ❓ 常见问题

**Q: 端口被占用？**
```bash
# 修改端口
export PORT=18800
node server.js
```

**Q: 如何更新？**
```bash
# Docker
docker-compose pull && docker-compose up -d

# 手动
git pull && npm install && pm2 restart openreign
```

**Q: 如何卸载？**
```bash
# Docker
docker-compose down -v

# PM2
pm2 delete openreign

# 手动
pkill -f "node server.js"
```

---

## 📚 更多文档

- [架构设计](docs/ARCHITECTURE.md)
- [部署指南](README-DEPLOY.md)
- [API文档](docs/API.md)

---

**推荐**：新手用 **Docker**，开发者用 **手动**，生产用 **PM2**。
