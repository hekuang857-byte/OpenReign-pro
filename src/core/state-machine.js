/**
 * OpenReign Pro - 可扩展状态机
 * 支持9状态流转 + 封驳循环 + 自定义部门
 */

class StateMachine {
  constructor(config = {}) {
    // 合并默认配置和用户配置
    this.config = {
      // 核心状态定义
      states: {
        pending: { 
          name: '待受理', 
          desc: '等待太子分拣',
          terminal: false,
          editable: false
        },
        taizi: { 
          name: '太子分拣', 
          desc: '识别任务复杂度',
          terminal: false,
          editable: false
        },
        zhongshu: { 
          name: '中书规划', 
          desc: '方案设计与拆解',
          terminal: false,
          editable: false
        },
        menxia: { 
          name: '门下审议', 
          desc: '审核与封驳',
          terminal: false,
          editable: false
        },
        assigned: { 
          name: '已派发', 
          desc: '尚书省已派发',
          terminal: false,
          editable: false
        },
        doing: { 
          name: '执行中', 
          desc: '六部执行中',
          terminal: false,
          editable: false
        },
        review: { 
          name: '汇总审核', 
          desc: '尚书省汇总',
          terminal: false,
          editable: false
        },
        completed: { 
          name: '已完成', 
          desc: '任务完成',
          terminal: true,
          editable: false
        },
        cancelled: { 
          name: '已取消', 
          desc: '任务已取消',
          terminal: true,
          editable: false
        },
        // 用户可添加自定义状态
        ...config.customStates
      },
      
      // 状态流转规则
      transitions: {
        pending: { 
          next: ['taizi'], 
          allowedFrom: [],
          auto: true 
        },
        taizi: { 
          next: ['zhongshu', 'completed'],  // 闲聊直接完成
          allowedFrom: ['pending'],
          condition: 'classifyResult'
        },
        zhongshu: { 
          next: ['menxia'],
          allowedFrom: ['taizi', 'menxia'],  // 支持封驳后返回
          action: 'plan',
          onEnter: 'startPlanning',
          onExit: 'finishPlanning'
        },
        menxia: { 
          next: ['assigned', 'zhongshu'],  // 准奏 或 封驳
          allowedFrom: ['zhongshu'],
          condition: 'reviewResult',
          maxRounds: 3,  // 最多3轮审议
          onEnter: 'startReview',
          onApprove: 'approvePlan',
          onReject: 'rejectPlan'
        },
        assigned: { 
          next: ['doing'],
          allowedFrom: ['menxia'],
          action: 'dispatch',
          onEnter: 'dispatchTask'
        },
        doing: { 
          next: ['review'],
          allowedFrom: ['assigned'],
          action: 'execute',
          onEnter: 'startExecution',
          onExit: 'finishExecution'
        },
        review: { 
          next: ['completed', 'menxia'],  // 完成 或 打回修改
          allowedFrom: ['doing'],
          condition: 'finalReview',
          onEnter: 'startFinalReview'
        },
        completed: { 
          next: [],
          allowedFrom: ['review', 'taizi'],
          terminal: true,
          onEnter: 'completeTask'
        },
        cancelled: { 
          next: [],
          allowedFrom: ['pending', 'taizi', 'zhongshu', 'menxia', 'assigned', 'doing', 'review'],
          terminal: true,
          onEnter: 'cancelTask'
        },
        // 用户可添加自定义流转
        ...config.customTransitions
      },
      
      // 部门配置（支持扩展）
      departments: {
        // 核心部门
        taizi: { level: 1, category: 'core', required: true },
        zhongshu: { level: 2, category: 'core', required: true },
        menxia: { level: 2, category: 'core', required: true },
        shangshu: { level: 2, category: 'core', required: true },
        
        // 执行部门
        libu: { level: 3, category: 'execution', role: '人事与技能' },
        bingbu: { level: 3, category: 'execution', role: '代码执行' },
        hubu: { level: 3, category: 'execution', role: '数据管理' },
        'libu-justice': { level: 3, category: 'execution', role: '文档处理' },
        xingbu: { level: 3, category: 'execution', role: '安全审计' },
        gongbu: { level: 3, category: 'execution', role: '部署运维' },
        
        // 用户自定义部门
        ...config.customDepartments
      },
      
      // 权限矩阵
      permissions: {
        taizi: { canCall: ['zhongshu'], cannotCall: ['menxia', 'shangshu', 'liubu'] },
        zhongshu: { canCall: ['menxia', 'shangshu'], cannotCall: ['taizi', 'liubu'] },
        menxia: { canCall: ['shangshu', 'zhongshu'], cannotCall: ['taizi', 'liubu'] },
        shangshu: { canCall: ['libu', 'bingbu', 'hubu', 'libu-justice', 'xingbu', 'gongbu'], cannotCall: ['taizi', 'zhongshu', 'menxia'] },
        // 执行部门只能被尚书省调用
        libu: { canCall: [], cannotCall: ['all'], callableBy: ['shangshu'] },
        bingbu: { canCall: [], cannotCall: ['all'], callableBy: ['shangshu'] },
        hubu: { canCall: [], cannotCall: ['all'], callableBy: ['shangshu'] },
        'libu-justice': { canCall: [], cannotCall: ['all'], callableBy: ['shangshu'] },
        xingbu: { canCall: [], cannotCall: ['all'], callableBy: ['shangshu'] },
        gongbu: { canCall: [], cannotCall: ['all'], callableBy: ['shangshu'] },
        // 用户自定义权限
        ...config.customPermissions
      },
      
      // 回调函数
      callbacks: config.callbacks || {}
    };
    
    // 初始化任务存储
    this.tasks = new Map();
  }
  
  /**
   * 创建任务
   */
  createTask(taskData) {
    const taskId = this.generateTaskId();
    const task = {
      id: taskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      flowLog: [{
        from: '皇上',
        to: '太子',
        status: 'pending',
        action: 'create',
        at: new Date().toISOString(),
        note: taskData.description || '新旨意'
      }],
      reviewRounds: 0,
      maxReviewRounds: this.config.transitions.menxia.maxRounds,
      ...taskData
    };
    
    this.tasks.set(taskId, task);
    
    // 自动流转到 taizi
    this.transition(taskId, 'taizi', { note: '太子接旨分拣' });
    
    return task;
  }
  
  /**
   * 状态流转
   */
  transition(taskId, newStatus, data = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }
    
    const oldStatus = task.status;
    const transition = this.config.transitions[oldStatus];
    
    // 验证流转是否合法
    if (!transition.next.includes(newStatus)) {
      throw new Error(`非法状态流转: ${oldStatus} -> ${newStatus}`);
    }
    
    // 检查审议轮次限制（门下省封驳）
    if (oldStatus === 'menxia' && newStatus === 'zhongshu') {
      if (task.reviewRounds >= task.maxReviewRounds) {
        throw new Error(`已达最大审议轮次 (${task.maxReviewRounds})，无法继续封驳`);
      }
      task.reviewRounds++;
    }
    
    // 执行退出回调
    if (transition.onExit) {
      this.executeCallback(transition.onExit, task, data);
    }
    
    // 更新状态
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    
    // 记录流转日志
    const stateInfo = this.config.states[newStatus];
    task.flowLog.push({
      from: this.config.states[oldStatus].name,
      to: stateInfo.name,
      status: newStatus,
      action: data.action || 'transition',
      at: new Date().toISOString(),
      note: data.note || stateInfo.desc,
      round: task.reviewRounds > 0 ? task.reviewRounds : undefined
    });
    
    // 执行进入回调
    const newTransition = this.config.transitions[newStatus];
    if (newTransition.onEnter) {
      this.executeCallback(newTransition.onEnter, task, data);
    }
    
    // 特殊回调
    if (newStatus === 'menxia' && data.reviewResult === 'approve' && newTransition.onApprove) {
      this.executeCallback(newTransition.onApprove, task, data);
    }
    if (newStatus === 'menxia' && data.reviewResult === 'reject' && newTransition.onReject) {
      this.executeCallback(newTransition.onReject, task, data);
    }
    
    return task;
  }
  
  /**
   * 执行回调
   */
  executeCallback(callbackName, task, data) {
    const callback = this.config.callbacks[callbackName];
    if (typeof callback === 'function') {
      callback(task, data);
    }
  }
  
  /**
   * 取消任务
   */
  cancel(taskId, reason = '') {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }
    
    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new Error(`任务已终态，无法取消`);
    }
    
    return this.transition(taskId, 'cancelled', { 
      action: 'cancel',
      note: reason || '任务被取消'
    });
  }
  
  /**
   * 封驳（门下省打回中书省）
   */
  reject(taskId, reason) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }
    
    if (task.status !== 'menxia') {
      throw new Error(`只能在门下省审议阶段封驳`);
    }
    
    return this.transition(taskId, 'zhongshu', {
      action: 'reject',
      reviewResult: 'reject',
      note: `封驳: ${reason}`
    });
  }
  
  /**
   * 准奏（门下省通过）
   */
  approve(taskId, note = '') {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }
    
    if (task.status !== 'menxia') {
      throw new Error(`只能在门下省审议阶段准奏`);
    }
    
    return this.transition(taskId, 'assigned', {
      action: 'approve',
      reviewResult: 'approve',
      note: note || '准奏通过'
    });
  }
  
  /**
   * 获取任务状态
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }
  
  /**
   * 获取所有任务
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }
  
  /**
   * 按状态筛选任务
   */
  getTasksByStatus(status) {
    return this.getAllTasks().filter(t => t.status === status);
  }
  
  /**
   * 获取运行中任务
   */
  getRunningTasks() {
    const runningStates = ['taizi', 'zhongshu', 'menxia', 'assigned', 'doing', 'review'];
    return this.getAllTasks().filter(t => runningStates.includes(t.status));
  }
  
  /**
   * 验证部门调用权限
   */
  canCall(fromDept, toDept) {
    const perm = this.config.permissions[fromDept];
    if (!perm) return false;
    
    // 检查是否明确禁止
    if (perm.cannotCall.includes('all')) return false;
    if (perm.cannotCall.includes(toDept)) return false;
    
    // 检查是否允许
    if (perm.canCall.includes(toDept)) return true;
    
    // 检查目标部门是否允许被调用
    const targetPerm = this.config.permissions[toDept];
    if (targetPerm && targetPerm.callableBy) {
      return targetPerm.callableBy.includes(fromDept);
    }
    
    return false;
  }
  
  /**
   * 生成任务ID
   */
  generateTaskId() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(this.tasks.size + 1).padStart(3, '0');
    return `JJC-${dateStr}-${seq}`;
  }
  
  /**
   * 添加自定义部门
   */
  addDepartment(deptId, config) {
    this.config.departments[deptId] = {
      level: 3,
      category: 'execution',
      ...config
    };
    
    // 默认权限：只能被尚书省调用
    this.config.permissions[deptId] = {
      canCall: [],
      cannotCall: ['all'],
      callableBy: ['shangshu']
    };
    
    return this;
  }
  
  /**
   * 添加自定义状态
   */
  addState(stateId, config) {
    this.config.states[stateId] = {
      terminal: false,
      editable: true,
      ...config
    };
    return this;
  }
  
  /**
   * 添加自定义流转
   */
  addTransition(fromState, toState, config = {}) {
    if (!this.config.transitions[fromState]) {
      this.config.transitions[fromState] = { next: [], allowedFrom: [] };
    }
    
    if (!this.config.transitions[fromState].next.includes(toState)) {
      this.config.transitions[fromState].next.push(toState);
    }
    
    Object.assign(this.config.transitions[fromState], config);
    return this;
  }
  
  /**
   * 获取状态机信息
   */
  getInfo() {
    return {
      states: Object.keys(this.config.states).length,
      departments: Object.keys(this.config.departments).length,
      runningTasks: this.getRunningTasks().length,
      totalTasks: this.tasks.size
    };
  }
}

module.exports = { StateMachine };

// 测试
if (require.main === module) {
  const sm = new StateMachine();
  
  console.log('=== 状态机测试 ===\n');
  
  // 1. 创建任务
  const task = sm.createTask({
    description: '测试任务',
    priority: 'high'
  });
  console.log('1. 创建任务:', task.id, '- 当前状态:', task.status);
  
  // 2. 流转到中书省
  sm.transition(task.id, 'zhongshu', { note: '识别为复杂任务' });
  console.log('2. 中书省规划:', task.status);
  
  // 3. 流转到门下省
  sm.transition(task.id, 'menxia', { note: '方案提交审议' });
  console.log('3. 门下省审议:', task.status, '- 轮次:', task.reviewRounds);
  
  // 4. 封驳（第1轮）
  sm.reject(task.id, '方案不完整，需补充细节');
  console.log('4. 封驳（第1轮）:', task.status, '- 轮次:', task.reviewRounds);
  
  // 5. 再次提交
  sm.transition(task.id, 'menxia', { note: '修订后重新提交' });
  console.log('5. 再次审议:', task.status, '- 轮次:', task.reviewRounds);
  
  // 6. 准奏
  sm.approve(task.id, '方案可行，准奏');
  console.log('6. 准奏通过:', task.status);
  
  // 7. 执行
  sm.transition(task.id, 'doing', { note: '开始执行' });
  console.log('7. 执行中:', task.status);
  
  // 8. 完成
  sm.transition(task.id, 'review', { note: '执行完成' });
  sm.transition(task.id, 'completed', { note: '任务完成' });
  console.log('8. 已完成:', task.status);
  
  console.log('\n=== 流转日志 ===');
  task.flowLog.forEach((log, i) => {
    console.log(`${i + 1}. ${log.from} → ${log.to}: ${log.note}${log.round ? ` (第${log.round}轮)` : ''}`);
  });
  
  console.log('\n=== 部门扩展测试 ===');
  sm.addDepartment('zaocao', { name: '早朝官', role: '晨会汇报' });
  console.log('添加新部门 zaocao（早朝官）');
  console.log('权限验证 - shangshu 可调用 zaocao:', sm.canCall('shangshu', 'zaocao'));
  console.log('权限验证 - zhongshu 不可调用 zaocao:', !sm.canCall('zhongshu', 'zaocao'));
  
  console.log('\n状态机信息:', sm.getInfo());
}
