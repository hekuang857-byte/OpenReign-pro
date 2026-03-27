/**
 * 看板 API - 对齐 edict 的 kanban_update.py CLI 命令
 * REST API 实现，功能等价于 edict 的 CLI
 */

const express = require('express');
const router = express.Router();

// 获取 taskExecutor 实例（从 server.js 注入）
let taskExecutor = null;
let broadcast = null;

function initKanban(te, bc) {
  taskExecutor = te;
  broadcast = bc;
}

/**
 * POST /api/kanban/create
 * 创建任务（对应 edict: kanban_update.py create）
 */
router.post('/kanban/create', async (req, res) => {
  try {
    const { taskId, title, state, org, official, note } = req.body;
    
    if (!taskId || !title || !state) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: taskId, title, state'
      });
    }
    
    // 使用 taskExecutor 创建任务
    const task = taskExecutor.createTask(taskId, {
      title,
      state,
      org: org || 'system',
      official: official || 'system',
      note: note || '',
      createdAt: new Date().toISOString(),
      // edict 风格字段
      flowLog: [],
      progressLog: [],
      todos: []
    });
    
    // 广播创建事件
    broadcast('kanban:created', { taskId, title, state, org, official });
    
    res.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        state: task.state,
        org: task.org,
        official: task.official,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    console.error('[Kanban] 创建任务失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/kanban/state
 * 更新任务状态（对应 edict: kanban_update.py state）
 */
router.post('/kanban/state', async (req, res) => {
  try {
    const { taskId, state, note } = req.body;
    
    if (!taskId || !state) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: taskId, state'
      });
    }
    
    // 获取当前任务
    const task = taskExecutor.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    const oldState = task.state;
    
    // 更新状态
    taskExecutor.updateTask(taskId, { state, note });
    
    // 记录流转日志
    if (!task.flowLog) task.flowLog = [];
    task.flowLog.push({
      type: 'state_change',
      from: oldState,
      to: state,
      note: note || '',
      timestamp: new Date().toISOString()
    });
    
    // 广播状态变更
    broadcast('kanban:state_changed', { taskId, oldState, newState: state, note });
    
    res.json({
      success: true,
      taskId,
      oldState,
      newState: state,
      note
    });
  } catch (error) {
    console.error('[Kanban] 更新状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/kanban/flow
 * 记录流转（对应 edict: kanban_update.py flow）
 */
router.post('/kanban/flow', async (req, res) => {
  try {
    const { taskId, from, to, remark } = req.body;
    
    if (!taskId || !from || !to) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: taskId, from, to'
      });
    }
    
    const task = taskExecutor.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    // 记录流转日志
    if (!task.flowLog) task.flowLog = [];
    task.flowLog.push({
      type: 'flow',
      from,
      to,
      remark: remark || '',
      timestamp: new Date().toISOString()
    });
    
    // 广播流转事件
    broadcast('kanban:flow', { taskId, from, to, remark });
    
    res.json({
      success: true,
      taskId,
      from,
      to,
      remark,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Kanban] 记录流转失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/kanban/done
 * 标记任务完成（对应 edict: kanban_update.py done）
 */
router.post('/kanban/done', async (req, res) => {
  try {
    const { taskId, output, summary } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: taskId'
      });
    }
    
    const task = taskExecutor.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    const oldState = task.state;
    
    // 更新为完成状态
    taskExecutor.updateTask(taskId, {
      state: 'completed',
      output: output || '',
      summary: summary || '',
      completedAt: new Date().toISOString()
    });
    
    // 记录完成日志
    if (!task.flowLog) task.flowLog = [];
    task.flowLog.push({
      type: 'completed',
      from: oldState,
      to: 'completed',
      output: output || '',
      summary: summary || '',
      timestamp: new Date().toISOString()
    });
    
    // 广播完成事件
    broadcast('kanban:completed', { taskId, output, summary });
    
    res.json({
      success: true,
      taskId,
      oldState,
      newState: 'completed',
      output,
      summary
    });
  } catch (error) {
    console.error('[Kanban] 标记完成失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/kanban/progress
 * 实时进度上报（对应 edict: kanban_update.py progress）
 * 这是 edict 的核心特性，必须实现
 */
router.post('/kanban/progress', async (req, res) => {
  try {
    const { taskId, progress, plan } = req.body;
    
    if (!taskId || !progress) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: taskId, progress'
      });
    }
    
    const task = taskExecutor.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    // 记录进度日志
    if (!task.progressLog) task.progressLog = [];
    const progressEntry = {
      progress,
      plan: plan || '',
      timestamp: new Date().toISOString()
    };
    task.progressLog.push(progressEntry);
    
    // 更新当前进度（用于快速查询）
    taskExecutor.updateTask(taskId, {
      currentProgress: progress,
      currentPlan: plan || ''
    });
    
    // 广播进度更新
    broadcast('kanban:progress', { taskId, progress, plan });
    
    res.json({
      success: true,
      taskId,
      progress,
      plan: plan || '',
      timestamp: progressEntry.timestamp
    });
  } catch (error) {
    console.error('[Kanban] 进度上报失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/kanban/todo
 * 子任务详情上报（对应 edict: kanban_update.py todo --detail）
 */
router.post('/kanban/todo', async (req, res) => {
  try {
    const { taskId, todoId, title, status, detail } = req.body;
    
    if (!taskId || !todoId || !title) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: taskId, todoId, title'
      });
    }
    
    const task = taskExecutor.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    // 初始化 todos 数组
    if (!task.todos) task.todos = [];
    
    // 查找或创建子任务
    let todo = task.todos.find(t => t.id === todoId);
    if (!todo) {
      todo = {
        id: todoId,
        title,
        status: status || 'planned',
        detail: detail || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      task.todos.push(todo);
    } else {
      // 更新现有子任务
      todo.title = title;
      if (status) todo.status = status;
      if (detail) todo.detail = detail;
      todo.updatedAt = new Date().toISOString();
    }
    
    // 广播子任务更新
    broadcast('kanban:todo_updated', { taskId, todoId, todo });
    
    res.json({
      success: true,
      taskId,
      todoId,
      todo
    });
  } catch (error) {
    console.error('[Kanban] 子任务更新失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/kanban/task/:taskId
 * 获取任务详情（包含 flowLog, progressLog, todos）
 */
router.get('/kanban/task/:taskId', async (req, res) => {
  try {
    const task = taskExecutor.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    res.json({
      success: true,
      task: {
        ...task,
        flowLog: task.flowLog || [],
        progressLog: task.progressLog || [],
        todos: task.todos || []
      }
    });
  } catch (error) {
    console.error('[Kanban] 获取任务失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/kanban/tasks
 * 获取所有任务列表
 */
router.get('/kanban/tasks', async (req, res) => {
  try {
    const tasks = taskExecutor.getAllTasks();
    res.json({
      success: true,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        state: t.state,
        org: t.org,
        official: t.official,
        currentProgress: t.currentProgress,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      }))
    });
  } catch (error) {
    console.error('[Kanban] 获取任务列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/kanban/memorial/:taskId
 * 获取奏折格式（对齐 edict 奏折存档）
 */
router.get('/kanban/memorial/:taskId', async (req, res) => {
  try {
    const { MemorialFormatter } = require('../../../../src/utils/memorial-formatter');
    const formatter = new MemorialFormatter();
    
    const task = taskExecutor.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    const memorial = formatter.formatMemorial(task);
    
    res.json({
      success: true,
      memorial
    });
  } catch (error) {
    console.error('[Kanban] 获取奏折失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/kanban/memorials
 * 获取所有奏折列表（已完成任务）
 */
router.get('/api/kanban/memorials', async (req, res) => {
  try {
    const { MemorialFormatter } = require('../../../../src/utils/memorial-formatter');
    const formatter = new MemorialFormatter();
    
    const { status, limit = 50 } = req.query;
    
    let tasks = taskExecutor.getAllTasks();
    
    // 筛选已完成的任务
    if (status === 'completed') {
      tasks = tasks.filter(t => t.state === 'completed');
    }
    
    // 限制数量
    tasks = tasks.slice(0, parseInt(limit));
    
    const memorials = formatter.formatMemorials(tasks);
    
    res.json({
      success: true,
      count: memorials.length,
      memorials
    });
  } catch (error) {
    console.error('[Kanban] 获取奏折列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/kanban/memorial/:taskId/markdown
 * 获取奏折 Markdown 格式（一键复制）
 */
router.get('/kanban/memorial/:taskId/markdown', async (req, res) => {
  try {
    const { MemorialFormatter } = require('../../../../src/utils/memorial-formatter');
    const formatter = new MemorialFormatter();
    
    const task = taskExecutor.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    const memorial = formatter.formatMemorial(task);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${task.id}.md"`);
    res.send(memorial.markdown);
  } catch (error) {
    console.error('[Kanban] 获取奏折 Markdown 失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, initKanban };
