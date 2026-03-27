/**
 * Kanban Client - 看板 API 客户端
 * 封装对看板 REST API 的调用，对齐 edict 的 CLI 命令
 * 支持古风消息格式化
 */

const { ClassicalFormatter } = require('../utils/classical-formatter');

class KanbanClient {
  constructor(baseUrl = 'http://localhost:18790', options = {}) {
    this.baseUrl = baseUrl;
    this.formatter = new ClassicalFormatter();
    this.classicalMode = options.classicalMode !== false; // 默认启用古风
  }

  /**
   * 设置古风模式
   */
  setClassicalMode(enabled) {
    this.classicalMode = enabled;
  }

  /**
   * 创建任务（对应 edict: kanban_update.py create）
   */
  async create(taskId, title, state, org, official, note = '') {
    const response = await fetch(`${this.baseUrl}/api/kanban/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, title, state, org, official, note })
    });
    return response.json();
  }

  /**
   * 更新状态（对应 edict: kanban_update.py state）
   */
  async state(taskId, state, note = '') {
    const response = await fetch(`${this.baseUrl}/api/kanban/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, state, note })
    });
    return response.json();
  }

  /**
   * 记录流转（对应 edict: kanban_update.py flow）
   * 支持古风消息格式化
   */
  async flow(taskId, from, to, remark = '') {
    // 古风化处理
    let classicalRemark = remark;
    let classicalFrom = from;
    let classicalTo = to;
    
    if (this.classicalMode) {
      classicalRemark = this.formatter.modernToClassical(remark);
      classicalFrom = this.formatter.getTitle(from);
      classicalTo = this.formatter.getTitle(to);
    }

    const response = await fetch(`${this.baseUrl}/api/kanban/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        taskId, 
        from: classicalFrom, 
        to: classicalTo, 
        remark: classicalRemark 
      })
    });
    return response.json();
  }

  /**
   * 标记完成（对应 edict: kanban_update.py done）
   */
  async done(taskId, output = '', summary = '') {
    const response = await fetch(`${this.baseUrl}/api/kanban/done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, output, summary })
    });
    return response.json();
  }

  /**
   * 实时进度上报（对应 edict: kanban_update.py progress）
   * 🚨 这是 edict 的核心特性，每个关键步骤必须调用
   * 支持古风消息格式化
   */
  async progress(taskId, progress, plan = '', deptId = null) {
    // 古风化处理
    let classicalProgress = progress;
    if (this.classicalMode && deptId) {
      classicalProgress = this.formatter.formatProgress(deptId, '办理', progress);
    } else if (this.classicalMode) {
      classicalProgress = this.formatter.modernToClassical(progress);
    }

    const response = await fetch(`${this.baseUrl}/api/kanban/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        taskId, 
        progress: classicalProgress, 
        plan 
      })
    });
    return response.json();
  }
  
  /**
   * 古风进度上报（便捷方法）
   */
  async progressClassical(taskId, deptId, action, detail, plan = '') {
    const progress = this.formatter.formatProgress(deptId, action, detail);
    return this.progress(taskId, progress, plan, null);
  }

  /**
   * 子任务详情上报（对应 edict: kanban_update.py todo --detail）
   */
  async todo(taskId, todoId, title, status = 'planned', detail = '') {
    const response = await fetch(`${this.baseUrl}/api/kanban/todo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, todoId, title, status, detail })
    });
    return response.json();
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId) {
    const response = await fetch(`${this.baseUrl}/api/kanban/task/${taskId}`);
    return response.json();
  }

  /**
   * 获取所有任务
   */
  async getAllTasks() {
    const response = await fetch(`${this.baseUrl}/api/kanban/tasks`);
    return response.json();
  }
}

module.exports = { KanbanClient };
