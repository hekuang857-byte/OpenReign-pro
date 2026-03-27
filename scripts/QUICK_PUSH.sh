#!/bin/bash
# 快速推送到 GitHub - 需要设置 GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo "请先设置 GitHub Token:"
    echo "  export GITHUB_TOKEN='ghp_your_token_here'"
    echo ""
    echo "获取 Token: https://github.com/settings/tokens"
    exit 1
fi

cd "/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"

# 使用 token 推送
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/hekuang857-byte/OpenReign-pro.git"
git push -u origin master

echo ""
echo "✅ 推送完成: https://github.com/hekuang857-byte/OpenReign-pro"
