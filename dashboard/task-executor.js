/**
 * OpenReign Pro - 增强版任务执行引擎
 * 添加 flow_log、完善9状态机、太子分拣逻辑
 */

const { EventEmitter } = require('events');

class TaskExecutor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      defaultTimeout: config.defaultTimeout || 30 * 60 * 1000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      stagnationThreshold: config.stagnationThreshold || 180 * 1000, // 180秒（3分钟）
      ...config
    };
    
    this.runningTasks = new Map();
    this.timeouts = new Map();
    this.stagnationTimers = new Map();
    this.progressTimers = new Map(); // 定期汇报定时器
    
    // 成本追踪配置
    this.costConfig = {
      tokenPricePer1K: 0.002, // 每1000 tokens $0.002
      reportInterval: 5 * 60 * 1000, // 5分钟汇报一次
    };
    
    // 9状态流转定义
    this.STATUS_FLOW = {
      pending: { next: 'taizi', from: '皇上', to: '太子', desc: '待处理旨意' },
      taizi: { next: 'zhongshu', from: '太子', to: '中书省', desc: '分拣完毕' },
      zhongshu: { next: 'menxia', from: '中书省', to: '门下省', desc: '方案提交审议' },
      menxia: { next: 'assigned', from: '门下省', to: '尚书省', desc: '准奏通过' },
      assigned: { next: 'doing', from: '尚书省', to: '六部', desc: '开始派发执行' },
      doing: { next: 'review', from: '六部', to: '尚书省', desc: '执行完成' },
      review: { next: 'completed', from: '尚书省', to: '中书省', desc: '汇总回奏' },
      completed: { next: null, from: '中书省', to: '皇上', desc: '任务完成' },
      failed: { next: null, from: '-', to: '-', desc: '任务失败' },
      cancelled: { next: null, from: '-', to: '-', desc: '任务取消' }
    };
  }

  /**
   * 太子分拣 - 识别用户意图
   * @param {string} message - 用户输入
   * @returns {Object} 分拣结果
   */
  classifyIntent(message) {
    const chatPatterns = [
      /你好/, /在吗/, /谢谢/, /再见/, /帮助/,
      /^(hi|hello|hey)$/i,
      /怎么样/, /如何/, /什么是/
    ];
    
    const isChat = chatPatterns.some(p => p.test(message));
    
    if (isChat) {
      return {
        type: 'chat',
        action: 'direct_reply',
        reason: '闲聊内容，直接回复'
      };
    }
    
    // 识别任务类型
    const taskPatterns = [
      { type: 'skill_install', pattern: /安装.*技能|添加.*技能/i },
      { type: 'skill_remove', pattern: /删除.*技能|移除.*技能/i },
      { type: 'dept_create', pattern: /新建.*部门|创建.*部门/i },
      { type: 'dept_delete', pattern: /删除.*部门|移除.*部门/i },
      { type: 'task_execute', pattern: /执行.*任务|运行.*任务/i },
      { type: 'config_update', pattern: /修改.*配置|更新.*设置/i }
    ];
    
    const matched = taskPatterns.find(t => t.pattern.test(message));
    
    return {
      type: matched ? matched.type : 'general_task',
      action: 'create_task',
      reason: matched ? `识别为: ${matched.type}` : '一般任务'
    };
  }

  /**
   * 添加流转记录
   * @param {string} taskId - 任务ID
   * @param {string} from - 来源
   * @param {string} to - 目标
   * @param {string} remark - 备注
   * @param {string} action - 动作
   */
  addFlowLog(taskId, from, to, remark, action = 'transfer') {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) return;
    
    if (!taskInfo.flow_log) {
      taskInfo.flow_log = [];
    }
    
    taskInfo.flow_log.push({
      at: new Date().toISOString(),
      from,
      to,
      remark,
      action,
      status: taskInfo.status
    });
    
    // 限制 flow_log 数量，防止内存溢出
    if (taskInfo.flow_log.length > 100) {
      taskInfo.flow_log = taskInfo.flow_log.slice(-100);
    }
  }

  /**
   * 添加进度汇报
   * @param {string} taskId - 任务ID
   * @param {string} agent - Agent标识
   * @param {string} text - 汇报内容
   * @param {Object} metadata - 元数据
   */
  addProgressLog(taskId, agent, text, metadata = {}) {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) return;
    
    if (!taskInfo.progress_log) {
      taskInfo.progress_log = [];
    }
    
    const levelConfig = this._getLevelConfig(taskInfo.currentDept);
    
    taskInfo.progress_log.push({
      at: new Date().toISOString(),
      agent,
      agentLabel: levelConfig?.name || agent,
      text,
      status: taskInfo.status,
      org: taskInfo.currentDept,
      tokens: metadata.tokens || 0,
      cost: metadata.cost || 0,
      elapsed: metadata.elapsed || 0,
      todos: metadata.todos || []
    });
  }

  _getLevelConfig(dept) {
    const configs = {
      taizi: { name: '太子', level: 0 },
      zhongshu: { name: '中书省', level: 1 },
      menxia: { name: '门下省', level: 1 },
      shangshu: { name: '尚书省', level: 1 },
      libu: { name: '吏部', level: 2 },
      hubu: { name: '户部', level: 2 },
      libu2: { name: '礼部', level: 2 },
      bingbu: { name: '兵部', level: 2 },
      xingbu: { name: '刑部', level: 2 },
      gongbu: { name: '工部', level: 2 }
    };
    return configs[dept] || { name: dept, level: 3 };
  }

  /**
   * 状态流转
   * @param {string} taskId - 任务ID
   * @param {string} newStatus - 新状态
   * @param {Object} data - 附加数据
   */
  transition(taskId, newStatus, data = {}) {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) return false;
    
    const oldStatus = taskInfo.status;
    const flowDef = this.STATUS_FLOW[oldStatus];
    
    // 验证流转是否合法
    if (flowDef && flowDef.next !== newStatus && newStatus !== 'failed' && newStatus !== 'cancelled') {
      console.warn(`[TaskExecutor] 非法状态流转: ${oldStatus} -> ${newStatus}`);
      return false;
    }
    
    // 更新状态
    taskInfo.status = newStatus;
    taskInfo.currentDept = this._getDeptFromStatus(newStatus);
    Object.assign(taskInfo, data);
    
    // 记录流转日志
    if (flowDef) {
      this.addFlowLog(taskId, flowDef.from, flowDef.to, flowDef.desc, 'transition');
    }
    
    // 触发事件
    this.emit('task:status', { 
      taskId, 
      status: newStatus, 
      prevStatus: oldStatus,
      data 
    });
    
    return true;
  }

  _getDeptFromStatus(status) {
    const map = {
      taizi: 'taizi',
      zhongshu: 'zhongshu',
      menxia: 'menxia',
      assigned: 'shangshu',
      doing: 'liubu',
      review: 'shangshu',
      completed: 'zhongshu'
    };
    return map[status] || status;
  }

  /**
   * 执行任务（完整9状态流程）
   */
  async execute(task) {
    const taskId = task.id || `TASK-${Date.now()}`;
    
    console.log(`[TaskExecutor] 开始执行任务: ${taskId}`);
    
    // 初始化任务
    this.runningTasks.set(taskId, {
      id: taskId,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
      flow_log: [],
      progress_log: [],
      reviewRound: 0,
      subtasks: [],
      results: {},
      currentDept: null,
      retries: 0,
      lastProgressTime: Date.now(),
      metadata: task
    });

    // 记录初始流转
    this.addFlowLog(taskId, '皇上', '太子', `下旨: ${task.description || task.type}`, 'create');
    
    // 启动定期汇报
    this._startProgressReporting(taskId);
    
    this.emit('task:start', { taskId, task });

    try {
      // Step 1: Pending -> Taizi (太子分拣)
      this.transition(taskId, 'taizi');
      const intent = this.classifyIntent(task.description || '');
      
      if (intent.type === 'chat') {
        // 闲聊直接完成
        this.transition(taskId, 'completed', { 
          result: { type: 'chat', message: '直接回复用户' }
        });
        return this._getFinalResult(taskId);
      }
      
      await this._simulateWork(500);
      this.addProgressLog(taskId, 'taizi', `分拣完成: ${intent.reason}`, { elapsed: 500 });
      
      // Step 2: Taizi -> Zhongshu (中书规划)
      this.transition(taskId, 'zhongshu');
      const plan = await this._planTask(task);
      this.addProgressLog(taskId, 'zhongshu', `方案规划完成: ${plan.summary}`, { elapsed: 2000 });
      
      // Step 3: Zhongshu -> Menxia (门下审议)
      let approved = false;
      const maxRounds = 3;
      
      while (!approved && this.runningTasks.get(taskId).reviewRound < maxRounds) {
        this.runningTasks.get(taskId).reviewRound++;
        const round = this.runningTasks.get(taskId).reviewRound;
        
        this.transition(taskId, 'menxia', { reviewRound: round });
        const review = await this._reviewPlan(plan, round);
        
        if (review.approved) {
          approved = true;
          this.addFlowLog(taskId, '门下省', '尚书省', `✅ 准奏通过（第${round}轮）`, 'approve');
          this.addProgressLog(taskId, 'menxia', `审议通过: ${review.notes}`, { elapsed: 1500 });
        } else {
          this.addFlowLog(taskId, '门下省', '中书省', `🚫 封驳（第${round}轮）: ${review.reason}`, 'reject');
          this.addProgressLog(taskId, 'menxia', `封驳原因: ${review.reason}`, { elapsed: 1500 });
          
          if (round < maxRounds) {
            // 返回中书修改
            this.transition(taskId, 'zhongshu');
            await this._revisePlan(plan, review.suggestions);
            this.addProgressLog(taskId, 'zhongshu', `方案修订完成`, { elapsed: 1500 });
          }
        }
      }
      
      if (!approved) {
        throw new Error(`门下省审议未通过，已达最大重试次数(${maxRounds}轮)`);
      }
      
      // Step 4: Menxia -> Assigned -> Doing (尚书派发 + 六部执行)
      this.transition(taskId, 'assigned');
      this.addProgressLog(taskId, 'shangshu', `开始派发执行`, { elapsed: 500 });
      
      this.transition(taskId, 'doing');
      const execResult = await this._executeSubtasks(taskId, plan.subtasks);
      
      // Step 5: Doing -> Review (尚书汇总)
      this.transition(taskId, 'review');
      const summary = await this._aggregateResults(execResult);
      this.addProgressLog(taskId, 'shangshu', `执行汇总: ${summary}`, { elapsed: 1000 });
      
      // Step 6: Review -> Completed (中书回奏)
      this.transition(taskId, 'completed');
      this.addFlowLog(taskId, '中书省', '皇上', '任务完成，回奏', 'complete');
      this.addProgressLog(taskId, 'zhongshu', `回奏皇上: 任务已完成`, { elapsed: 500 });
      
      this.emit('task:complete', { taskId, result: execResult });
      
      return this._getFinalResult(taskId);
      
    } catch (error) {
      console.error(`[TaskExecutor] 任务失败: ${taskId}`, error);
      this.transition(taskId, 'failed', { error: error.message });
      this.emit('task:fail', { taskId, error: error.message });
      
      return this._getFinalResult(taskId, true);
    }
  }

  _getFinalResult(taskId, isError = false) {
    const taskInfo = this.runningTasks.get(taskId);
    return {
      taskId,
      status: taskInfo.status,
      flow_log: taskInfo.flow_log,
      progress_log: taskInfo.progress_log,
      reviewRound: taskInfo.reviewRound,
      duration: Date.now() - taskInfo.startTime,
      error: isError ? taskInfo.error : undefined
    };
  }

  // 模拟方法
  async _simulateWork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async _planTask(task) {
    return {
      summary: '任务规划方案',
      subtasks: [
        { id: 'sub-1', dept: 'bingbu', desc: '执行主要工作' },
        { id: 'sub-2', dept: 'xingbu', desc: '测试验证' }
      ]
    };
  }

  async _reviewPlan(plan, round) {
    // 模拟：第1轮可能封驳，第2轮通过
    if (round === 1 && Math.random() > 0.7) {
      return {
        approved: false,
        reason: '方案不完整，需补充细节',
        suggestions: ['补充测试用例', '完善错误处理']
      };
    }
    return { approved: true, notes: '方案可行' };
  }

  async _revisePlan(plan, suggestions) {
    return { ...plan, revised: true, suggestions };
  }

  async _executeSubtasks(taskId, subtasks) {
    // 模拟并行执行
    await this._simulateWork(2000);
    return { success: true, completed: subtasks.length };
  }

  async _aggregateResults(results) {
    return `完成 ${results.completed} 个子任务`;
  }

  // 公共API
  getTaskStatus(taskId) {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) return null;
    
    return {
      taskId: taskInfo.id,
      status: taskInfo.status,
      progress: taskInfo.progress,
      currentDept: taskInfo.currentDept,
      reviewRound: taskInfo.reviewRound,
      flow_log: taskInfo.flow_log,
      progress_log: taskInfo.progress_log.slice(-10), // 最近10条
      duration: Date.now() - taskInfo.startTime
    };
  }

  getRunningTasks() {
    return Array.from(this.runningTasks.values()).map(t => ({
      taskId: t.id,
      status: t.status,
      currentDept: t.currentDept,
      duration: Date.now() - t.startTime
    }));
  }

  cancel(taskId) {
    const taskInfo = this.runningTasks.get(taskId);
    if (taskInfo) {
      this.transition(taskId, 'cancelled');
      this.addFlowLog(taskId, '-', '-', '任务被取消', 'cancel');
      this._cleanup(taskId);
      return true;
    }
    return false;
  }

  _cleanup(taskId) {
    // 清理定期汇报定时器
    if (this.progressTimers.has(taskId)) {
      clearInterval(this.progressTimers.get(taskId));
      this.progressTimers.delete(taskId);
    }
    // 清理停滞检测定时器
    if (this.stagnationTimers.has(taskId)) {
      clearInterval(this.stagnationTimers.get(taskId));
      this.stagnationTimers.delete(taskId);
    }
    this.runningTasks.delete(taskId);
  }

  /**
   * 启动定期汇报
   * @param {string} taskId - 任务ID
   */
  _startProgressReporting(taskId) {
    const timer = setInterval(() => {
      const taskInfo = this.runningTasks.get(taskId);
      if (!taskInfo) {
        clearInterval(timer);
        return;
      }
      
      // 自动汇报当前状态
      this.addProgressLog(taskId, taskInfo.currentDept, 
        `定期汇报: 任务运行中，当前状态 ${taskInfo.status}，进度 ${taskInfo.progress}%`,
        { 
          elapsed: Date.now() - taskInfo.startTime,
          tokens: taskInfo.totalTokens || 0,
          cost: taskInfo.totalCost || 0
        }
      );
      
      // 触发定期汇报事件
      this.emit('task:progress', {
        taskId,
        status: taskInfo.status,
        progress: taskInfo.progress,
        duration: Date.now() - taskInfo.startTime
      });
    }, this.costConfig.reportInterval);
    
    this.progressTimers.set(taskId, timer);
  }

  /**
   * 记录成本消耗
   * @param {string} taskId - 任务ID
   * @param {number} tokens - 消耗的tokens
   * @param {string} model - 使用的模型
   */
  recordCost(taskId, tokens, model = 'default') {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) return;
    
    // 不同模型不同价格
    const modelPrices = {
      'gpt-4': 0.03,
      'gpt-3.5': 0.002,
      'claude': 0.008,
      'default': 0.002
    };
    
    const price = modelPrices[model] || modelPrices.default;
    const cost = (tokens / 1000) * price;
    
    // 累计成本
    taskInfo.totalTokens = (taskInfo.totalTokens || 0) + tokens;
    taskInfo.totalCost = (taskInfo.totalCost || 0) + cost;
    
    // 记录到进度日志
    this.addProgressLog(taskId, 'system', 
      `成本记录: ${tokens} tokens, $${cost.toFixed(4)}`,
      { tokens, cost, model }
    );
  }

  /**
   * 多视图看板API - 获取任务列表（支持筛选）
   * @param {Object} filters - 筛选条件
   * @returns {Array} 任务列表
   */
  getTasksByView(filters = {}) {
    const tasks = Array.from(this.runningTasks.values());
    
    // 视图1: 全部任务
    if (!filters.view || filters.view === 'all') {
      return tasks.map(t => this._formatTaskForView(t));
    }
    
    // 视图2: 按状态筛选
    if (filters.status) {
      return tasks
        .filter(t => t.status === filters.status)
        .map(t => this._formatTaskForView(t));
    }
    
    // 视图3: 按部门筛选
    if (filters.dept) {
      return tasks
        .filter(t => t.currentDept === filters.dept)
        .map(t => this._formatTaskForView(t));
    }
    
    // 视图4: 按优先级筛选
    if (filters.priority) {
      return tasks
        .filter(t => (t.metadata?.priority || 'normal') === filters.priority)
        .map(t => this._formatTaskForView(t));
    }
    
    // 视图5: 运行中任务
    if (filters.view === 'running') {
      const runningStatuses = ['taizi', 'zhongshu', 'menxia', 'assigned', 'doing', 'review'];
      return tasks
        .filter(t => runningStatuses.includes(t.status))
        .map(t => this._formatTaskForView(t));
    }
    
    // 视图6: 需要关注（停滞或失败）
    if (filters.view === 'attention') {
      return tasks
        .filter(t => t.status === 'failed' || this._isStagnant(t))
        .map(t => this._formatTaskForView(t));
    }
    
    // 视图7: 最近完成
    if (filters.view === 'recent') {
      return tasks
        .filter(t => t.status === 'completed')
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 10)
        .map(t => this._formatTaskForView(t));
    }
    
    return tasks.map(t => this._formatTaskForView(t));
  }

  _formatTaskForView(taskInfo) {
    return {
      taskId: taskInfo.id,
      status: taskInfo.status,
      currentDept: taskInfo.currentDept,
      progress: taskInfo.progress,
      reviewRound: taskInfo.reviewRound,
      duration: Date.now() - taskInfo.startTime,
      totalTokens: taskInfo.totalTokens || 0,
      totalCost: taskInfo.totalCost || 0,
      lastProgressAt: taskInfo.progress_log?.[taskInfo.progress_log.length - 1]?.at,
      flowCount: taskInfo.flow_log?.length || 0,
      progressCount: taskInfo.progress_log?.length || 0
    };
  }

  _isStagnant(taskInfo) {
    const stagnationThreshold = this.config.stagnationThreshold;
    return Date.now() - taskInfo.lastProgressTime > stagnationThreshold;
  }

  /**
   * 获取任务成本统计
   * @param {string} taskId - 任务ID
   * @returns {Object} 成本统计
   */
  getTaskCost(taskId) {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) return null;
    
    return {
      taskId: taskInfo.id,
      totalTokens: taskInfo.totalTokens || 0,
      totalCost: taskInfo.totalCost || 0,
      duration: Date.now() - taskInfo.startTime,
      costPerMinute: taskInfo.totalCost / ((Date.now() - taskInfo.startTime) / 60000),
      progressCount: taskInfo.progress_log?.length || 0
    };
  }
}

module.exports = { TaskExecutor };
