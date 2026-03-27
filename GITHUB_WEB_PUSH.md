# GitHub 网页端推送指南

由于自动推送需要 GitHub 认证，请使用以下方法：

## 方法 1: GitHub CLI 设备流认证（推荐）

```bash
cd "/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"

# 1. 启动设备流认证
gh auth login

# 2. 选择:
#    - GitHub.com
#    - HTTPS
#    - Yes, authenticate with your GitHub credentials
#    - Login with a web browser

# 3. 复制设备码，访问 https://github.com/login/device

# 4. 粘贴设备码，授权

# 5. 完成后，运行推送脚本
./AUTO_PUSH.sh
```

## 方法 2: 手动创建仓库并推送

### 步骤 1: 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写信息:
   - **Repository name**: `OpenReign-pro`
   - **Description**: `OpenReign Pro - 基于三省六部制的 AI 多 Agent 协作框架`
   - **Public**: 勾选
   - **Initialize with README**: 不要勾选
3. 点击 **Create repository**

### 步骤 2: 推送代码

```bash
cd "/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup"

# 添加远程仓库
git remote add origin https://github.com/hekuang857-byte/OpenReign-pro.git

# 推送代码
git push -u origin master
```

### 步骤 3: 输入凭证

如果提示输入用户名和密码：
- **用户名**: `hekuang857-byte`
- **密码**: 使用 GitHub Personal Access Token
  - 访问 https://github.com/settings/tokens
  - 生成新 token (勾选 repo 权限)
  - 使用 token 作为密码

## 方法 3: 使用 SSH（推荐长期使用）

### 配置 SSH

```bash
# 1. 生成 SSH key
ssh-keygen -t ed25519 -C "your@email.com"

# 2. 添加到 ssh-agent
ssh-add ~/.ssh/id_ed25519

# 3. 复制公钥
cat ~/.ssh/id_ed25519.pub

# 4. 添加到 GitHub
# 访问 https://github.com/settings/keys
# 点击 New SSH key
# 粘贴公钥

# 5. 测试连接
ssh -T git@github.com

# 6. 修改远程为 SSH
git remote set-url origin git@github.com:hekuang857-byte/OpenReign-pro.git

# 7. 推送
git push -u origin master
```

## 推送后验证

```bash
# 检查远程仓库
git remote -v

# 查看提交历史
git log --oneline --graph --all

# 打开 GitHub 查看
open https://github.com/hekuang857-byte/OpenReign-pro
```

## 当前状态

- ✅ 本地提交: 2 个
  - `b374260` chore: add GitHub publish scripts and fix paths
  - `9345291` refactor: migrate to standard architecture
- ✅ 远程仓库: 已配置 (https://github.com/hekuang857-byte/OpenReign-pro.git)
- ⏳ 推送状态: 等待认证

## 一键命令

```bash
# 在终端执行:
cd "/Users/kuang/Documents/GitHub相关/GitHub项目/openreign-pro-v1.2.1.backup" && ./AUTO_PUSH.sh
```
