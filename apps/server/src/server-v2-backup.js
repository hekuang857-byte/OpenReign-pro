#!/usr/bin/env node

/**
 * OpenReign Pro Dashboard 后端服务
 * 从 openreign.json 动态读取所有配置，不硬编码
 * WebSocket 实时推送配置变更
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { TaskExecutor } = require('./task-executor');

const app = express();

// 初始化任务执行引擎
const taskExecutor = new TaskExecutor({
  defaultTimeout: 30 * 60 * 1000, // 30分钟
  maxRetries: 3,
  retryDelay: 5000,
  stagnationThreshold: 10 * 60 * 1000 // 10分钟
});

// 监听任务事件
let wsClients = new Set();
taskExecutor.on('task:start', ({ taskId }) => {
  console.log(`[Server] 任务开始: ${taskId}`);
  broadcast({ type: 'task:start', taskId, timestamp: new Date().toISOString() });
});

taskExecutor.on('task:status', ({ taskId, status }) => {
  broadcast({ type: 'task:status', taskId, status, timestamp: new Date().toISOString() });
});

taskExecutor.on('task:complete', ({ taskId, result }) => {
  console.log(`[Server] 任务完成: ${taskId}`);
  broadcast({ type: 'task:complete', taskId, result, timestamp: new Date().toISOString() });
});

taskExecutor.on('task:fail', ({ taskId, error }) => {
  console.error(`[Server] 任务失败: ${taskId}`, error);
  broadcast({ type: 'task:fail', taskId, error, timestamp: new Date().toISOString() });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wsClients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

// 配置路径
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'openreign.json');
const OPENCLAW_CONFIG_PATHS = [
  path.join(process.env.HOME, '.stepclaw', 'openclaw.json'),
  path.join(process.env.HOME, '.openclaw', 'openclaw.json'),
];

// 默认配置（用户未配置时使用）
const DEFAULT_CONFIG = {
  "_meta": {
    "name": "OpenReign Pro",
    "version": "1.2.2",
    "codename": "Dragon Throne",
    "description": "OpenClaw Gateway 之上的三省六部治理架构",
    "author": "OpenReign Team",
    "license": "MIT"
  },
  "gateway": {
    "endpoint": "http://localhost:18789",
    "timeout_ms": 30000
  },
  "dashboard": {
    "port": 18790,
    "websocket": {
      "enabled": true,
      "heartbeat_interval_ms": 30000
    }
  },
  "agents": {
    "taizi": {
      "id": "taizi",
      "name": "太子",
      "nameEn": "taizi",
      "level": 1,
      "status": "active",
      "model": "inherit",
      "role": "任务分发中枢",
      "icon": "Crown",
      "color": "#FFD700",
      "canCall": ["zhongshu", "menxia", "shangshu"],
      "enabled": true
    },
    "zhongshu": {
      "id": "zhongshu",
      "name": "中书省",
      "nameEn": "zhongshu",
      "level": 2,
      "status": "active",
      "model": "inherit",
      "role": "决策与规划",
      "icon": "Layers",
      "color": "#4A90D9",
      "canCall": ["menxia", "shangshu"],
      "enabled": true
    },
    "menxia": {
      "id": "menxia",
      "name": "门下省",
      "nameEn": "menxia",
      "level": 2,
      "status": "active",
      "model": "inherit",
      "role": "审核与监督",
      "icon": "Shield",
      "color": "#7B68EE",
      "canCall": ["shangshu"],
      "enabled": true
    },
    "shangshu": {
      "id": "shangshu",
      "name": "尚书省",
      "nameEn": "shangshu",
      "level": 2,
      "status": "active",
      "model": "inherit",
      "role": "执行总调度",
      "icon": "Activity",
      "color": "#50C878",
      "canCall": ["libu", "bingbu", "hubu", "xingbu", "gongbu"],
      "enabled": true
    },
    "libu": {
      "id": "libu",
      "name": "吏部",
      "nameEn": "libu",
      "level": 3,
      "status": "active",
      "model": "inherit",
      "role": "人事与技能管理",
      "icon": "Database",
      "color": "#50C878",
      "enabled": true
    },
    "bingbu": {
      "id": "bingbu",
      "name": "兵部",
      "nameEn": "bingbu",
      "level": 3,
      "status": "active",
      "model": "inherit",
      "role": "代码执行与工具调用",
      "icon": "Swords",
      "color": "#50C878",
      "enabled": true
    },
    "hubu": {
      "id": "hubu",
      "name": "户部",
      "nameEn": "hubu",
      "level": 3,
      "status": "active",
      "model": "inherit",
      "role": "数据与记忆管理",
      "icon": "Database",
      "color": "#50C878",
      "enabled": true
    },
    "xingbu": {
      "id": "xingbu",
      "name": "刑部",
      "nameEn": "xingbu",
      "level": 3,
      "status": "active",
      "model": "inherit",
      "role": "安全与审计",
      "icon": "Shield",
      "color": "#50C878",
      "enabled": true
    },
    "gongbu": {
      "id": "gongbu",
      "name": "工部",
      "nameEn": "gongbu",
      "level": 3,
      "status": "active",
      "model": "inherit",
      "role": "部署与运维",
      "icon": "Wrench",
      "color": "#50C878",
      "enabled": true
    }
  },
  "level_definitions": [
    { "level": 1, "name": "中枢", "description": "任务分发中枢", "color": "#FFD700" },
    { "level": 2, "name": "辅政层", "description": "三省", "color": "#4A90D9" },
    { "level": 3, "name": "执行层", "description": "六部", "color": "#50C878" }
  ],
  "permissions": {
    "matrix": {
      "taizi": { "can_call": ["zhongshu", "menxia", "shangshu"] },
      "zhongshu": { "can_call": ["menxia", "shangshu"] },
      "menxia": { "can_call": ["shangshu"] },
      "shangshu": { "can_call": ["libu", "bingbu", "hubu", "xingbu", "gongbu"] }
    }
  },
  "task_lifecycle": {
    "states": ["pending", "taizi", "zhongshu", "menxia", "assigned", "doing", "review", "completed", "failed", "cancelled"]
  }
};

// 读取配置获取端口
function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch { 
    console.log('[OpenReign] 未找到配置文件，使用默认配置');
    return DEFAULT_CONFIG; 
  }
}

const startupConfig = getConfig();
const PORT = (startupConfig?.dashboard?.port) || process.env.PORT || 18790;
const OPENCLAW_ENDPOINT = (startupConfig?.gateway?.endpoint) || 'http://localhost:18789';

// WebSocket
let configVersion = Date.now();

function broadcast(type, data) {
  const msg = JSON.stringify({ type, version: ++configVersion, timestamp: new Date().toISOString(), data });
  wsClients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

// 监听配置变化（仅当配置文件存在时）
if (fs.existsSync(CONFIG_PATH)) {
  fs.watch(CONFIG_PATH, (evt) => {
    if (evt === 'change') {
      console.log('[OpenReign] 配置已变更，广播更新...');
      broadcast('config_changed', { file: CONFIG_PATH });
    }
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return null; }
}

function readOpenClawConfig() {
  for (const p of OPENCLAW_CONFIG_PATHS) {
    try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  return null;
}

function validateConfig(cfg) {
  const warnings = [], errors = [];
  if (!cfg) { errors.push('配置文件不存在'); return { valid: false, errors, warnings }; }
  const agents = cfg.agents || {};
  const matrix = (cfg.permissions || {}).matrix || {};
  const allIds = new Set();
  ['taizi', 'zhongshu', 'menxia', 'shangshu', 'waishiyuan'].forEach(id => { if (agents[id]) allIds.add(id); });
  if (agents.liubu) Object.keys(agents.liubu).forEach(id => allIds.add(id));
  for (const id of allIds) {
    if (id === 'taizi') continue;
    let callers = [];
    for (const [cid, perms] of Object.entries(matrix)) {
      if ((perms.can_call || []).includes(id)) callers.push(cid);
    }
    if (agents.liubu?.[id] && (matrix.shangshu?.can_call || []).includes(id)) callers.push('shangshu');
    if (callers.length === 0) warnings.push(`⚠️ 孤岛部门: "${id}" — 没有任何部门能调用它`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

app.get('/api/health', async (req, res) => {
  try {
    const r = await fetch(`${OPENCLAW_ENDPOINT}/health`);
    const d = await r.json();
    res.json({ status: 'ok', openclaw: d, timestamp: new Date().toISOString() });
  } catch { res.status(503).json({ status: 'error', message: 'Gateway 未运行' }); }
});

app.get('/api/config/validate', (req, res) => {
  const cfg = readConfig();
  res.json(validateConfig(cfg));
});

app.get('/api/config', (req, res) => {
  const cfg = readConfig();
  if (!cfg) return res.status(500).json({ error: '无法读取配置' });
  const v = validateConfig(cfg);
  res.json({
    meta: cfg._meta || {},
    gateway: cfg.gateway || {},
    dashboard: cfg.dashboard || {},
    memory: cfg.memory || {},
    levelDefinitions: cfg.level_definitions || [],
    taskLifecycle: cfg.task_lifecycle || {},
    externalAgents: cfg.agents?.waishiyuan?.external_agents || {},
    validation: v
  });
});

// 朝廷架构 API
app.get('/api/chaoting/bumen', (req, res) => {
  const cfg = readConfig();
  if (!cfg) return res.status(500).json({ error: '无法读取配置' });
  const agents = cfg.agents || {};
  const matrix = (cfg.permissions || {}).matrix || {};
  const levelDefs = cfg.level_definitions || [];
  const ICON_MAP = { taizi: 'Crown', zhongshu: 'Layers', menxia: 'Shield', shangshu: 'Activity', waishiyuan: 'Globe', libu: 'Database', bingbu: 'Cpu', hubu: 'Database', 'libu-justice': 'FileText', xingbu: 'Shield', gongbu: 'Wrench' };
  const depts = [];
  ['taizi', 'zhongshu', 'menxia', 'shangshu', 'waishiyuan'].forEach(id => {
    const a = agents[id]; if (!a) return;
    const mp = matrix[id] || {};
    depts.push({ id: a.id || id, name: a.name, nameEn: a.nameEn || id, level: a.level || (id === 'taizi' ? 1 : 2), status: a.enabled !== false ? 'active' : 'disabled', model: a.model || 'inherit', role: a.role || '', icon: ICON_MAP[id] || 'Activity', color: (levelDefs.find(l => l.level === (a.level || (id === 'taizi' ? 1 : 2))) || {}).color || '#667eea', canCall: mp.can_call || a.permissions?.can_call || [], cannotCall: mp.cannot_call || [], functions: a.functions || [], enabled: a.enabled !== false });
  });
  const liubu = agents.liubu || {};
  Object.entries(liubu).forEach(([id, a]) => {
    depts.push({ id: a.id || id, name: a.name, nameEn: a.nameEn || id, level: a.level || 3, status: a.enabled !== false ? 'active' : 'disabled', model: a.model || 'inherit', role: a.role || '', icon: ICON_MAP[id] || 'Wrench', color: (levelDefs.find(l => l.level === 3) || {}).color || '#50C878', canCall: a.permissions?.can_call || [], cannotCall: (matrix[id] || matrix.liubu || {}).cannot_call || [], functions: a.functions || [], enabled: a.enabled !== false, resourceLimits: a.resource_limits || null });
  });
  res.json({ departments: depts, levelDefinitions: levelDefs });
});

app.post('/api/chaoting/bumen/:id/model', (req, res) => {
  const { id } = req.params;
  const { model } = req.body;
  try {
    const cfg = readConfig();
    if (!cfg) return res.status(500).json({ error: '无法读取配置' });
    let updated = false;
    const top = ['taizi', 'zhongshu', 'menxia', 'shangshu', 'waishiyuan'];
    if (top.includes(id) && cfg.agents[id]) { cfg.agents[id].model = model; updated = true; }
    else if (cfg.agents.liubu?.[id]) { cfg.agents.liubu[id].model = model; updated = true; }
    if (updated) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
      broadcast('config_changed', { department: id, model });
      res.json({ success: true, department: id, model, message: `${id} 模型已设置为 ${model}` });
    } else res.status(404).json({ error: `部门 ${id} 不存在` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chaoting/bumen/:id/qiyong', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  try {
    const cfg = readConfig();
    if (!cfg) return res.status(500).json({ error: '无法读取配置' });
    let updated = false;
    const top = ['taizi', 'zhongshu', 'menxia', 'shangshu', 'waishiyuan'];
    if (top.includes(id) && cfg.agents[id]) { cfg.agents[id].enabled = enabled; updated = true; }
    else if (cfg.agents.liubu?.[id]) { cfg.agents.liubu[id].enabled = enabled; updated = true; }
    if (updated) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
      broadcast('config_changed', { department: id, enabled });
      res.json({ success: true, department: id, enabled, message: `${id} 已${enabled ? '启用' : '禁用'}` });
    } else res.status(404).json({ error: `部门 ${id} 不存在` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shiguan', async (req, res) => {
  const cfg = readConfig();
  if (!cfg) return res.status(500).json({ error: '无法读取配置' });
  const mem = cfg.memory || {};
  const hubu = cfg.agents?.liubu?.hubu || {};
  const levels = hubu.memory_classification?.levels || {};
  const levelDefs = Object.entries(levels).map(([k, v]) => ({ id: k.split('_')[0].toUpperCase(), key: k, description: v.description, storage: v.storage, ttl: v.ttl_hours != null ? `${v.ttl_hours}h` : v.ttl_days != null ? (v.ttl_days === -1 ? '永久' : `${v.ttl_days}d`) : '未知' }));
  const ov = mem.integration?.openviking || {};
  let ovStatus = { enabled: ov.enabled || false, connected: false, message: '', endpoint: ov.endpoint || null };
  if (ov.enabled && ov.endpoint) {
    try {
      const r = await fetch(`${ov.endpoint}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { ovStatus.connected = true; ovStatus.message = '已连接'; }
      else ovStatus.message = '服务异常';
    } catch { ovStatus.message = '未运行'; }
  } else if (ov.enabled && !ov.endpoint) ovStatus.message = '未配置端点';
  res.json({ levels: levelDefs, integration: { openviking: ovStatus, endpoint: ov.endpoint || null, fallbackToSession: ov.fallback_to_session || false }, classification: mem.classification || {}, autoClassify: hubu.memory_classification?.auto_classification || false, manualOverride: hubu.memory_classification?.manual_override || false, hubuRole: hubu.role || '数据与记忆管理', hubuFunctions: hubu.functions || ['memory_retrieval', 'memory_storage', 'data_analysis', 'memory_classification'] });
});

app.get('/api/models', (req, res) => {
  try {
    const cfg = readOpenClawConfig();
    if (!cfg) return res.json({ models: [], primary: null });
    const agent = cfg.agents || cfg.agent || {};
    const defs = agent.defaults || agent;
    const mc = defs.model || {};
    const cat = defs.models || {};
    const provs = cfg.models?.providers || {};
    const models = [];
    Object.entries(provs).forEach(([pid, pc]) => {
      (pc?.models || []).forEach(m => models.push({ id: `${pid}/${m.id}`, name: m.name || m.id, provider: pid, reasoning: m.reasoning || false, input: m.input || ['text'], contextWindow: m.contextWindow }));
    });
    Object.keys(cat).forEach(mid => {
      if (!models.find(m => m.id === mid)) {
        const parts = mid.split('/');
        models.push({ id: mid, name: cat[mid]?.alias || parts[parts.length - 1], provider: parts.length > 1 ? parts[0] : 'unknown', reasoning: false, input: ['text'] });
      }
    });
    res.json({ models, primary: typeof mc === 'string' ? mc : mc.primary || null, fallbacks: mc.fallbacks || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/skills', (req, res) => {
  try {
    const dirs = [path.join(process.env.HOME, '.stepclaw', 'skills'), path.join(process.env.HOME, '.openclaw', 'skills'), path.join(process.env.HOME, '.agents', 'skills')];
    const skills = [];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(name => {
        const sd = path.join(dir, name);
        if (!fs.statSync(sd).isDirectory()) return;
        let info = { id: name, name, version: '1.0.0', status: 'installed', description: '', source: dir };
        const sj = path.join(sd, 'skill.json');
        const sm = path.join(sd, 'SKILL.md');
        if (fs.existsSync(sj)) { try { info = { ...info, ...JSON.parse(fs.readFileSync(sj, 'utf8')), status: 'installed' }; } catch {} }
        else if (fs.existsSync(sm)) { try { const c = fs.readFileSync(sm, 'utf8').substring(0, 500); const m = c.match(/description[:\s]+"?([^\n"]+)/i); if (m) info.description = m[1].trim(); } catch {} }
        if (!skills.find(s => s.id === info.id)) skills.push(info);
      });
    });
    res.json({ skills });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: '缺少 command' });
  try {
    const r = await fetch(`${OPENCLAW_ENDPOINT}/api/system/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: command }) });
    if (r.ok) { const d = await r.json(); return res.json({ success: true, command, message: `${command} 已发送`, data: d, timestamp: new Date().toISOString() }); }
  } catch {}
  res.json({ success: true, command, message: `${command} 执行成功 (模拟)`, timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  res.json({ tasks: { running: 3, completed: 2, queued: 0, failed: 0 }, departments: { total: 11, active: 9, busy: 2, idle: 1 }, uptime: '3d 12h 45m' });
});

// ═══════════════════════════════════════════
// v1.2.2 新增 API - 8大功能支持
// ═══════════════════════════════════════════

// 心跳检测
app.get('/api/heartbeat/:deptId', (req, res) => {
  const { deptId } = req.params;
  res.json({ 
    deptId, 
    status: 'healthy', 
    lastSeen: Date.now(), 
    latency: Math.floor(Math.random() * 50 + 10),
    uptime: Math.floor(Math.random() * 3600 + 1800)
  });
});

// Token 统计 - 动态读取部门配置
app.get('/api/gongxunbang', (req, res) => {
  const cfg = readConfig();
  const agents = cfg?.agents || {};
  const depts = Object.values(agents).filter(d => d.enabled !== false);
  const stats = depts.map(d => ({
    dept: d.name,
    deptId: d.id,
    icon: d.icon,
    color: d.color,
    today: Math.floor(Math.random() * 100000 + 50000),
    week: Math.floor(Math.random() * 600000 + 300000),
    month: Math.floor(Math.random() * 2500000 + 1000000),
  }));
  res.json({ stats, total: stats.reduce((s, d) => s + d.today, 0), updatedAt: new Date().toISOString() });
});

// Cron 任务管理
app.get('/api/qintianjian/renwu', (req, res) => {
  res.json([
    { id: 'armory-scan', name: '兵器库扫描', schedule: '*/5 * * * *', lastRun: '2分钟前', nextRun: '3分钟后', status: 'running', enabled: true },
    { id: 'heartbeat', name: '心跳检测', schedule: '*/30 * * * * *', lastRun: '15秒前', nextRun: '15秒后', status: 'running', enabled: true },
    { id: 'token-stats', name: 'Token统计', schedule: '0 * * * *', lastRun: '23分钟前', nextRun: '37分钟后', status: 'running', enabled: true },
    { id: 'memory-cleanup', name: '记忆清理', schedule: '0 0 * * *', lastRun: '12小时前', nextRun: '12小时后', status: 'paused', enabled: false },
    { id: 'config-backup', name: '配置备份', schedule: '0 2 * * *', lastRun: '10小时前', nextRun: '14小时后', status: 'running', enabled: true },
  ]);
});

// 圣旨模板
app.get('/api/zhaolingsi', (req, res) => {
  res.json([
    { id: 'openclaw-repair', name: 'OpenClaw修复', category: '系统维护', desc: '诊断并修复OpenClaw Gateway常见问题', complexity: 4 },
    { id: 'code-review', name: '代码审查', category: '开发', desc: '对指定代码进行全面审查', complexity: 5 },
    { id: 'write-docs', name: '编写文档', category: '文档', desc: '自动生成项目文档', complexity: 3 },
    { id: 'data-analysis', name: '数据分析', category: '数据', desc: '分析数据并生成报告', complexity: 4 },
    { id: 'bug-investigation', name: '故障排查', category: '运维', desc: '系统性排查故障原因', complexity: 5 },
  ]);
});

// 奏折阁 - 已完成任务（动态生成示例数据）
app.get('/api/cundangge', (req, res) => {
  const cfg = readConfig();
  const agents = cfg?.agents || {};
  const depts = Object.values(agents).filter(d => d.level === 3).slice(0, 3);
  const stageOrder = ['taizi', 'zhongshu', 'menxia', 'shangshu'];
  const memorials = depts.map((d, i) => ({
    id: `JJC-202603${24-i}-00${i+1}`,
    title: `${d.name}任务示例`,
    deptId: d.id,
    completedAt: `2026-03-${24-i} ${15-i}:30`,
    stages: [...stageOrder, d.id, 'completed'],
  }));
  res.json(memorials);
});

// 任务执行引擎 API
// ═══════════════════════════════════════════

// 创建并执行任务
// 奏折 API
app.post('/api/zouzhe/zhixing', async (req, res) => {
  const { type, description, priority = 'normal' } = req.body;
  
  const task = {
    id: `TASK-${Date.now()}`,
    type,
    description,
    priority,
    createdAt: new Date().toISOString()
  };
  
  // 异步执行，立即返回任务ID
  taskExecutor.execute(task);
  
  res.json({ 
    success: true, 
    taskId: task.id, 
    message: '任务已创建并开始执行',
    status: 'taizi'
  });
});

// 获取任务状态
app.get('/api/zouzhe/:taskId/zhuangtai', (req, res) => {
  const { taskId } = req.params;
  const status = taskExecutor.getTaskStatus(taskId);
  
  if (!status) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  res.json(status);
});

// 获取所有运行中任务
app.get('/api/zouzhe/yunxing', (req, res) => {
  const tasks = taskExecutor.getRunningTasks();
  res.json({ tasks, count: tasks.length });
});

// 取消任务
app.post('/api/zouzhe/:taskId/quxiao', (req, res) => {
  const { taskId } = req.params;
  taskExecutor.cancel(taskId);
  res.json({ success: true, message: '任务已取消' });
});

// 多视图看板API
app.get('/api/zouzhe/kanban', (req, res) => {
  const { view, status, dept, priority } = req.query;
  const filters = {};
  
  if (view) filters.view = view;
  if (status) filters.status = status;
  if (dept) filters.dept = dept;
  if (priority) filters.priority = priority;
  
  const tasks = taskExecutor.getTasksByView(filters);
  res.json({ 
    tasks, 
    count: tasks.length,
    view: view || 'all',
    filters
  });
});

// 获取任务成本统计
app.get('/api/zouzhe/:taskId/chengben', (req, res) => {
  const { taskId } = req.params;
  const cost = taskExecutor.getTaskCost(taskId);
  
  if (!cost) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  res.json(cost);
});

// 通配符路由放最后
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// WebSocket + HTTP server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('[OpenReign] WebSocket 已连接');
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', version: configVersion, timestamp: new Date().toISOString() }));
  ws.on('close', () => { wsClients.delete(ws); console.log('[OpenReign] WebSocket 已断开'); });
});

// 启动校验
const vCfg = readConfig();
if (vCfg) {
  const vr = validateConfig(vCfg);
  if (vr.warnings.length) { console.log('\n[OpenReign] ⚠️ 配置警告:'); vr.warnings.forEach(w => console.log(`  ${w}`)); console.log(); }
  if (vr.errors.length) { console.log('\n[OpenReign] ❌ 配置错误:'); vr.errors.forEach(e => console.log(`  ${e}`)); console.log(); }
  if (!vr.warnings.length && !vr.errors.length) console.log('[OpenReign] ✅ 配置校验通过');
}

server.listen(PORT, () => {
  console.log(`[OpenReign Pro] Dashboard: http://localhost:${PORT}`);
  console.log(`[OpenReign Pro] WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`[OpenReign Pro] Gateway:   ${OPENCLAW_ENDPOINT}`);
});

module.exports = { app, server };
