#!/usr/bin/env node

/**
 * OpenReign Pro - OpenClaw Gateway 自动集成脚本
 * 实现开箱即用，自动对接用户本地安装的 OpenClaw
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// 检测 OpenClaw 安装位置
function findOpenClawHome() {
  const possiblePaths = [
    path.join(os.homedir(), '.openclaw'),
    path.join(os.homedir(), '.stepclaw'),
    process.env.OPENCLAW_HOME,
    process.env.STEPCLAW_HOME
  ];
  
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      const configPath = path.join(p, 'openclaw.json');
      if (fs.existsSync(configPath)) {
        return p;
      }
    }
  }
  
  return null;
}

// 读取 OpenClaw 配置
function readOpenClawConfig(openclawHome) {
  const configPath = path.join(openclawHome, 'openclaw.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    log(`❌ 读取 OpenClaw 配置失败: ${err.message}`, 'red');
    return null;
  }
}

// 备份配置
function backupConfig(openclawHome) {
  const configPath = path.join(openclawHome, 'openclaw.json');
  const backupPath = path.join(
    openclawHome, 
    `openclaw.json.backup.openreign-${Date.now()}`
  );
  
  try {
    fs.copyFileSync(configPath, backupPath);
    log(`✅ 配置已备份到: ${backupPath}`, 'green');
    return true;
  } catch (err) {
    log(`⚠️ 备份失败: ${err.message}`, 'yellow');
    return false;
  }
}

// 创建 OpenReign Agent 工作区
function createOpenReignWorkspace(openclawHome) {
  const workspacePath = path.join(openclawHome, 'workspace-openreign');
  
  try {
    // 创建工作区目录
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    
    // 复制 OpenReign 配置文件
    const sourceDir = path.join(__dirname, '..');
    const configSource = path.join(sourceDir, 'config', 'openreign.json');
    const configTarget = path.join(workspacePath, 'OPENREIGN.md');
    
    if (fs.existsSync(configSource)) {
      fs.copyFileSync(configSource, configTarget);
    }
    
    // 创建 AGENTS.md
    const agentsMd = `# OpenReign Pro 工作区

这是 OpenReign Pro 的 OpenClaw 集成工作区。

## 功能

- 太子分拣：自动识别任务复杂度
- 三省六部：复杂任务进入治理流程
- 户部管理：API 密钥统一管理

## 使用

所有发送到 OpenClaw 的消息都会经过 OpenReign 处理。
`;
    
    fs.writeFileSync(path.join(workspacePath, 'AGENTS.md'), agentsMd);
    
    log(`✅ OpenReign 工作区创建完成: ${workspacePath}`, 'green');
    return workspacePath;
  } catch (err) {
    log(`❌ 创建工作区失败: ${err.message}`, 'red');
    return null;
  }
}

// 修改 OpenClaw 配置，集成 OpenReign
function integrateOpenReign(openclawHome, config) {
  const openreignPath = path.join(__dirname, '..');
  const dashboardPath = path.join(openreignPath, 'dashboard');
  
  // 1. 添加 OpenReign Agent
  const openreignAgent = {
    id: 'openreign',
    name: 'OpenReign Pro',
    workspace: path.join(openclawHome, 'workspace-openreign'),
    agentDir: path.join(openclawHome, 'agents', 'openreign', 'agent'),
    default: true  // 设为默认 agent
  };
  
  // 检查是否已存在
  const existingIndex = config.agents.list.findIndex(a => a.id === 'openreign');
  if (existingIndex >= 0) {
    config.agents.list[existingIndex] = openreignAgent;
    log('📝 更新已存在的 OpenReign Agent', 'yellow');
  } else {
    // 设为默认，其他设为非默认
    config.agents.list.forEach(a => delete a.default);
    config.agents.list.unshift(openreignAgent);
    log('✅ 添加 OpenReign Agent 为默认', 'green');
  }
  
  // 2. 更新默认配置
  config.agents.defaults.workspace = openreignAgent.workspace;
  
  // 3. 添加 OpenReign 插件配置
  if (!config.plugins) {
    config.plugins = {};
  }
  
  config.plugins.openreign = {
    enabled: true,
    dashboard: {
      port: 18790,
      autoStart: true
    },
    gateway: {
      endpoint: 'http://localhost:18789'
    }
  };
  
  // 4. 更新渠道配置，指向 OpenReign
  if (config.channels) {
    Object.keys(config.channels).forEach(channelName => {
      const channel = config.channels[channelName];
      if (channel && typeof channel === 'object' && channel.enabled) {
        channel.agentId = 'openreign';
        log(`📝 更新渠道 ${channelName} -> OpenReign`, 'cyan');
      }
    });
  }
  
  return config;
}

// 保存配置
function saveConfig(openclawHome, config) {
  const configPath = path.join(openclawHome, 'openclaw.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log('✅ OpenClaw 配置已更新', 'green');
    return true;
  } catch (err) {
    log(`❌ 保存配置失败: ${err.message}`, 'red');
    return false;
  }
}

// 创建启动脚本
function createStartupScript(openclawHome) {
  const openreignPath = path.join(__dirname, '..');
  const dashboardPath = path.join(openreignPath, 'dashboard');
  
  const scripts = {
    win32: `start-openreign.bat`,
    darwin: `start-openreign.sh`,
    linux: `start-openreign.sh`
  };
  
  const scriptName = scripts[process.platform] || scripts.linux;
  const scriptPath = path.join(openreignPath, scriptName);
  
  let scriptContent = '';
  
  if (process.platform === 'win32') {
    scriptContent = `@echo off
echo Starting OpenReign Pro Dashboard...
cd /d "${dashboardPath}"
node server.js
pause
`;
  } else {
    scriptContent = `#!/bin/bash
echo "Starting OpenReign Pro Dashboard..."
cd "${dashboardPath}"
node server.js
`;
  }
  
  try {
    fs.writeFileSync(scriptPath, scriptContent);
    if (process.platform !== 'win32') {
      fs.chmodSync(scriptPath, 0o755);
    }
    log(`✅ 启动脚本已创建: ${scriptPath}`, 'green');
    return scriptPath;
  } catch (err) {
    log(`⚠️ 创建启动脚本失败: ${err.message}`, 'yellow');
    return null;
  }
}

// 主函数
async function main() {
  log('═══════════════════════════════════════════', 'cyan');
  log('  OpenReign Pro - OpenClaw 自动集成工具', 'cyan');
  log('═══════════════════════════════════════════\n', 'cyan');
  
  // 1. 检测 OpenClaw
  log('🔍 检测 OpenClaw 安装...', 'blue');
  const openclawHome = findOpenClawHome();
  
  if (!openclawHome) {
    log('❌ 未找到 OpenClaw 安装', 'red');
    log('请确保 OpenClaw 已安装并运行过至少一次', 'yellow');
    log('安装指南: https://docs.openclaw.ai', 'yellow');
    process.exit(1);
  }
  
  log(`✅ 找到 OpenClaw: ${openclawHome}`, 'green');
  
  // 2. 读取配置
  log('\n📖 读取 OpenClaw 配置...', 'blue');
  const config = readOpenClawConfig(openclawHome);
  if (!config) {
    process.exit(1);
  }
  
  // 3. 备份配置
  log('\n💾 备份当前配置...', 'blue');
  backupConfig(openclawHome);
  
  // 4. 创建工作区
  log('\n📁 创建 OpenReign 工作区...', 'blue');
  const workspacePath = createOpenReignWorkspace(openclawHome);
  if (!workspacePath) {
    process.exit(1);
  }
  
  // 5. 集成配置
  log('\n🔧 集成 OpenReign 到 OpenClaw...', 'blue');
  const newConfig = integrateOpenReign(openclawHome, config);
  
  // 6. 保存配置
  log('\n💾 保存配置...', 'blue');
  if (!saveConfig(openclawHome, newConfig)) {
    process.exit(1);
  }
  
  // 7. 创建启动脚本
  log('\n🚀 创建启动脚本...', 'blue');
  const scriptPath = createStartupScript(openclawHome);
  
  // 8. 完成
  log('\n═══════════════════════════════════════════', 'green');
  log('  ✅ OpenReign Pro 集成完成！', 'green');
  log('═══════════════════════════════════════════\n', 'green');
  
  log('📋 后续步骤：', 'cyan');
  log('1. 启动 OpenReign Dashboard:', 'yellow');
  if (scriptPath) {
    log(`   ${scriptPath}`, 'green');
  }
  log('   或: cd dashboard && node server.js', 'green');
  log('');
  log('2. 重启 OpenClaw Gateway:', 'yellow');
  log('   openclaw gateway restart', 'green');
  log('');
  log('3. 访问 Dashboard:', 'yellow');
  log('   http://localhost:18790', 'green');
  log('');
  log('4. 发送消息测试:', 'yellow');
  log('   通过任意渠道（飞书/钉钉等）发送消息', 'green');
  log('   消息将自动经过 OpenReign 处理', 'green');
  log('');
  log('📚 文档: https://github.com/yourname/openreign-pro', 'cyan');
}

main().catch(err => {
  log(`❌ 错误: ${err.message}`, 'red');
  process.exit(1);
});
