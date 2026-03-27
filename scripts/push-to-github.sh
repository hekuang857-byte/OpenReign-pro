#!/bin/bash
# OpenReign Pro - 推送到 GitHub 脚本

set -e

echo "🚀 OpenReign Pro GitHub 推送脚本"
echo "================================"

PROJECT_DIR="/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"
cd "$PROJECT_DIR"

# 检查 GitHub CLI 是否已认证
echo ""
echo "📋 检查 GitHub 认证..."
if ! gh auth status &>/dev/null; then
    echo "⚠️  未登录 GitHub，开始认证..."
    gh auth login
fi

echo "✅ GitHub 已认证"

# 检查远程仓库是否存在
echo ""
echo "📋 检查远程仓库..."
if git remote get-url origin &>/dev/null; then
    echo "⚠️  远程仓库已存在，跳过创建"
else
    echo "📝 创建 GitHub 仓库..."
    gh repo create OpenReign-pro \
        --public \
        --description "OpenReign Pro - 基于三省六部制的 AI 多 Agent 协作框架" \
        --source=. \
        --remote=origin \
        --push
    echo "✅ 仓库创建并推送完成"
    exit 0
fi

# 推送代码
echo ""
echo "📤 推送代码到 GitHub..."
git push -u origin master

echo ""
echo "✅ 推送完成！"
echo ""
echo "🔗 仓库地址: https://github.com/$(gh api user -q .login)/OpenReign-pro"
echo ""
echo "🎉 OpenReign Pro 已成功开源到 GitHub！"
