#!/bin/bash

# OpenReign Pro 一键启动脚本
# 用法: ./start.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}OpenReign Pro 启动脚本${NC}"
echo "======================"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js${NC}"
    echo "请先安装 Node.js 18+"
    echo "https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: Node.js 版本过低 ($NODE_VERSION)${NC}"
    echo "需要 Node.js 18+"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本: $(node --version)${NC}"

# 进入服务器目录
cd "$SCRIPT_DIR/apps/server"

# 检查是否需要安装依赖
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo -e "${YELLOW}安装依赖中...${NC}"
    npm install --production
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ 依赖已安装${NC}"
fi

# 检查端口是否被占用
PORT=18790
if lsof -ti:$PORT &> /dev/null; then
    echo -e "${YELLOW}端口 $PORT 已被占用，尝试停止旧进程...${NC}"
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# 启动服务
echo -e "${GREEN}启动 OpenReign Pro...${NC}"
echo ""

# 使用 nohup 后台运行
nohup node src/index.js > "$SCRIPT_DIR/openreign.log" 2>&1 &

# 等待服务启动
sleep 2

# 检查是否启动成功
if lsof -ti:$PORT &> /dev/null; then
    echo -e "${GREEN}✓ OpenReign Pro 启动成功！${NC}"
    echo ""
    echo -e "访问地址: ${YELLOW}http://localhost:$PORT${NC}"
    echo ""
    echo "管理命令:"
    echo "  查看日志: tail -f openreign.log"
    echo "  停止服务: lsof -ti:$PORT | xargs kill -9"
    echo ""
    echo -e "${GREEN}按 Ctrl+C 退出此脚本（服务将继续在后台运行）${NC}"
    
    # 尝试自动打开浏览器
    if command -v open &> /dev/null; then
        sleep 1 && open "http://localhost:$PORT" &
    elif command -v xdg-open &> /dev/null; then
        sleep 1 && xdg-open "http://localhost:$PORT" &
    fi
else
    echo -e "${RED}✗ 启动失败${NC}"
    echo "查看日志: cat logs/openreign.log"
    exit 1
fi

# 保持脚本运行，显示日志
tail -f "$SCRIPT_DIR/openreign.log" &
TAIL_PID=$!

# 捕获 Ctrl+C
trap "kill $TAIL_PID 2>/dev/null; exit 0" INT

wait
