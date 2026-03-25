# OpenReign Pro 部署方式

## 当前状态（开发模式）

当前手动启动是为了开发和测试：
```bash
cd dashboard && node server.js
```

## 生产环境部署方案

### 方案1: 系统服务（推荐）

创建系统服务文件，开机自动启动：

```bash
# 创建服务文件
sudo tee /etc/systemd/system/openreign.service << 'EOF'
[Unit]
Description=OpenReign Pro Dashboard
After=network.target

[Service]
Type=simple
User=kuang
WorkingDirectory=/Users/kuang/Downloads/openreign-pro-v1.2.1/dashboard
ExecStart=/usr/local/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动
sudo systemctl enable openreign
sudo systemctl start openreign

# 查看状态
sudo systemctl status openreign
```

### 方案2: PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 创建配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'openreign',
    script: './server.js',
    cwd: '/Users/kuang/Downloads/openreign-pro-v1.2.1/dashboard',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    log_file: '/tmp/openreign.log',
    out_file: '/tmp/openreign-out.log',
    error_file: '/tmp/openreign-error.log'
  }]
};
EOF

# 启动
pm2 start ecosystem.config.js

# 保存配置，开机自启
pm2 save
pm2 startup
```

### 方案3: Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ ./
COPY config/ ../config/
EXPOSE 18790
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  openreign:
    build: .
    ports:
      - "18790:18790"
    volumes:
      - ./config:/app/config
    restart: always
```

### 方案4: 集成到 OpenClaw

修改 OpenClaw 配置，将 OpenReign 作为子服务启动：

```json
// ~/.stepclaw/openclaw.json
{
  "services": {
    "openreign": {
      "enabled": true,
      "command": "node /Users/kuang/Downloads/openreign-pro-v1.2.1/dashboard/server.js",
      "autostart": true,
      "port": 18790
    }
  }
}
```

## 推荐方案

**开发环境**：手动启动 `node server.js`

**生产环境**：
1. macOS/Linux → **PM2**（简单，带日志管理）
2. 需要容器化 → **Docker**
3. 系统集成 → **systemd**

## 一键启动脚本

```bash
#!/bin/bash
# start-openreign.sh

cd "$(dirname "$0")/dashboard"

# 检查是否已在运行
if lsof -ti:18790 > /dev/null; then
  echo "OpenReign 已在运行"
  exit 0
fi

# 启动
nohup node server.js > /tmp/openreign.log 2>&1 &
echo "OpenReign 已启动: http://localhost:18790"
```

## 检查状态

```bash
# 查看是否运行
curl http://localhost:18790/api/departments

# 查看日志
tail -f /tmp/openreign.log

# 查看进程
ps aux | grep "node server.js"
```

要我帮你配置 **PM2 自动启动** 吗？
