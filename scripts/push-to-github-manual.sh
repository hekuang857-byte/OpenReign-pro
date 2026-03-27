#!/bin/bash
# OpenReign Pro - 手动推送到 GitHub 脚本

set -e

echo "🚀 OpenReign Pro GitHub 手动推送脚本"
echo "================================"

PROJECT_DIR="/Users/kuang/Documents/GitHub项目/openreign-pro-v1.2.1.backup"
cd "$PROJECT_DIR"

# GitHub 用户名
GITHUB_USER="hekuang857-byte"
REPO_NAME="OpenReign-pro"

echo ""
echo "📋 配置信息:"
echo "  GitHub 用户: $GITHUB_USER"
echo "  仓库名称: $REPO_NAME"
echo ""

# 检查远程仓库
if git remote get-url origin &>/dev/null; then
    echo "⚠️  远程仓库已存在:"
    git remote -v
    echo ""
    read -p "是否重新设置远程仓库? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo "✅ 已移除旧远程仓库"
    else
        echo "跳过设置远程仓库"
    fi
fi

# 添加远程仓库
if ! git remote get-url origin &>/dev/null; then
    echo ""
    echo "🔗 添加远程仓库..."
    
    # 尝试 SSH
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        echo "✅ SSH 认证通过，使用 SSH 方式"
        git remote add origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
    else
        echo "⚠️  SSH 未配置，使用 HTTPS 方式"
        git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    fi
    
    echo "✅ 远程仓库已添加"
fi

# 显示远程仓库信息
echo ""
echo "📋 远程仓库信息:"
git remote -v

# 推送代码
echo ""
echo "📤 推送代码..."
echo "  分支: master"
echo "  提交数: $(git rev-list --count HEAD)"
echo ""

git push -u origin master

echo ""
echo "✅ 推送完成！"
echo ""
echo "🔗 仓库地址:"
echo "  https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "🎉 OpenReign Pro 已成功开源到 GitHub！"
echo ""
echo "📋 后续操作:"
echo "  1. 访问仓库确认文件完整"
echo "  2. 在 GitHub 上添加 Topics (openclaw, ai-agent, governance)"
echo "  3. 创建 Release v1.2.2"
echo "  4. 分享项目链接"
