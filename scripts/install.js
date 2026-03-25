#!/usr/bin/env node

/**
 * OpenReign Pro 安装向导
 * 检测环境、端口、配置，生成最终配置
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');

const CONFIG_TEMPLATE = path.join(__dirname, '..', 'config', 'openreign.json');
const CONFIG_OUTPUT = path.join(__dirname, '..', 'config', 'openreign.local.json');

// 默认端口范围
const PORT_RANGES = {
  dashboard: [18790, 18800],
  openclaw: [18789, 18789], // 固定，检测是否可用
  openviking: [8080, 8090],
};

// 检测端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// 寻找可用端口
async function findAvailablePort(start, end) {
  for (let port = start; port <= end; port++) {
    if (await checkPort(port)) return port;
  }
  return null;
}

// 检测 OpenClaw 配置
function detectOpenClawConfig() {
  const paths = [
    path.join(process.env.HOME, '.stepclaw', 'openclaw.json'),
    path.join(process.env.HOME, '.openclaw', 'openclaw.json'),
  ];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        return { found: true, path: p, config: cfg };
      }
    } catch {}
  }
  return { found: false };
}

// 检测 OpenViking
async function detectOpenViking() {
  // 检查端口
  for (let port = 8080; port <= 8090; port++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return { running: true, port };
    } catch {}
  }
  // 检查是否安装
  const installPaths = [
    path.join(process.env.HOME, 'OpenViking'),
    '/usr/local/openviking',
    '/opt/openviking',
  ];
  for (const p of installPaths) {
    if (fs.existsSync(p)) return { installed: true, path: p, running: false };
  }
  return { installed: false, running: false };
}

// 主安装流程
async function install() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     OpenReign Pro v1.2.1 安装向导     ║');
  console.log('╚════════════════════════════════════════╝\n');

  const results = {
    ports: {},
    openclaw: {},
    openviking: {},
    timestamp: new Date().toISOString(),
  };

  // 1. 检测 OpenClaw
  console.log('🔍 检测 OpenClaw 配置...');
  const oc = detectOpenClawConfig();
  if (oc.found) {
    console.log(`   ✅ 找到 OpenClaw: ${oc.path}`);
    const gateway = (oc.config.gateway || {});
    const port = gateway.port || 18789;
    const bind = gateway.bind || 'loopback';
    results.openclaw = { found: true, path: oc.path, port, bind };
    
    // 检测端口是否可用
    const portAvailable = await checkPort(port);
    if (!portAvailable) {
      console.log(`   ⚠️  Gateway 端口 ${port} 已被占用`);
      console.log(`   💡 请检查 OpenClaw 是否已启动，或修改配置`);
    } else {
      console.log(`   ⚠️  Gateway 端口 ${port} 可用但未运行`);
    }
  } else {
    console.log('   ❌ 未找到 OpenClaw 配置');
    console.log('   💡 请先运行: openclaw onboard');
    results.openclaw = { found: false };
  }

  // 2. 检测端口
  console.log('\n🔍 检测可用端口...');
  
  const dashboardPort = await findAvailablePort(PORT_RANGES.dashboard[0], PORT_RANGES.dashboard[1]);
  if (dashboardPort) {
    console.log(`   ✅ Dashboard 端口: ${dashboardPort}`);
    results.ports.dashboard = dashboardPort;
  } else {
    console.log('   ❌ 未找到可用 Dashboard 端口');
    process.exit(1);
  }

  // 3. 检测 OpenViking
  console.log('\n🔍 检测 OpenViking...');
  const ov = await detectOpenViking();
  if (ov.running) {
    console.log(`   ✅ OpenViking 运行中: http://localhost:${ov.port}`);
    results.openviking = { installed: true, running: true, port: ov.port };
  } else if (ov.installed) {
    console.log(`   ⚠️  OpenViking 已安装但未运行: ${ov.path}`);
    console.log('   💡 启动命令: ./openviking-server');
    results.openviking = { installed: true, running: false, path: ov.path };
  } else {
    console.log('   ⚠️  OpenViking 未安装');
    console.log('   💡 安装命令: git clone https://github.com/volcengine/OpenViking');
    results.openviking = { installed: false, running: false };
  }

  // 4. 生成配置
  console.log('\n📝 生成配置文件...');
  
  try {
    const template = JSON.parse(fs.readFileSync(CONFIG_TEMPLATE, 'utf8'));
    
    // 更新端口
    template.gateway = template.gateway || {};
    template.gateway.endpoint = `http://localhost:${results.openclaw.port || 18789}`;
    
    template.dashboard = template.dashboard || {};
    template.dashboard.port = results.ports.dashboard;
    
    template.memory = template.memory || {};
    template.memory.integration = template.memory.integration || {};
    template.memory.integration.openviking = {
      enabled: results.openviking.running,
      endpoint: results.openviking.running ? `http://localhost:${results.openviking.port}` : 'http://localhost:8080',
      fallback_to_session: true,
    };
    
    // 写入本地配置
    fs.writeFileSync(CONFIG_OUTPUT, JSON.stringify(template, null, 2), 'utf8');
    console.log(`   ✅ 配置已保存: ${CONFIG_OUTPUT}`);
    
    // 同时更新原配置
    fs.writeFileSync(CONFIG_TEMPLATE, JSON.stringify(template, null, 2), 'utf8');
    console.log(`   ✅ 模板已更新: ${CONFIG_TEMPLATE}`);
    
  } catch (err) {
    console.log(`   ❌ 配置生成失败: ${err.message}`);
    process.exit(1);
  }

  // 5. 安装报告
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           安装完成报告                ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\nDashboard: http://localhost:${results.ports.dashboard}`);
  console.log(`OpenClaw:  ${results.openclaw.found ? results.openclaw.port : '未配置'}`);
  console.log(`OpenViking: ${results.openviking.running ? `运行中 (${results.openviking.port})` : results.openviking.installed ? '已安装未运行' : '未安装'}`);
  
  console.log('\n📋 后续步骤:');
  if (!results.openclaw.found) {
    console.log('  1. 运行 openclaw onboard 配置 Gateway');
  } else if (!await checkPort(results.openclaw.port)) {
    console.log('  1. 启动 OpenClaw: openclaw gateway');
  }
  if (!results.openviking.running) {
    console.log(`  ${results.openclaw.found ? '2' : '1'}. 可选: 安装 OpenViking 以启用 L2-L4 长期记忆`);
  }
  console.log(`  ${results.openviking.running && results.openclaw.found ? '1' : results.openviking.running || results.openclaw.found ? '2' : '3'}. 启动 Dashboard: cd dashboard && npm start`);
  
  console.log('\n✨ OpenReign Pro 安装完成!\n');
}

install().catch(err => {
  console.error('安装失败:', err);
  process.exit(1);
});
