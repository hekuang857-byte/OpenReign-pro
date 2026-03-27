#!/bin/bash
# OpenReign Pro - 发布版本脚本

set -e

PROJECT_DIR="/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"
cd "$PROJECT_DIR"

echo "🚀 OpenReign Pro 发布脚本"
echo "=========================="
echo ""

# 获取当前版本
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | head -1 | cut -d'"' -f4)
echo "当前版本: $CURRENT_VERSION"
echo ""

# 询问新版本
read -p "输入新版本号 (例如: 1.2.3): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo "❌ 版本号不能为空"
    exit 1
fi

echo ""
echo "📋 发布版本: v$NEW_VERSION"
echo ""

# 1. 更新 package.json
echo "1. 更新 package.json..."
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
rm package.json.bak
echo "   ✅ 已更新"

# 2. 更新版本号到相关文件
echo "2. 更新版本号到其他文件..."
find src -name "*.js" -exec grep -l "$CURRENT_VERSION" {} \; | while read file; do
    sed -i.bak "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
    rm "$file.bak" 2>/dev/null || true
done
echo "   ✅ 已更新"

# 3. 提交变更
echo "3. 提交版本更新..."
git add -A
git commit -m "chore(release): bump version to v$NEW_VERSION"
echo "   ✅ 已提交"

# 4. 打标签
echo "4. 创建标签 v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
echo "   ✅ 已创建标签"

# 5. 推送到 GitHub
echo "5. 推送到 GitHub..."
git push origin main
git push origin "v$NEW_VERSION"
echo "   ✅ 已推送"

# 6. 创建 GitHub Release
echo "6. 创建 GitHub Release..."
if command -v gh &> /dev/null; then
    gh release create "v$NEW_VERSION" \
        --title "v$NEW_VERSION" \
        --notes "Release v$NEW_VERSION" \
        --generate-notes
    echo "   ✅ 已创建 GitHub Release"
else
    echo "   ⚠️  gh CLI 未安装，跳过创建 GitHub Release"
    echo "      请手动创建: https://github.com/hekuang857-byte/OpenReign-pro/releases/new"
fi

echo ""
echo "✅ 发布完成！"
echo ""
echo "🔗 相关信息:"
echo "  仓库: https://github.com/hekuang857-byte/OpenReign-pro"
echo "  标签: https://github.com/hekuang857-byte/OpenReign-pro/releases/tag/v$NEW_VERSION"
echo ""
echo "🎉 OpenReign Pro v$NEW_VERSION 发布成功！"
