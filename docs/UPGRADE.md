# OpenReign Pro 升级指南

**当前版本**: 1.2.0 (Dragon Throne)

---

## 升级前准备

1. **备份配置**
   ```bash
   cp ~/.openreign/config/openreign.json ~/.openreign/config/openreign.json.bak
   ```

2. **停止服务**
   ```bash
   launchctl unload ~/Library/LaunchAgents/ai.openreign.pro.plist
   ```

3. **检查 OpenClaw**
   ```bash
   curl http://localhost:18789/health
   ```

## 升级步骤

### 小版本升级 (1.0.x → 1.0.y)

小版本升级通常只包含 bug 修复，配置文件兼容。

```bash
# 1. 下载新版本
cd ~/Downloads
# 解压新版本到 openreign-pro-v1.2.x

# 2. 运行升级脚本
cd openreign-pro-v1.2.x
./scripts/upgrade.sh

# 3. 重启服务
launchctl load ~/Library/LaunchAgents/ai.openreign.pro.plist
```

### 中版本升级 (1.0.x → 1.1.0)

中版本升级包含新功能，可能需要更新配置。

```bash
# 1. 备份并停止服务（同上）

# 2. 安装新版本
cd openreign-pro-v1.1.0
./scripts/install.sh

# 3. 迁移配置
# 升级脚本会自动合并配置

# 4. 检查配置差异
diff ~/.openreign/config/openreign.json.bak ~/.openreign/config/openreign.json

# 5. 重启服务
launchctl load ~/Library/LaunchAgents/ai.openreign.pro.plist
```

### 大版本升级 (1.x → 2.0.0)

大版本升级包含架构变更，需要仔细阅读升级文档。

```bash
# 1. 完整备份
tar czf ~/openreign-backup-$(date +%Y%m%d).tar.gz ~/.openreign/

# 2. 阅读升级文档
cat docs/MIGRATION-v2.md

# 3. 按文档执行升级步骤
```

## 回滚

如果升级后出现问题：

```bash
# 1. 停止服务
launchctl unload ~/Library/LaunchAgents/ai.openreign.pro.plist

# 2. 恢复配置
cp ~/.openreign/config/openreign.json.bak ~/.openreign/config/openreign.json

# 3. 重启服务
launchctl load ~/Library/LaunchAgents/ai.openreign.pro.plist
```

## 版本兼容性

| OpenReign Pro | OpenClaw Gateway | 状态 |
|---------------|------------------|------|
| 1.0.0         | ≥ 1.0            | ✅ 兼容 |

## 常见问题

### Q: 升级后配置丢失？
A: 安装脚本会自动备份旧配置到 `~/.openreign/config/openreign.json.bak`

### Q: 可以降级吗？
A: 可以，使用备份的配置文件回滚

### Q: 升级需要重启 OpenClaw 吗？
A: 不需要，OpenReign Pro 是独立层
