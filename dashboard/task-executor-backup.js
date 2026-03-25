/**
 * OpenReign Pro - 任务执行引擎
 * 实现三省六部任务流转、超时控制、并行执行
 */

const { EventEmitter } = require('events');

class TaskExecutor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      defaultTimeout: config.defaultTimeout || 30 * 60 * 1000, // 30分钟
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000, // 5秒
      stagnationThreshold: config.stagnationThreshold || 10 * 60 * 1000, // 10分钟无进度视为停滞
      ...config
    };
    
    this.runningTasks = new Map(); // taskId -> taskInfo
    this.timeouts = new Map();     // taskId -> timeoutId
    this.checkpoints = new Map();  // taskId -> checkpointData
    this.stagnationTimers = new Map(); // taskId -> timerId
  }

  /**
   * 执行任务（完整流程）
   * @param {Object} task - 任务定义
   * @returns {Promise<Object>} 执行结果
   */
  async execute(task) {
    const taskId = task.id || `TASK-${Date.now()}`;
    
    console.log(`[TaskExecutor] 开始执行任务: ${taskId}`);
    
    // 初始化任务状态
    this.runningTasks.set(taskId, {
      id: taskId,
      status: 'taizi', // 从太子开始
      progress: 0,
      startTime: Date.now(),
      subtasks: [],
      results: {},
      currentDept: null,
      retries: 0,
      lastProgressTime: Date.now()
    });

    this.emit('task:start', { taskId, task });

    try {
      // Step 1: 太子分拣（模拟）
      await this._runPhase(taskId, 'taizi', 1000);
      
      // Step 2: 中书省规划
      const plan = await this._runPhase(taskId, 'zhongshu', 2000, () => 
        this._planTask(task)
      );
      
      // Step 3: 门下省审议（模拟，支持封驳）
      let approved = false;
      let reviewRound = 0;
      const maxReviewRounds = 3;
      
      while (!approved && reviewRound < maxReviewRounds) {
        reviewRound++;
        const reviewResult = await this._runPhase(taskId, 'menxia', 1500, () =>
          this._reviewPlan(plan, reviewRound)
        );
        
        if (reviewResult.approved) {
          approved = true;
          console.log(`[TaskExecutor] ${taskId} 门下省准奏（第${reviewRound}轮）`);
        } else {
          console.log(`[TaskExecutor] ${taskId} 门下省封驳（第${reviewRound}轮）: ${reviewResult.reason}`);
          // 中书省修改方案
          await this._runPhase(taskId, 'zhongshu', 1500, () =>
            this._revisePlan(plan, reviewResult.suggestions)
          );
        }
      }
      
      if (!approved) {
        throw new Error('门下省审议未通过，已达最大重试次数');
      }
      
      // Step 4: 尚书省派发 + 六部并行执行
      await this._runPhase(taskId, 'shangshu', 1000);
      
      const executionResult = await this._executeSubtasksParallel(taskId, plan.subtasks);
      
      // Step 5: 尚书省汇总
      await this._runPhase(taskId, 'review', 1000, () =>
        this._aggregateResults(executionResult)
      );
      
      // Step 6: 中书省回奏
      const finalResult = await this._runPhase(taskId, 'completed', 1000, () =>
        this._generateReport(taskId, executionResult)
      );
      
      this.emit('task:complete', { taskId, result: finalResult });
      
      return {
        taskId,
        status: 'completed',
        result: finalResult,
        duration: Date.now() - this.runningTasks.get(taskId).startTime
      };
      
    } catch (error) {
      console.error(`[TaskExecutor] 任务执行失败: ${taskId}`, error);
      this._updateTaskStatus(taskId, 'failed', { error: error.message });
      this.emit('task:fail', { taskId, error: error.message });
      
      return {
        taskId,
        status: 'failed',
        error: error.message,
        duration: Date.now() - this.runningTasks.get(taskId).startTime
      };
    } finally {
      this._cleanup(taskId);
    }
  }

  /**
   * 执行阶段（带超时控制）
   */
  async _runPhase(taskId, phase, duration, action) {
    this._updateTaskStatus(taskId, phase);
    console.log(`[TaskExecutor] ${taskId} 进入阶段: ${phase}`);
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`阶段 ${phase} 超时`));
      }, this.config.defaultTimeout);
      this.timeouts.set(`${taskId}:${phase}`, timeoutId);
    });
    
    // 设置停滞检测
    this._startStagnationDetection(taskId);
    
    try {
      const actionPromise = action ? action() : this._simulateWork(duration);
      const result = await Promise.race([actionPromise, timeoutPromise]);
      
      // 清除超时
      this._clearTimeout(taskId, phase);
      this._updateProgress(taskId);
      
      return result;
    } catch (error) {
      this._clearTimeout(taskId, phase);
      throw error;
    }
  }

  /**
   * 并行执行六部子任务
   */
  async _executeSubtasksParallel(taskId, subtasks) {
    console.log(`[TaskExecutor] ${taskId} 并行执行 ${subtasks.length} 个子任务`);
    
    this._updateTaskStatus(taskId, 'doing');
    
    // 按部门分组
    const deptGroups = this._groupByDepartment(subtasks);
    
    // 并行执行各部门任务
    const promises = Object.entries(deptGroups).map(([dept, tasks]) =>
      this._executeDepartmentTasks(taskId, dept, tasks)
    );
    
    const results = await Promise.allSettled(promises);
    
    // 汇总结果
    const summary = {
      success: [],
      failed: [],
      total: subtasks.length
    };
    
    results.forEach((result, index) => {
      const dept = Object.keys(deptGroups)[index];
      if (result.status === 'fulfilled') {
        summary.success.push({ dept, result: result.value });
      } else {
        summary.failed.push({ dept, error: result.reason.message });
      }
    });
    
    console.log(`[TaskExecutor] ${taskId} 执行完成: ${summary.success.length}/${summary.total}`);
    
    return summary;
  }

  /**
   * 执行单个部门的任务（支持重试）
   */
  async _executeDepartmentTasks(taskId, dept, tasks) {
    const taskInfo = this.runningTasks.get(taskId);
    taskInfo.currentDept = dept;
    
    console.log(`[TaskExecutor] ${taskId} 部门 ${dept} 开始执行`);
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 模拟部门执行
        const result = await this._simulateDepartmentWork(dept, tasks);
        
        console.log(`[TaskExecutor] ${taskId} 部门 ${dept} 执行成功（第${attempt}次）`);
        return result;
        
      } catch (error) {
        console.warn(`[TaskExecutor] ${taskId} 部门 ${dept} 执行失败（第${attempt}次）: ${error.message}`);
        
        if (attempt < this.config.maxRetries) {
          console.log(`[TaskExecutor] ${taskId} 部门 ${dept} 等待重试...`);
          await this._delay(this.config.retryDelay);
        } else {
          throw new Error(`部门 ${dept} 执行失败，已达最大重试次数: ${error.message}`);
        }
      }
    }
  }

  /**
   * 任务规划（中书省）
   */
  _planTask(task) {
    // 根据任务类型自动拆解
    const subtasks = [];
    
    if (task.type === 'feature') {
      subtasks.push(
        { dept: 'bingbu', action: 'code', desc: '编写核心代码' },
        { dept: 'libu', action: 'doc', desc: '编写文档' },
        { dept: 'hubu', action: 'data', desc: '设计数据模型' },
        { dept: 'xingbu', action: 'test', desc: '测试验证' }
      );
    } else if (task.type === 'bugfix') {
      subtasks.push(
        { dept: 'bingbu', action: 'fix', desc: '修复代码' },
        { dept: 'xingbu', action: 'verify', desc: '验证修复' }
      );
    } else {
      // 默认：兵部执行
      subtasks.push({ dept: 'bingbu', action: 'execute', desc: task.description || '执行任务' });
    }
    
    return { subtasks, estimatedTime: subtasks.length * 30 * 60 * 1000 };
  }

  /**
   * 方案审议（门下省）
   */
  _reviewPlan(plan, round) {
    // 模拟审议逻辑
    const riskScore = plan.subtasks.length * 10;
    
    // 第一轮：基础审查
    if (round === 1) {
      if (riskScore > 50) {
        return {
          approved: false,
          reason: '任务复杂度过高，建议拆分',
          suggestions: ['拆分为多个小任务', '增加测试步骤']
        };
      }
    }
    
    // 第二轮：修改后审查
    if (round === 2) {
      // 模拟封驳概率
      if (Math.random() < 0.3) {
        return {
          approved: false,
          reason: '缺少回滚方案',
          suggestions: ['添加数据备份步骤']
        };
      }
    }
    
    return { approved: true };
  }

  /**
   * 修改方案（中书省）
   */
  _revisePlan(plan, suggestions) {
    // 根据建议修改方案
    if (suggestions.includes('添加数据备份步骤')) {
      plan.subtasks.unshift({ dept: 'hubu', action: 'backup', desc: '备份数据' });
    }
    return plan;
  }

  /**
   * 汇总结果（尚书省）
   */
  _aggregateResults(results) {
    return {
      successCount: results.success.length,
      failedCount: results.failed.length,
      details: results
    };
  }

  /**
   * 生成回奏报告（中书省）
   */
  _generateReport(taskId, results) {
    const taskInfo = this.runningTasks.get(taskId);
    const duration = Date.now() - taskInfo.startTime;
    
    return {
      taskId,
      status: results.failed.length === 0 ? 'success' : 'partial',
      summary: `任务执行完成，成功: ${results.success.length}/${results.total}`,
      duration: `${Math.round(duration / 1000)}秒`,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * 按部门分组任务
   */
  _groupByDepartment(subtasks) {
    return subtasks.reduce((groups, task) => {
      const dept = task.dept || 'bingbu';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(task);
      return groups;
    }, {});
  }

  /**
   * 更新任务状态
   */
  _updateTaskStatus(taskId, status, data = {}) {
    const taskInfo = this.runningTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = status;
      Object.assign(taskInfo, data);
      this.emit('task:status', { taskId, status, data });
    }
  }

  /**
   * 更新进度
   */
  _updateProgress(taskId) {
    const taskInfo = this.runningTasks.get(taskId);
    if (taskInfo) {
      taskInfo.lastProgressTime = Date.now();
      taskInfo.progress = Math.min(taskInfo.progress + 10, 100);
    }
  }

  /**
   * 停滞检测
   */
  _startStagnationDetection(taskId) {
    const timer = setInterval(() => {
      const taskInfo = this.runningTasks.get(taskId);
      if (!taskInfo) {
        clearInterval(timer);
        return;
      }
      
      const timeSinceLastProgress = Date.now() - taskInfo.lastProgressTime;
      if (timeSinceLastProgress > this.config.stagnationThreshold) {
        console.warn(`[TaskExecutor] ${taskId} 检测到停滞，${timeSinceLastProgress}ms 无进度`);
        this.emit('task:stagnation', { taskId, duration: timeSinceLastProgress });
      }
    }, 60000); // 每分钟检查一次
    
    this.stagnationTimers.set(taskId, timer);
  }

  /**
   * 清除超时
   */
  _clearTimeout(taskId, phase) {
    const key = `${taskId}:${phase}`;
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
    }
  }

  /**
   * 清理资源
   */
  _cleanup(taskId) {
    // 清除停滞检测
    const stagnationTimer = this.stagnationTimers.get(taskId);
    if (stagnationTimer) {
      clearInterval(stagnationTimer);
      this.stagnationTimers.delete(taskId);
    }
    
    // 清除所有超时
    for (const [key, timeoutId] of this.timeouts.entries()) {
      if (key.startsWith(taskId)) {
        clearTimeout(timeoutId);
        this.timeouts.delete(key);
      }
    }
    
    // 保留任务信息一段时间供查询
    setTimeout(() => {
      this.runningTasks.delete(taskId);
    }, 3600000); // 1小时后清理
  }

  /**
   * 取消任务
   */
  cancel(taskId) {
    console.log(`[TaskExecutor] 取消任务: ${taskId}`);
    this._updateTaskStatus(taskId, 'cancelled');
    this._cleanup(taskId);
    this.emit('task:cancel', { taskId });
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    return this.runningTasks.get(taskId);
  }

  /**
   * 获取所有运行中任务
   */
  getRunningTasks() {
    return Array.from(this.runningTasks.values());
  }

  // 模拟方法
  _simulateWork(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  _simulateDepartmentWork(dept, tasks) {
    const duration = 2000 + Math.random() * 3000; // 2-5秒
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟5%失败率
        if (Math.random() < 0.05) {
          reject(new Error(`${dept} 执行出错`));
        } else {
          resolve({ dept, tasks: tasks.length, completed: true });
        }
      }, duration);
    });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TaskExecutor };
