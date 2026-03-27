#!/bin/bash

# OpenReign Pro 标准化架构迁移脚本
# 使用方法: bash scripts/migrate-to-standard.sh

set -e

echo "🏛️ OpenReign Pro 标准化架构迁移"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 步骤 1: 备份
echo -e "${YELLOW}[1/10]${NC} 创建备份..."
if [ ! -d "../openreign-pro-v1.2.1.backup-BEFORE-REFACTOR" ]; then
    cp -r "$PROJECT_ROOT" "../openreign-pro-v1.2.1.backup-BEFORE-REFACTOR"
    echo -e "${GREEN}✓${NC} 备份已创建"
else
    echo -e "${YELLOW}⚠${NC} 备份已存在，跳过"
fi

# 步骤 2: 创建目录结构
echo -e "${YELLOW}[2/10]${NC} 创建新目录结构..."
mkdir -p apps/dashboard/src apps/server/src/{routes,services,middleware,utils}
mkdir -p packages/core/src/{orchestrator,task-executor,formatters,governance,classifiers,state,utils,integration,clients,config,executors}
mkdir -p packages/shared-types/src
mkdir -p packages/config/src
mkdir -p tests/{unit,integration,e2e}
mkdir -p tools
mkdir -p .github/workflows
mkdir -p docs/project
echo -e "${GREEN}✓${NC} 目录结构创建完成"

# 步骤 3: 移动前端代码
echo -e "${YELLOW}[3/10]${NC} 移动前端代码..."
if [ -d "dashboard/src" ]; then
    cp -r dashboard/src/* apps/dashboard/src/ 2>/dev/null || true
    cp dashboard/package.json apps/dashboard/ 2>/dev/null || true
    cp dashboard/vite.config.* apps/dashboard/ 2>/dev/null || true
    cp dashboard/tsconfig.* apps/dashboard/ 2>/dev/null || true
    cp dashboard/index.html apps/dashboard/ 2>/dev/null || true
    cp -r dashboard/public apps/dashboard/ 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 前端代码已移动"
else
    echo -e "${YELLOW}⚠${NC} dashboard/src 不存在，跳过"
fi

# 步骤 4: 移动后端代码
echo -e "${YELLOW}[4/10]${NC} 移动后端代码..."
if [ -f "dashboard/server.js" ]; then
    cp dashboard/server.js apps/server/src/
    cp dashboard/server-api-routes.js apps/server/src/routes/api.js 2>/dev/null || true
    cp dashboard/server-api-vault.js apps/server/src/services/vault.js 2>/dev/null || true
    cp dashboard/server-memorial.js apps/server/src/services/memorial.js 2>/dev/null || true
    mkdir -p apps/server/src/backup
    cp dashboard/server-v2-backup.js apps/server/src/backup/ 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 后端代码已移动"
else
    echo -e "${YELLOW}⚠${NC} 后端文件不存在，跳过"
fi

# 步骤 5: 移动任务执行器
echo -e "${YELLOW}[5/10]${NC} 移动任务执行器..."
if [ -f "dashboard/task-executor.js" ]; then
    cp dashboard/task-executor.js packages/core/src/task-executor/index.js
    cp dashboard/task-executor-enhanced.js packages/core/src/task-executor/enhanced.js 2>/dev/null || true
    mkdir -p packages/core/src/task-executor/backup
    cp dashboard/task-executor-v2-backup.js packages/core/src/task-executor/backup/ 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 任务执行器已移动"
else
    echo -e "${YELLOW}⚠${NC} 任务执行器不存在，跳过"
fi

# 步骤 6: 移动核心逻辑
echo -e "${YELLOW}[6/10]${NC} 移动核心逻辑..."
if [ -f "apps/dashboard/src/orchestrator.js" ]; then
    cp apps/dashboard/src/orchestrator.js packages/core/src/orchestrator/index.js
    cp apps/dashboard/src/charter-enforcer.js packages/core/src/governance/charter-enforcer.js 2>/dev/null || true
    cp apps/dashboard/src/classical-formatter.js packages/core/src/formatters/classical.js 2>/dev/null || true
    cp apps/dashboard/src/memorial-formatter.js packages/core/src/formatters/memorial.js 2>/dev/null || true
    cp apps/dashboard/src/taizi-classifier.js packages/core/src/classifiers/taizi.js 2>/dev/null || true
    cp apps/dashboard/src/state-machine.js packages/core/src/state/machine.js 2>/dev/null || true
    cp apps/dashboard/src/permission-matrix.js packages/core/src/governance/permissions.js 2>/dev/null || true
    cp apps/dashboard/src/time-estimator.js packages/core/src/utils/time-estimator.js 2>/dev/null || true
    cp apps/dashboard/src/history-search.js packages/core/src/utils/history-search.js 2>/dev/null || true
    cp apps/dashboard/src/kanban-client.js packages/core/src/clients/kanban.js 2>/dev/null || true
    cp apps/dashboard/src/extension-executor.js packages/core/src/executors/extension.js 2>/dev/null || true
    cp apps/dashboard/src/department-config.js packages/core/src/config/department.js 2>/dev/null || true
    cp apps/dashboard/src/openreign-bridge.js packages/core/src/integration/openreign-bridge.js 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 核心逻辑已移动"
else
    echo -e "${YELLOW}⚠${NC} 核心逻辑文件不存在，跳过"
fi

# 步骤 7: 移动 OpenClaw 集成
echo -e "${YELLOW}[7/10]${NC} 移动 OpenClaw 集成..."
if [ -f "openclaw-integration.js" ]; then
    cp openclaw-integration.js packages/core/src/integration/openclaw.js
    echo -e "${GREEN}✓${NC} OpenClaw 集成已移动"
else
    echo -e "${YELLOW}⚠${NC} OpenClaw 集成文件不存在，跳过"
fi

# 步骤 8: 归档根目录文档
echo -e "${YELLOW}[8/10]${NC} 归档项目文档..."
for file in CHANGELOG.md COMPREHENSIVE_INTEGRATION_REPORT.md EXTENSION_TEST_REPORT.md \
            FULL_FRONTEND_AUDIT.md GITHUB_RELEASE_CHECKLIST.md HANDOVER.md INSTALL.md \
            PROJECT_HEALTH_REPORT.md PROJECT_SUMMARY.md PUBLISH.md QUICKSTART.md \
            README-DEPLOY.md TASK.md UI_OPTIMIZATION_PLAN.md UI_REVAMP_COMPLETE_REPORT.md \
            hardcode-fix-report.md v1.2.2-completion-report.md v1.2.2-implementation-plan.md; do
    if [ -f "$file" ]; then
        cp "$file" docs/project/ 2>/dev/null || true
    fi
done
echo -e "${GREEN}✓${NC} 文档已归档"

# 步骤 9: 移动启动脚本
echo -e "${YELLOW}[9/10]${NC} 移动启动脚本..."
cp start.sh scripts/ 2>/dev/null || true
cp start-openreign.sh scripts/ 2>/dev/null || true
echo -e "${GREEN}✓${NC} 启动脚本已移动"

# 步骤 10: 清理
echo -e "${YELLOW}[10/10]${NC} 清理临时文件..."
# 保留 dashboard/dist* 构建产物
if [ -d "dashboard" ]; then
    mkdir -p dist-archive
    cp -r dashboard/dist* dist-archive/ 2>/dev/null || true
fi
echo -e "${GREEN}✓${NC} 清理完成"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ 迁移完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "下一步操作:"
echo "1. 检查 apps/dashboard/src/ 中的文件是否正确"
echo "2. 检查 apps/server/src/ 中的文件是否正确"
echo "3. 检查 packages/core/src/ 中的文件是否正确"
echo "4. 运行 'npm install' 安装依赖"
echo "5. 运行 'npm run dev' 启动开发环境"
echo ""
echo "注意: 原 dashboard/ 目录仍然保留，确认无误后可手动删除"
