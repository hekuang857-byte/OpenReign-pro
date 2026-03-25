# OpenReign Pro 部署指南

> 多种部署方式，适配不同环境

## 快速选择

| 你的环境 | 推荐方案 | 难度 | 特点 |
|---------|---------|------|------|
| 开发测试 | 手动启动 | ⭐ | 简单，即开即用 |
| 个人服务器 | PM2 | ⭐⭐ | 自动重启，日志管理 |
| 团队协作 | Docker | ⭐⭐⭐ | 环境一致，易于分享 |
| 生产服务器 | systemd | ⭐⭐⭐ | 系统集成，稳定可靠 |

---

## 方案1: 手动启动（开发推荐）

**适用**: 本地开发、快速测试

```bash
# 1. 克隆项目
git clone https://github.com/yourname/openreign-pro.git
cd openreign-pro

# 2. 安装依赖
cd dashboard && npm install

# 3. 配置（可选，使用默认配置）
cp config/openreign.example.json config/openreign.json

# 4. 启动
node server.js

# 5. 访问
open http://localhost:18790
```

**后台运行**:
```bash
nohup node server.js > openreign.log 2>&1 &
```

---

## 方案2: PM2 部署（个人服务器推荐）

**适用**: VPS、云服务器、长期运行

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 进入项目目录
cd openreign-pro/dashboard

# 3. PM2 启动
pm2 start server.js --name openreign \
  --log /var/log/openreign.log \
  --restart-delay 5000

# 4. 保存配置（开机自启）
pm2 save
pm2 startup

# 5. 管理命令
pm2 status          # 查看状态
pm2 logs openreign  # 查看日志
pm2 restart openreign # 重启
pm2 stop openreign  # 停止
```

**配置文件** `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'openreign',
    script: './server.js',
    cwd: './dashboard',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production' },
    log_file: '/var/log/openreign.log',
    merge_logs: true
  }]
};
```

---

## 方案3: Docker 部署（团队协作推荐）

**适用**: 团队开发、CI/CD、环境隔离

```bash
# 1. 构建镜像
docker build -t openreign-pro .

# 2. 运行
docker run -d \
  --name openreign \
  -p 18790:18790 \
  -v $(pwd)/config:/app/config \
  --restart always \
  openreign-pro

# 3. 查看日志
docker logs -f openreign
```

**Docker Compose**（推荐）:

```yaml
# docker-compose.yml
version: '3.8'

services:
  openreign:
    build: .
    container_name: openreign
    ports:
      - "18790:18790"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    restart: always
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:18790/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# 一键启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 方案4: Systemd 部署（生产服务器推荐）

**适用**: Linux生产环境、系统级服务

```bash
# 1. 创建服务文件
sudo tee /etc/systemd/system/openreign.service << 'EOF'
[Unit]
Description=OpenReign Pro Dashboard
Documentation=https://github.com/yourname/openreign-pro
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/openreign-pro/dashboard
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=18790

[Install]
WantedBy=multi-user.target
EOF

# 2. 重载配置
sudo systemctl daemon-reload

# 3. 启用开机自启
sudo systemctl enable openreign

# 4. 启动服务
sudo systemctl start openreign

# 5. 查看状态
sudo systemctl status openreign

# 管理命令
sudo systemctl restart openreign  # 重启
sudo systemctl stop openreign     # 停止
sudo journalctl -u openreign -f   # 查看日志
```

---

## 方案5: 集成 OpenClaw（一体化部署）

**适用**: 已使用 OpenClaw 的用户

```json
// ~/.stepclaw/openclaw.json
{
  "services": {
    "openreign": {
      "enabled": true,
      "type": "subprocess",
      "command": "node /path/to/openreign-pro/dashboard/server.js",
      "autostart": true,
      "port": 18790,
      "healthcheck": "/api/health"
    }
  }
}
```

启动 OpenClaw 时自动启动 OpenReign。

---

## 环境变量配置

```bash
# .env 文件
NODE_ENV=production
PORT=18790
OPENCLAW_ENDPOINT=http://localhost:18789
CONFIG_PATH=./config/openreign.json
LOG_LEVEL=info
```

---

## 反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name openreign.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:18790;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 一键安装脚本

```bash
#!/bin/bash
# install.sh - 自动检测环境并安装

echo "OpenReign Pro 安装脚本"
echo "======================="

# 检测环境
if command -v docker &> /dev/null; then
    echo "检测到 Docker，使用 Docker 部署..."
    docker-compose up -d
elif command -v pm2 &> /dev/null; then
    echo "检测到 PM2，使用 PM2 部署..."
    cd dashboard && pm2 start server.js --name openreign
    pm2 save
elif command -v systemctl &> /dev/null; then
    echo "检测到 systemd，使用 systemd 部署..."
    sudo cp scripts/openreign.service /etc/systemd/system/
    sudo systemctl enable openreign
    sudo systemctl start openreign
else
    echo "使用手动启动..."
    cd dashboard
    nohup node server.js > ../openreign.log 2>&1 &
fi

echo ""
echo "部署完成！访问: http://localhost:18790"
```

---

## 总结

| 方案 | 命令 | 适用场景 |
|------|------|---------|
| 手动 | `node server.js` | 开发测试 |
| PM2 | `pm2 start server.js` | 个人服务器 |
| Docker | `docker-compose up -d` | 团队协作 |
| Systemd | `systemctl start openreign` | 生产环境 |

**推荐**: 开发用手动，生产用 PM2/Docker，系统集成用 systemd。
