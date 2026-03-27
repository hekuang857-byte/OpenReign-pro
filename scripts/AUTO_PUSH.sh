#!/bin/bash
# OpenReign Pro - 自动推送到 GitHub
# 使用方法: 在终端运行 ./AUTO_PUSH.sh

set -e

PROJECT_DIR="/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"
cd "$PROJECT_DIR"

echo "🚀 OpenReign Pro 自动推送脚本"
echo "=============================="
echo ""

# 检查 GitHub CLI 认证
echo "📋 检查 GitHub 认证..."
if ! gh auth status &>/dev/null; then
    echo "❌ 未登录 GitHub"
    echo ""
    echo "请运行以下命令登录:"
    echo "  gh auth login"
    echo ""
    echo "或者使用浏览器登录:"
    echo "  1. 访问 https://github.com/login/device"
    echo "  2. 输入设备码"
    echo ""
    exit 1
fi

echo "✅ GitHub 已认证"
echo ""

# 检查远程仓库
echo "📋 检查远程仓库..."
if git remote get-url origin &>/dev/null; then
    echo "✅ 远程仓库已配置:"
    git remote -v
else
    echo "📝 创建 GitHub 仓库..."
    gh repo create OpenReign-pro \
        --public \
        --description "OpenReign Pro - 基于三省六部制的 AI 多 Agent 协作框架" \
        --source=. \
        --remote=origin \
        --push
    echo "✅ 仓库创建并推送完成!"
    exit 0
fi

echo ""

# 推送代码
echo "📤 推送代码到 GitHub..."
echo "  分支: master"
echo "  提交数: $(git rev-list --count HEAD)"
echo ""

if git push -u origin master; then
    echo ""
    echo "✅ 推送成功!"
    echo ""
    echo "🔗 仓库地址:"
    echo "  https://github.com/$(gh api user -q .login)/OpenReign-pro"
    echo ""
    echo "🎉 OpenReign Pro 已成功开源到 GitHub!"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因:"
    echo "  1. GitHub 认证过期"
    echo "  2. 网络问题"
    echo "  3. 仓库已存在但无权限"
    echo ""
    echo "解决方法:"
    echo "  gh auth login"
    exit 1
fi
