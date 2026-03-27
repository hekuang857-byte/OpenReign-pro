#!/bin/bash
# OpenReign Pro - 使用 Token 推送到 GitHub

set -e

PROJECT_DIR="/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"
cd "$PROJECT_DIR"

echo "🚀 OpenReign Pro GitHub 推送脚本 (Token 版)"
echo "============================================"
echo ""

# 检查是否有 GitHub Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 未设置 GITHUB_TOKEN 环境变量"
    echo ""
    echo "请设置 GitHub Personal Access Token:"
    echo "  export GITHUB_TOKEN='your_token_here'"
    echo ""
    echo "获取 Token 步骤:"
    echo "  1. 访问 https://github.com/settings/tokens"
    echo "  2. 点击 'Generate new token (classic)'"
    echo "  3. 勾选 'repo' 权限"
    echo "  4. 生成并复制 token"
    echo "  5. 运行: export GITHUB_TOKEN='ghp_xxxx'"
    echo ""
    exit 1
fi

echo "✅ GitHub Token 已设置"
echo ""

# 检查远程仓库
echo "📋 检查远程仓库..."
if ! git remote get-url origin &>/dev/null; then
    echo "📝 添加远程仓库..."
    git remote add origin "https://${GITHUB_TOKEN}@github.com/hekuang857-byte/OpenReign-pro.git"
fi

echo "✅ 远程仓库已配置"
echo ""

# 推送代码
echo "📤 推送代码到 GitHub..."
echo "  分支: master"
echo "  提交数: $(git rev-list --count HEAD)"
echo ""

if git push -u origin master; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "🔗 仓库地址:"
    echo "  https://github.com/hekuang857-byte/OpenReign-pro"
    echo ""
    echo "🎉 OpenReign Pro 已成功开源到 GitHub！"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因:"
    echo "  1. Token 无效或过期"
    echo "  2. Token 没有 repo 权限"
    echo "  3. 仓库已存在但无权限"
    echo ""
    exit 1
fi
