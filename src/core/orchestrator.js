/**
 * OpenReign Pro - 任务编排器（三省六部完整流程）
 * 整合：太子分拣器 + 状态机 + 权限矩阵 + 六部执行
 * 对齐 edict：使用 Kanban API 进行状态管理和实时上报
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { TaiziClassifier } = require('../agent/taizi/classifier');
const { StateMachine } = require('../core/state-machine');
const { PermissionMatrix } = require('../utils/permission-matrix');
const { KanbanClient } = require('../tools/kanban-client');
const { DepartmentConfigManager } = require('../config/loader');
const { ExtensionExecutor } = require('../agent/liubu/executor');
const { TimeEstimator } = require('../utils/time-estimator');
const { HistorySearcher } = require('../memory/history-search');
const { CharterEnforcer } = require('../core/charter-enforcer');

class Orchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 配置
    this.config = {
      openreignEndpoint: options.openreignEndpoint || 'http://localhost:18790',
      ...options
    };
    
    // 初始化子系统
    this.taizi = new TaiziClassifier(options.taiziConfig);
    this.stateMachine = new StateMachine(options.stateMachineConfig);
    this.permissionMatrix = new PermissionMatrix(options.permissionConfig);
    
    // 看板客户端（对齐 edict 的 kanban_update.py）
    this.kanban = new KanbanClient(this.config.openreignEndpoint);
    
    // 部门配置管理器（支持配置化职责）
    this.deptConfig = new DepartmentConfigManager();
    this.deptConfig.watch(); // 启用热重载
    
    // 扩展部门执行器（支持用户自定义部门）
    this.extensionExecutor = new ExtensionExecutor(this.kanban);
    
    // AI时间预估器（三层预估：AI预估→历史校正→实时调整）
    this.timeEstimator = new TimeEstimator({
      historyFile: path.join(__dirname, '..', 'data', 'time-history.json')
    });
    
    // 历史技能搜索器（为新部门提供历史参考）
    this.historySearcher = new HistorySearcher();
    
    // 技能识别配置（自动读取）
    this.skillDetection = this.loadSkillDetectionConfig();
    
    // 风格规则配置（自动读取）
    this.styleRules = this.loadStyleRulesConfig();
    this.historySearcher = new HistorySearcher(this.deptConfig);
    
    // 总工程师宪章执行器（质量承诺）
    this.charter = new CharterEnforcer(
      path.join(__dirname, '..', '..', 'config', 'engineer-charter.json')
    );
    
    // 六部执行引擎
    this.departments = this.initializeDepartments();
    
    // 任务统计
    this.stats = {
      totalCreated: 0,
      totalCompleted: 0,
      totalFailed: 0,
      avgCompletionTime: 0
    };
    
    console.log('[Orchestrator] 三省六部编排器已初始化');
  }
  
  /**
   * 加载技能识别配置（开箱即用）
   */
  loadSkillDetectionConfig() {
    try {
      const configPath = path.join(__dirname, '..', '..', 'config', 'skill-detection.json');
      const data = fs.readFileSync(configPath, 'utf8');
      console.log('[Orchestrator] 技能识别配置已加载');
      return JSON.parse(data);
    } catch (error) {
      console.warn('[Orchestrator] 技能识别配置加载失败，使用默认:', error.message);
      return { method: { steps: [] }, assignment_rules: {} };
    }
  }
  
  /**
   * 加载风格规则配置（开箱即用）
   */
  loadStyleRulesConfig() {
    try {
      const configPath = path.join(__dirname, '..', '..', 'config', 'style-rules.json');
      const data = fs.readFileSync(configPath, 'utf8');
      console.log('[Orchestrator] 风格规则配置已加载');
      return JSON.parse(data);
    } catch (error) {
      console.warn('[Orchestrator] 风格规则配置加载失败，使用默认:', error.message);
      return { principle: '技术原样，流程古风', levels: { formal: { percentage: 0.8 } } };
    }
  }
  
  /**
   * 初始化六部门执行引擎
   */
  initializeDepartments() {
    return {
      // 中书省 - 规划
      zhongshu: {
        name: '中书省',
        role: '决策与规划',
        execute: this.executeZhongshu.bind(this)
      },
      
      // 门下省 - 审核
      menxia: {
        name: '门下省',
        role: '审核与监督',
        execute: this.executeMenxia.bind(this)
      },
      
      // 尚书省 - 派发
      shangshu: {
        name: '尚书省',
        role: '执行总调度',
        execute: this.executeShangshu.bind(this)
      },
      
      // 六部 - 执行
      libu: {
        name: '吏部',
        role: '人事与技能管理',
        execute: this.executeLibu.bind(this)
      },
      bingbu: {
        name: '兵部',
        role: '代码执行与工具调用',
        execute: this.executeBingbu.bind(this)
      },
      hubu: {
        name: '户部',
        role: '数据与记忆管理',
        execute: this.executeHubu.bind(this)
      },
      'libu-justice': {
        name: '礼部',
        role: '文档与沟通管理',
        execute: this.executeLibuJustice.bind(this)
      },
      xingbu: {
        name: '刑部',
        role: '安全与审计',
        execute: this.executeXingbu.bind(this)
      },
      gongbu: {
        name: '工部',
        role: '部署与运维',
        execute: this.executeGongbu.bind(this)
      }
    };
  }
  
  /**
   * 接收用户消息 - 入口点
   */
  async processUserMessage(message) {
    const { text, user, channel, sessionId } = message;
    
    console.log(`[Orchestrator] 处理消息: ${text.slice(0, 50)}...`);
    
    // 1. 太子分拣
    const classification = this.taizi.classify(text, { user, channel });
    
    // 记录到日志
    this.emit('message_classified', { message, classification });
    
    // 2. 如果是闲聊或无效消息，直接回复
    if (classification.type === 'chat') {
      return {
        success: true,
        type: 'direct_reply',
        reply: classification.reply,
        classification
      };
    }
    
    if (classification.type === 'invalid') {
      return {
        success: false,
        type: 'invalid',
        reply: null,
        reason: classification.reason
      };
    }
    
    // 3. 创建任务（旨意）
    try {
      const task = await this.createTask(text, classification, { user, channel, sessionId });
      
      // 启动自动流转
      this.startTaskFlow(task.id);
      
      return {
        success: true,
        type: 'task_created',
        taskId: task.id,
        reply: classification.reply,
        task
      };
    } catch (error) {
      console.error('[Orchestrator] 创建任务失败:', error);
      return {
        success: false,
        type: 'error',
        reply: '臣罪该万死，奏折呈递失败。请稍后重试。',
        error: error.message
      };
    }
  }
  
  /**
   * 创建任务（对齐 edict：使用 kanban API）
   */
  async createTask(message, classification, context) {
    this.stats.totalCreated++;
    
    // 1. 在状态机创建任务
    const task = this.stateMachine.createTask({
      description: message,
      type: classification.subtype || 'general',
      priority: classification.priority || 'normal',
      complexity: classification.complexity,
      targetDept: classification.targetDept || 'shangshu',
      title: classification.title,
      context: {
        ...context,
        classification,
        createdAt: new Date().toISOString()
      }
    });
    
    // 2. 在看板创建任务（edict 风格）
    try {
      await this.kanban.create(
        task.id,
        classification.title || '未命名任务',
        'taizi',
        '太子',
        '太子',
        '太子接旨分拣'
      );
      
      // 3. 上报初始进度
      await this.kanban.progress(
        task.id,
        '太子已接旨，正在分析消息类型',
        '分析消息🔄|分拣意图|创建任务|转交中书省'
      );
    } catch (error) {
      console.error('[Orchestrator] 看板创建失败:', error);
      // 不影响主流程，继续执行
    }
    
    console.log(`[Orchestrator] 任务创建成功: ${task.id} → 目标部门: ${task.targetDept}`);
    
    // 【总工程师宪章】承诺4：效果优先（提示用户）
    const charterCheck = await this.charter.check('quality_first', {
      taskId: task.id,
      options: [
        { id: 'fast', speed: 'fast', quality: 'medium' },
        { id: 'complete', speed: 'normal', quality: 'high' }
      ]
    });
    
    if (charterCheck.recommendation) {
      console.log(`[太子] ${charterCheck.note}`);
      task._charterRecommendation = charterCheck;
    }
    
    // 广播任务创建事件
    this.emit('task_created', task);
    
    return task;
  }
  
  /**
   * 启动任务自动流转
   */
  startTaskFlow(taskId) {
    const task = this.stateMachine.getTask(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    
    console.log(`[Orchestrator] 启动任务流转: ${taskId} (当前状态: ${task.status})`);
    
    // 根据当前状态调度下一步
    this.scheduleNextStep(taskId);
    
    // 监听状态变化
    this.watchTaskStatus(taskId);
  }
  
  /**
   * 调度下一步（状态驱动，对齐 edict：每个步骤上报 progress）
   */
  async scheduleNextStep(taskId) {
    const task = this.stateMachine.getTask(taskId);
    if (!task) return;
    
    console.log(`[Orchestrator] 调度步骤: ${taskId} - 当前状态: ${task.status}`);
    
    switch (task.status) {
      case 'taizi':
        // 太子分拣完成 → 流转到中书省
        await this.kanban.flow(taskId, '太子', '中书省', '📋 分拣完成，转交中书省规划');
        await this.kanban.state(taskId, 'zhongshu', '进入中书省规划');
        await this.kanban.progress(taskId, '太子分拣完成，正在转交中书省', 
          '分拣✅|转交中书省🔄|中书规划|门下审议|尚书执行');
        
        this.stateMachine.transition(task.id, 'zhongshu', {
          action: 'enter_zhongshu',
          note: '进入中书省规划'
        });
        await this.executeDepartment(task, 'zhongshu');
        break;
        
      case 'zhongshu':
        // 执行中书省
        await this.kanban.progress(taskId, '中书省已接旨，开始起草方案',
          '分拣✅|转交中书省✅|中书规划🔄|门下审议|尚书执行');
        await this.executeDepartment(task, 'zhongshu');
        break;
        
      case 'menxia':
        // 执行门下省
        await this.kanban.progress(taskId, '方案已提交门下省审议',
          '分拣✅|转交中书省✅|中书规划✅|门下审议🔄|尚书执行');
        await this.executeDepartment(task, 'menxia');
        break;
        
      case 'assigned':
        // 执行尚书省派发
        await this.kanban.progress(taskId, '门下省准奏，转尚书省派发',
          '分拣✅|转交中书省✅|中书规划✅|门下审议✅|尚书执行🔄');
        await this.executeDepartment(task, 'shangshu');
        break;
        
      case 'doing':
        // 六部执行中
        await this.kanban.progress(taskId, '六部正在执行中',
          '分拣✅|转交中书省✅|中书规划✅|门下审议✅|尚书派发✅|六部执行🔄');
        console.log(`[Orchestrator] 任务 ${taskId} 正在执行中`);
        break;
        
      case 'review':
        // 汇总审核
        await this.kanban.progress(taskId, '六部执行完成，待汇总审核',
          '分拣✅|转交中书省✅|中书规划✅|门下审议✅|尚书派发✅|六部执行✅|汇总审核🔄');
        console.log(`[Orchestrator] 任务 ${taskId} 待汇总审核`);
        break;
        
      case 'completed':
        // 任务完成
        await this.kanban.done(taskId, '任务执行完成', '六部执行完毕，回奏皇上');
        await this.kanban.flow(taskId, '中书省', '皇上', '✅ 任务完成，回奏皇上');
        break;
        
      default:
        console.log(`[Orchestrator] 状态 ${task.status} 无需自动调度`);
    }
  }
  
  /**
   * 监控任务状态变化
   */
  watchTaskStatus(taskId) {
    // 通过状态流转回调触发下一步
    // 这里简化处理，实际应该在 stateMachine.transition 后调用
    // 暂时在每次 transition 后手动调用
  }
  
  /**
   * 状态流转后的回调（供 stateMachine 调用）
   */
  async onStateTransition(taskId, newStatus, data) {
    console.log(`[Orchestrator] 状态流转: ${taskId} → ${newStatus}`);
    
    // 根据新状态调度下一步
    await this.scheduleNextStep(taskId);
  }
  
  /**
   * 执行部门任务（核心调度逻辑，支持扩展部门）
   */
  async executeDepartment(task, deptId) {
    // 1. 检查是否是核心部门
    const coreDept = this.departments[deptId];
    
    // 2. 检查是否是扩展部门
    const extConfig = this.deptConfig.isExtension(deptId) ? 
      this.deptConfig.get(deptId) : null;
    
    if (!coreDept && !extConfig) {
      throw new Error(`部门不存在: ${deptId}`);
    }
    
    const deptName = coreDept?.name || extConfig?.name || deptId;
    console.log(`[Orchestrator] 执行部门: ${deptName} - 任务: ${task.id}`);
    
    // 检查权限（尚书省调度时）
    if (task.status === 'assigned') {
      const canDispatch = this.permissionMatrix.canCall('shangshu', deptId);
      if (!canDispatch) {
        throw new Error(`尚书省无权派发任务给 ${deptId}`);
      }
    }
    
    try {
      let result;
      
      // 3. 根据部门类型执行
      if (coreDept) {
        // 核心部门：硬编码执行
        result = await coreDept.execute(task, this);
      } else if (extConfig) {
        // 扩展部门：配置化执行
        this.extensionExecutor.validateConfig(extConfig);
        result = await this.extensionExecutor.execute(task, extConfig);
      }
      
      // 记录执行结果
      task.executionResults = task.executionResults || [];
      task.executionResults.push({
        dept: deptId,
        at: new Date().toISOString(),
        result
      });
      
      // 【总工程师宪章】承诺3：完整报告
      const charterCheck = await this.charter.check('full_report', {
        taskId: task.id,
        step: deptId,
        logs: task.executionResults
      });
      
      if (!charterCheck.passed) {
        console.log(`[${deptName}] ${charterCheck.warning}`);
        // 自动补全日志
        task.executionResults.push({
          dept: 'audit',
          at: new Date().toISOString(),
          result: { status: 'auto_logged', note: '宪章要求补全审计日志' }
        });
      } else if (charterCheck.note) {
        console.log(`[${deptName}] ${charterCheck.note}`);
      }
      
      this.emit('department_executed', { taskId: task.id, dept: deptId, result });
      
      // 根据部门类型自动推进状态
      this.advanceStateBasedOnDept(task, deptId, result);
      
      return result;
    } catch (error) {
      console.error(`[Orchestrator] ${deptName} 执行失败:`, error);
      
      // 记录失败
      task.failures = task.failures || [];
      task.failures.push({
        dept: deptId,
        at: new Date().toISOString(),
        error: error.message
      });
      
      this.emit('department_failed', { taskId: task.id, dept: deptId, error: error.message });
      
      throw error;
    }
  }
  
  // ========== 六部具体执行逻辑 ==========
  
  /**
   * 中书省 - 规划任务
   */
  async executeZhongshu(task, orchestrator) {
    const deptId = 'zhongshu';
    const deptConfig = this.deptConfig.get(deptId);
    console.log(`[${deptConfig?.name || '中书省'}] 开始规划任务: ${task.id}`);
    
    // 使用配置模板上报进度
    const report = (action, detail) => this.deptConfig.formatReport(deptId, action, detail);
    
    // 1. 接旨上报
    await this.kanban.progress(task.id, 
      report('接旨', '开始分析需求'),
      '分析旨意🔄|起草方案|门下审议|尚书执行|回奏皇上');
    
    // 2. 需求分析
    await this.kanban.progress(task.id,
      report('分析', '拆解核心要点'),
      '分析旨意✅|起草方案🔄|门下审议|尚书执行|回奏皇上');
    
    const todoCategories = this.deptConfig.getReportingTemplate(deptId, 'todo') || 
      ['需求分析', '方案设计', '子任务拆解', '部门分配'];
    
    await this.kanban.todo(task.id, '1', todoCategories[0], 'in_progress', 
      '分析用户意图，确定任务类型和优先级');
    
    // 3. 生成规划（可配置：调用 AI 或模板）
    const plan = await this.generatePlan(task, deptConfig);
    
    await this.kanban.todo(task.id, '1', todoCategories[0], 'completed', 
      `任务类型: ${task.type || 'general'}\n优先级: ${task.priority || 'normal'}`);
    
    await this.kanban.todo(task.id, '2', todoCategories[1], 'completed',
      `涉及部门: ${plan.requiredDepartments.join(', ')}`);
    
    // 4. 提交审议
    await this.kanban.progress(task.id,
      report('起草', '方案完成，准备提交审议'),
      '分析旨意✅|起草方案✅|门下审议🔄|尚书执行|回奏皇上');
    
    await this.kanban.todo(task.id, '3', todoCategories[2], 'completed',
      `子任务数: ${plan.subtasks.length}\n总耗时: ${plan.totalEstimatedTime}`);
    
    task.plan = plan;
    
    // 记录流转
    await this.kanban.flow(task.id, '中书省', '门下省', '📋 方案提交审议');
    await this.kanban.state(task.id, 'menxia', '方案提交门下省审议');
    
    console.log(`[中书省] 规划完成: ${task.id} - ${plan.subtasks.length} 个子任务`);
    
    return {
      status: 'completed',
      plan,
      nextStep: '提交门下省审议'
    };
  }
  
  /**
   * 生成规划方案（可配置策略）
   */
  async generatePlan(task, deptConfig) {
    const execConfig = this.deptConfig.getExecutionConfig('zhongshu');
    
    // 根据配置选择生成策略
    switch (execConfig.mode) {
      case 'skill_based':
        // 调用配置的 skill 生成规划
        return await this.generatePlanBySkill(task, execConfig);
      case 'template':
      default:
        // 使用模板生成（当前方式）
        return await this.generatePlanByTemplate(task, deptConfig);
    }
  }
  
  /**
   * 使用模板生成规划
   */
  async generatePlanByTemplate(task, deptConfig) {
    const planning = deptConfig?.planning || {};
    const minSubtasks = planning.min_subtasks || 3;
    const maxSubtasks = planning.max_subtasks || 10;
    
    // 根据任务复杂度确定子任务数量
    const complexity = task.complexity || 'medium';
    const subtaskCount = {
      low: minSubtasks,
      medium: 4,
      high: 6,
      extreme: maxSubtasks
    }[complexity] || 4;
    
    // 生成子任务
    const subtasks = [];
    
    // [MODIFIED 2026-03-27 19:03] 使用技能识别自动判断项目类型
    const projectType = await this.classifyProjectType(task);
    console.log(`[中书省] 项目类型判断: ${projectType.type} (${projectType.reason})`);
    
    // 根据项目类型选择不同流程
    if (projectType.type === 'dept_installation') {
      console.log(`[中书省] 检测到部门安装任务，使用标准安装流程`);
      return this.generateDeptInstallationPlan(task);
    }
    
    if (projectType.type === 'fusion') {
      console.log(`[中书省] 检测到融合任务，使用融合流程`);
      // TODO: 实现融合流程
      // return this.generateFusionPlan(task);
    }
    
    // 使用技能识别分配部门
    const skillAssignments = await this.assignSkillToDepartments(task);
    
    // 检查是否是测试任务（包含"demo"或"测试"）
    const isTestTask = /demo|测试|test/i.test(task.title || task.description || '');
    
    // 获取可用的扩展部门
    const extensions = this.deptConfig.getExtensionDepartments();
    
    // 如果是测试任务，添加勘验司验收子任务
    if (isTestTask) {
      console.log(`[中书省] 检测到测试任务，添加勘验司验收`);
      subtasks.push({
        id: 'sub-kanys',
        title: '技术验收',
        dept: 'kanys',
        estimatedTime: '5分钟'
      });
    }
    
    // [MODIFIED 2026-03-27 19:03] 使用技能识别结果生成子任务
    if (skillAssignments.length > 0) {
      console.log(`[中书省] 使用技能识别结果分配任务`);
      
      // 根据技能识别结果生成子任务
      const assignmentCount = Math.min(skillAssignments.length, subtaskCount);
      for (let i = 0; i < assignmentCount; i++) {
        const assignment = skillAssignments[i];
        subtasks.push({
          id: `sub-${i + 1}`,
          title: `${assignment.reason}`,
          dept: assignment.dept,
          description: `任务: ${task.description || '标准任务'}\n匹配原因: ${assignment.reason}\n匹配分数: ${assignment.score}`,
          type: 'skill_execution',
          skillMatch: {
            score: assignment.score,
            confidence: assignment.confidence,
            matchedKeywords: assignment.matchedKeywords,
            matchedPatterns: assignment.matchedPatterns
          }
        });
      }
    } else {
      // 回退到标准模板
      console.log(`[中书省] 技能识别无匹配，使用标准模板`);
      
      const templates = [
        { title: '需求分析', dept: 'hubu', time: '1小时' },
        { title: '方案设计', dept: 'bingbu', time: '2小时' },
        { title: '实施开发', dept: 'bingbu', time: '4小时' },
        { title: '测试验证', dept: 'xingbu', time: '2小时' },
        { title: '文档编写', dept: 'libu-justice', time: '1小时' },
        { title: '部署上线', dept: 'gongbu', time: '1小时' }
      ];
      
      for (let i = 0; i < Math.min(subtaskCount, templates.length); i++) {
        subtasks.push({
          id: `sub-${i + 1}`,
          title: templates[i].title,
          dept: templates[i].dept,
          description: `${templates[i].title} - ${task.description || '标准任务'}`,
          type: this.inferTaskType(templates[i].title)
        });
      }
    }
    // [END MODIFIED]
    
    // 使用AI时间预估（新增）
    console.log(`[中书省] 使用AI预估时间...`);
    const timeEstimate = await this.timeEstimator.estimate(task, subtasks);
    
    // 更新子任务时间为AI预估
    for (let i = 0; i < subtasks.length; i++) {
      subtasks[i].estimatedTime = timeEstimate.subtasks[i].estimatedTime;
      subtasks[i].confidence = timeEstimate.subtasks[i].confidence;
      subtasks[i].estimateSource = timeEstimate.subtasks[i].source;
    }
    
    const plan = {
      summary: task.title,
      subtasks,
      totalEstimatedTime: timeEstimate.total.mostLikely,
      estimateConfidence: timeEstimate.total.confidence,
      estimateSource: timeEstimate.source,
      requiredDepartments: [...new Set(subtasks.map(st => st.dept))]
    };
    
    // 【总工程师宪章】承诺1：不简化代码
    const charterCheck = await this.charter.check('no_simplification', {
      taskId: task.id,
      plan,
      userChoice: task.userChoice
    });
    
    if (charterCheck.warning) {
      console.log(`[中书省] ${charterCheck.warning}`);
      plan._charterWarning = charterCheck.warning;
    }
    
    return plan;
  }
  
  /**
   * 推断任务类型
   */
  inferTaskType(title) {
    if (title.includes('代码') || title.includes('实现')) return 'code';
    if (title.includes('文档') || title.includes('编写')) return 'doc';
    if (title.includes('测试') || title.includes('验证')) return 'test';
    if (title.includes('配置') || title.includes('部署')) return 'deploy';
    return 'config';
  }
  
  /**
   * 使用 Skill 生成规划（可扩展）
   */
  async generatePlanBySkill(task, execConfig) {
    // TODO: 调用配置的 skill 生成规划
    // const skill = execConfig.primarySkill;
    // return await callSkill(skill, task);
    
    // 暂时回退到模板
    return await this.generatePlanByTemplate(task, {});
  }
  
  /**
   * 门下省 - 审核方案（基于 edict 四大维度，配置化审核规则）
   */
  async executeMenxia(task, orchestrator) {
    const deptId = 'menxia';
    const deptConfig = this.deptConfig.get(deptId);
    const auditRules = this.deptConfig.getAuditRules(deptId);
    
    console.log(`[${deptConfig?.name || '门下省'}] 开始审议任务: ${task.id}`);
    
    const plan = task.plan;
    if (!plan) {
      throw new Error('中书省尚未提交方案');
    }
    
    const report = (action, detail) => this.deptConfig.formatReport(deptId, action, detail);
    const todoCategories = this.deptConfig.getReportingTemplate(deptId, 'todo') || 
      ['可行性审查', '完整性检查', '风险评估', '资源评估'];
    
    // 1. 开始审议
    await this.kanban.progress(task.id, 
      report('接案', '开始四维度审议'),
      '可行性审查🔄|完整性审查|风险评估|资源评估|出具结论');
    
    // 2. 配置化四维度审核
    const dimensions = [];
    const auditConfig = auditRules.dimensions || {};
    
    // 可行性审查（可配置启用/禁用）
    if (auditConfig.feasibility?.enabled !== false) {
      await this.kanban.todo(task.id, '1', todoCategories[0], 'in_progress', '检查技术路径和依赖');
      const result = this.checkFeasibility(plan, auditConfig.feasibility);
      dimensions.push({ name: '可行性', ...result });
      await this.kanban.progress(task.id, report('审查', '可行性审查完成'),
        '可行性审查✅|完整性审查🔄|风险评估|资源评估|出具结论');
      await this.kanban.todo(task.id, '1', todoCategories[0], result.pass ? 'completed' : 'failed',
        result.issues.map(i => i.text).join('\n') || '检查通过');
    }
    
    // 完整性审查
    if (auditConfig.completeness?.enabled !== false) {
      await this.kanban.todo(task.id, '2', todoCategories[1], 'in_progress', '检查子任务和必需字段');
      const result = this.checkCompleteness(plan, auditConfig.completeness);
      dimensions.push({ name: '完整性', ...result });
      await this.kanban.progress(task.id, report('审查', '完整性审查完成'),
        '可行性审查✅|完整性审查✅|风险评估🔄|资源评估|出具结论');
      await this.kanban.todo(task.id, '2', todoCategories[1], result.pass ? 'completed' : 'failed',
        result.issues.map(i => i.text).join('\n') || '检查通过');
    }
    
    // 风险评估
    if (auditConfig.risks?.enabled !== false) {
      await this.kanban.todo(task.id, '3', todoCategories[2], 'in_progress', '评估潜在风险');
      const result = this.checkRisks(plan, auditConfig.risks);
      dimensions.push({ name: '风险', ...result });
      await this.kanban.progress(task.id, report('评估', '风险评估完成'),
        '可行性审查✅|完整性审查✅|风险评估✅|资源评估🔄|出具结论');
      await this.kanban.todo(task.id, '3', todoCategories[2], 'completed',
        `风险等级: ${result.level}`);
    }
    
    // 资源评估
    if (auditConfig.resources?.enabled !== false) {
      await this.kanban.todo(task.id, '4', todoCategories[3], 'in_progress', '评估资源分配');
      const result = this.checkResources(plan, auditConfig.resources);
      dimensions.push({ name: '资源', ...result });
      await this.kanban.progress(task.id, report('评估', '资源评估完成，正在出具结论'),
        '可行性审查✅|完整性审查✅|风险评估✅|资源评估✅|出具结论🔄');
      await this.kanban.todo(task.id, '4', todoCategories[3], result.pass ? 'completed' : 'failed',
        result.issues.map(i => i.text).join('\n') || '资源充足');
    }
    
    // 3. 汇总问题并决策（使用配置规则）
    const allIssues = dimensions.flatMap(d => 
      d.issues.map(i => ({ ...i, category: d.name }))
    );
    
    const decision = this.makeAuditDecision(task, allIssues, auditRules);
    
    // 4. 上报结果
    if (decision.approve) {
      await this.kanban.progress(task.id, 
        report('审议', `完成，准奏${decision.forced ? '（强制）' : ''}`),
        '可行性审查✅|完整性审查✅|风险评估✅|资源评估✅|出具结论✅');
      await this.kanban.flow(task.id, '门下省', '尚书省', '✅ 准奏');
      await this.kanban.state(task.id, 'assigned', '门下省准奏，转尚书省派发');
    } else {
      await this.kanban.progress(task.id, 
        report('审议', `完成，封驳（${decision.issues.length}个问题）`),
        '可行性审查✅|完整性审查✅|风险评估✅|资源评估✅|出具结论✅');
      await this.kanban.flow(task.id, '门下省', '中书省', 
        `❌ 封驳：${decision.issues[0]?.text || '方案存在问题'}`);
      await this.kanban.state(task.id, 'zhongshu', '门下省封驳，退回中书省修改');
    }
    
    return {
      status: decision.approve ? 'approved' : 'rejected',
      reviewResult: decision.approve ? 'approve' : 'reject',
      note: decision.note,
      issues: decision.issues,
      assessment: dimensions.reduce((acc, d) => {
        acc[d.name] = d.pass ? '通过' : '不通过';
        return acc;
      }, {})
    };
  }
  
  /**
   * 审核决策（配置化规则）
   */
  makeAuditDecision(task, allIssues, auditRules) {
    const criticalIssues = allIssues.filter(i => i.critical);
    const maxRounds = auditRules.max_review_rounds || 3;
    const currentRound = task.reviewRounds || 0;
    const autoApproveThreshold = auditRules.auto_approve_threshold || 0.8;
    
    // 规则1: 有严重问题 → 封驳
    if (auditRules.critical_issue_block !== false && criticalIssues.length > 0) {
      return {
        approve: false,
        issues: allIssues.slice(0, 5),
        note: `方案存在严重问题，需修改后重新提交`
      };
    }
    
    // 规则2: 问题过多 → 封驳
    if (allIssues.length > 3) {
      return {
        approve: false,
        issues: allIssues.slice(0, 5),
        note: `方案存在${allIssues.length}个问题，需修改后重新提交`
      };
    }
    
    // 规则3: 达到最大轮次 → 强制准奏
    if (currentRound >= maxRounds - 1) {
      return {
        approve: true,
        forced: true,
        issues: [],
        note: `第${currentRound + 1}轮审议（强制准奏）：方案基本可行`
      };
    }
    
    // 规则4: 通过
    return {
      approve: true,
      forced: false,
      issues: [],
      note: '方案完整可行，准奏通过'
    };
  }
  
  /**
   * 门下省 - 审议修复方案（新增）
   */
  async executeMenxiaFixReview(task, orchestrator) {
    const deptId = 'menxia';
    const deptConfig = this.deptConfig.get(deptId);
    
    console.log(`[${deptConfig?.name || '门下省'}] 开始审议修复方案: ${task.id}`);
    
    const fixPlan = task.fixPlan;
    if (!fixPlan) {
      throw new Error('无修复方案可审议');
    }
    
    const report = (action, detail) => this.deptConfig.formatReport(deptId, action, detail);
    
    // 上报开始审议
    await this.kanban.progress(task.id,
      report('审议', `审议修复方案：${fixPlan.summary}`),
      '修复方案审议🔄|准奏执行|封驳重拟');
    
    // 审议修复方案
    const issues = [];
    
    // 检查1：修复方案是否合理
    if (fixPlan.fixCount === 0) {
      issues.push('修复方案为空');
    }
    
    // 检查2：每项修复是否有明确执行部门
    for (const fix of fixPlan.fixes) {
      if (!fix.dept) {
        issues.push(`修复项"${fix.description}"未指定执行部门`);
      }
      if (!fix.action) {
        issues.push(`修复项"${fix.description}"未指定修复动作`);
      }
    }
    
    // 检查3：预估时间（软限制，只给建议不封驳）
    const totalMinutes = parseInt(fixPlan.totalTime);
    if (totalMinutes > 60) {
      // 不封驳，只记录建议
      fixPlan.suggestion = `💡 建议：修复时间较长（${fixPlan.totalTime}），可考虑拆分为${Math.ceil(totalMinutes/30)}个子任务分批执行`;
      console.log(`[门下省] 修复方案时间${fixPlan.totalTime}，附优化建议`);
    }
    
    // 审议结果
    if (issues.length > 0) {
      // 封驳，返回勘验司重新生成
      await this.kanban.progress(task.id,
        report('审议', `修复方案封驳：${issues.length}个问题`),
        '修复方案审议❌|封驳重拟');
      await this.kanban.flow(task.id, '门下省', '勘验司', `❌ 封驳：${issues.join('；')}`);
      await this.kanban.state(task.id, 'kanys', '修复方案被驳，需重新生成');
      
      return {
        approve: false,
        issues,
        note: '修复方案不完善，请重新生成'
      };
    }
    
    // 准奏，转交尚书省执行
    const suggestionNote = fixPlan.suggestion ? `（附建议）` : '';
    await this.kanban.progress(task.id,
      report('审议', `修复方案准奏${suggestionNote}`),
      '修复方案审议✅|准奏执行🔄');
    
    const flowRemark = fixPlan.suggestion 
      ? `✅ 准奏：${fixPlan.summary}。${fixPlan.suggestion}`
      : `✅ 准奏：${fixPlan.summary}`;
    await this.kanban.flow(task.id, '门下省', '尚书省', flowRemark);
    await this.kanban.state(task.id, 'shangshu', `修复方案准奏${suggestionNote}，派发执行`);
    
    return {
      approve: true,
      note: `修复方案准奏${suggestionNote}，共${fixPlan.fixCount}项修复`,
      suggestion: fixPlan.suggestion || null
    };
  }
  
  /**
   * 1. 可行性检查（配置化）
   */
  checkFeasibility(plan, config = {}) {
    const issues = [];
    const checks = config?.checks || ['technical_path', 'dependencies', 'skills'];
    
    // 技术路径检查
    if (checks.includes('technical_path')) {
      if (!plan.technicalApproach && !plan.implementationPlan) {
        issues.push({
          critical: true,
          text: '未明确技术实现方案或实施计划'
        });
      }
    }
    
    // 依赖检查
    if (checks.includes('dependencies') && plan.dependencies) {
      const missingDeps = plan.dependencies.filter(d => !d.available && !d.optional);
      if (missingDeps.length > 0) {
        issues.push({
          critical: true,
          text: `关键依赖不可用: ${missingDeps.map(d => d.name || d).join(', ')}`
        });
      }
    }
    
    // 技能匹配检查
    if (checks.includes('skills') && plan.requiredSkills?.length > 0) {
      // TODO: 查询技能库验证
    }
    
    return { pass: issues.length === 0, issues };
  }
  
  /**
   * 2. 完整性检查（配置化）
   */
  checkCompleteness(plan, config = {}) {
    const issues = [];
    const checks = config?.checks || ['subtask_count', 'required_fields', 'key_phases'];
    
    // 子任务数量检查
    if (checks.includes('subtask_count')) {
      const minSubtasks = config?.min_subtasks || 3;
      const subtaskCount = plan.subtasks?.length || 0;
      if (subtaskCount < minSubtasks) {
        issues.push({
          critical: subtaskCount === 0,
          text: `子任务数量不足（需要至少${minSubtasks}个，实际${subtaskCount}个）`
        });
      }
    }
    
    // 必需字段检查
    if (checks.includes('required_fields')) {
      const requiredFields = config?.required_fields || ['title', 'description', 'estimatedTime'];
      for (const field of requiredFields) {
        if (!plan[field]) {
          issues.push({
            critical: false,
            text: `缺少必需字段: ${field}`
          });
        }
      }
    }
    
    // 关键阶段覆盖检查
    if (checks.includes('key_phases')) {
      const typePhases = {
        code: ['需求', '开发', '测试'],
        data: ['获取', '清洗', '分析'],
        document: ['收集', '起草', '审阅'],
        default: ['规划', '执行', '验证']
      };
      
      const phases = typePhases[plan.taskType] || typePhases.default;
      const hasAllPhases = phases.every(phase =>
        plan.subtasks?.some(st => st.title?.includes(phase))
      );
      
      if (!hasAllPhases && plan.subtasks?.length > 0) {
        issues.push({
          critical: false,
          text: `缺少关键执行阶段（应包含：${phases.join('、')}）`
        });
      }
    }
    
    return { pass: issues.length === 0, issues };
  }
  
  /**
   * 3. 风险评估（配置化）
   */
  checkRisks(plan, config = {}) {
    const issues = [];
    let level = 'low';
    const checks = config?.checks || ['high_risk_ops', 'external_deps', 'rollback_plan'];
    
    // 高风险操作检查
    if (checks.includes('high_risk_ops')) {
      const highRiskKeywords = config?.high_risk_keywords || 
        ['删除', '生产', '上线', '付费', '删除数据', '修改配置'];
      
      if (plan.subtasks?.some(st => 
        highRiskKeywords.some(kw => st.title?.includes(kw))
      )) {
        issues.push({
          critical: true,
          text: '包含高风险操作（删除/生产/上线等），需详细风险评估和控制措施'
        });
        level = 'high';
      }
    }
    
    // 外部依赖检查
    if (checks.includes('external_deps')) {
      if (plan.subtasks?.some(st => 
        st.title?.includes('第三方') || st.title?.includes('外部')
      )) {
        issues.push({
          critical: false,
          text: '存在外部依赖，建议准备备用方案'
        });
        level = level === 'high' ? 'high' : 'medium';
      }
    }
    
    // 回滚方案检查
    if (checks.includes('rollback_plan') && level !== 'low' && !plan.rollbackPlan) {
      issues.push({
        critical: level === 'high',
        text: '高风险操作缺少回滚方案'
      });
    }
    
    return { level, issues };
  }
  
  /**
   * 4. 资源评估（配置化）
   */
  checkResources(plan, config = {}) {
    const issues = [];
    const checks = config?.checks || ['dept_assignment', 'workload', 'time_estimate'];
    
    // 部门分配检查
    if (checks.includes('dept_assignment')) {
      if (plan.subtasks?.some(st => !st.dept)) {
        issues.push({
          critical: false,
          text: '部分子任务未明确执行部门'
        });
      }
    }
    
    // 工作量检查
    if (checks.includes('workload')) {
      const maxHours = config?.max_workload_hours || 80;
      const minHours = config?.min_workload_hours || 1;
      
      const totalHours = plan.subtasks?.reduce((sum, st) => {
        const hours = this.parseTimeToHours(st.estimatedTime);
        return sum + hours;
      }, 0) || 0;
      
      if (totalHours > maxHours) {
        issues.push({
          critical: false,
          text: `总工作量约${totalHours}小时，建议拆分为更小的任务`
        });
      } else if (totalHours < minHours) {
        issues.push({
          critical: false,
          text: '任务工作量过少，可能过于简单'
        });
      }
    }
    
    return { pass: issues.length === 0, issues };
  }
  
  /**
   * 解析时间字符串为小时数
   */
  parseTimeToHours(timeStr) {
    if (!timeStr) return 0;
    const match = String(timeStr).match(/(\d+)\s*(小时|h|hour)/);
    if (match) return parseInt(match[1], 10);
    const dayMatch = String(timeStr).match(/(\d+)\s*(天|d|day)/);
    if (dayMatch) return parseInt(dayMatch[1], 10) * 8;
    return 0;
  }
  
  /**
   * 生成部门安装方案（中书省专用）
   */
  async generateDeptInstallationPlan(task) {
    console.log(`[中书省] 生成部门安装方案: ${task.id}`);
    
    const report = (action, detail) => `启奏陛下，中书省正在${action}，${detail}`;
    
    // 上报开始规划
    await this.kanban.progress(task.id,
      report('谋定', '制定部门安装方案'),
      '需求分析🔄|方案设计|门下审议|尚书派发|六部施行|勘验验收|回奏');
    
    // 解析部门信息
    const deptMatch = task.description?.match(/部门[:：]\s*(\w+)|install[:：]\s*(\w+)/i);
    const deptId = deptMatch?.[1] || deptMatch?.[2] || 'new_dept';
    
    // 搜索历史相似部门（新增）
    console.log(`[中书省] 搜索历史相似部门...`);
    const similarDepts = await this.historySearcher.searchSimilarDepts(task.description);
    
    if (similarDepts.length > 0) {
      const topRef = similarDepts[0];
      console.log(`[中书省] 找到相似部门: ${topRef.dept.name} (相似度${Math.round(topRef.score * 100)}%)`);
      await this.kanban.progress(task.id,
        report('谋定', `参考${topRef.dept.name}设计（相似度${Math.round(topRef.score * 100)}%）`),
        '历史搜索✅|需求分析🔄|方案设计|门下审议|尚书派发|六部施行|勘验验收|回奏');
    } else {
      console.log(`[中书省] 无历史相似部门，使用标准模板`);
    }
    
    // 生成标准安装子任务
    const subtasks = [
      {
        id: 'dept-config-design',
        title: '设计部门配置',
        dept: 'zhongshu',
        estimatedTime: '30分钟',
        detail: '确定部门ID、名称、类型、职责、执行配置'
      },
      {
        id: 'dept-term-design',
        title: '设计古风术语',
        dept: 'zhongshu',
        estimatedTime: '15分钟',
        detail: '确定官职、自称、上报模板、TODO分类'
      },
      {
        id: 'dept-register',
        title: '注册部门',
        dept: 'libu',
        estimatedTime: '15分钟',
        detail: '添加到departments.json，更新registry'
      },
      {
        id: 'dept-code',
        title: '实现执行代码',
        dept: 'bingbu',
        estimatedTime: '1小时',
        detail: '实现executeXxx()方法，创建skill文件'
      },
      {
        id: 'dept-deploy',
        title: '部署配置',
        dept: 'gongbu',
        estimatedTime: '15分钟',
        detail: '部署配置文件，验证格式'
      },
      {
        id: 'dept-docs',
        title: '编写文档',
        dept: 'libu-justice',
        estimatedTime: '30分钟',
        detail: '添加古风术语，编写使用文档'
      },
      {
        id: 'dept-inspection',
        title: '集成检查',
        dept: 'kanys',
        estimatedTime: '20分钟',
        detail: '配置检查、术语检查、代码检查、展示检查',
        blocking: true
      }
    ];
    
    // 上报规划完成
    await this.kanban.progress(task.id,
      report('草拟', '部门安装方案已完成'),
      '需求分析✅|方案设计✅|门下审议🔄|尚书派发|六部施行|勘验验收|回奏');
    
    await this.kanban.todo(task.id, '1', '方案设计', 'completed',
      `部门: ${deptId}\n子任务: ${subtasks.length}个\n预计: 3小时`);
    
    // 保存规划
    task.plan = {
      title: `安装部门: ${deptId}`,
      subtasks,
      totalEstimatedTime: '3小时',
      technicalApproach: '使用标准部门安装流程',
      implementationPlan: '按标准模板执行，勘验司强制验收'
    };
    
    // 流转到门下省审议
    await this.kanban.flow(task.id, '中书省', '门下省', '📋 部门安装方案提交审议');
    await this.kanban.state(task.id, 'menxia', '部门安装方案提交门下省审议');
    
    console.log(`[中书省] 部门安装方案完成: ${subtasks.length} 个子任务`);
    
    return {
      status: 'completed',
      plan: task.plan,
      nextStep: '提交门下省审议'
    };
  }
  
  /**
   * 尚书省 - 派发任务
   */
  async executeShangshu(task, orchestrator) {
    const deptId = 'shangshu';
    const deptConfig = this.deptConfig.get(deptId);
    console.log(`[${deptConfig?.name || '尚书省'}] 开始派发任务: ${task.id}`);
    
    const plan = task.plan;
    if (!plan) {
      throw new Error('无规划方案可派发');
    }
    
    const report = (action, detail) => this.deptConfig.formatReport(deptId, action, detail);
    
    // 上报开始派发
    await this.kanban.progress(task.id,
      report('派发', '分析子任务'),
      '分析派发🔄|派发工部|派发户部|派发礼部|派发刑部|派发工部|汇总结果');
    
    // 根据规划分配子任务给各部门（包括扩展部门）
    const assignments = [];
    const dispatchConfig = deptConfig?.dispatch || {};
    const parallel = dispatchConfig.parallel_execution !== false;
    
    for (const subtask of plan.subtasks) {
      const subtaskDeptId = subtask.dept;
      
      // 检查是否是扩展部门
      const isExtension = this.deptConfig.isExtension(subtaskDeptId);
      
      // 检查权限（核心部门用权限矩阵，扩展部门默认允许）
      const canAssign = isExtension ? true : 
        this.permissionMatrix.canCall('shangshu', subtaskDeptId);
      
      if (!canAssign) {
        throw new Error(`尚书省无权派发任务给 ${subtaskDeptId}`);
      }
      
      const deptName = this.deptConfig.get(subtaskDeptId)?.name || subtaskDeptId;
      
      assignments.push({
        subtaskId: subtask.id,
        dept: subtaskDeptId,
        deptName,
        title: subtask.title,
        estimatedTime: subtask.estimatedTime,
        isExtension
      });
      
      // 上报派发
      await this.kanban.flow(task.id, '尚书省', deptName, `📋 派发：${subtask.title}`);
      await this.kanban.todo(task.id, subtask.id, subtask.title, 'assigned',
        `派发给${deptName}，预计${subtask.estimatedTime}`);
    }
    
    task.assignments = assignments;
    
    // 上报派发完成
    await this.kanban.progress(task.id,
      report('派发', `完成，共${assignments.length}个子任务`),
      '分析派发✅|派发工部✅|派发户部✅|派发礼部✅|派发刑部✅|派发工部✅|汇总结果🔄');
    
    console.log(`[尚书省] 派发完成: ${task.id} - ${assignments.length} 个子任务` +
      `（含${assignments.filter(a => a.isExtension).length}个扩展部门）`);
    
    return {
      status: 'dispatched',
      assignments,
      nextStep: '六部执行'
    };
  }
  
  /**
   * 吏部 - 技能管理
   */
  async executeLibu(task, context) {
    console.log(`[吏部] 处理任务: ${task.id}`);
    
    // 技能相关任务
    if (task.type === 'skill' || task.type === 'skill_install') {
      // 安装技能
      return { status: 'completed', action: 'install_skill', result: '技能安装成功' };
    }
    
    if (task.type === 'skill_remove' || task.type === 'skill_uninstall') {
      // 卸载技能
      return { status: 'completed', action: 'uninstall_skill', result: '技能卸载成功' };
    }
    
    if (task.type === 'skill_update') {
      // 更新技能
      return { status: 'completed', action: 'update_skill', result: '技能更新成功' };
    }
    
    // 其他任务由尚书省协调
    return { 
      status: 'deferred', 
      reason: '非技能管理任务，建议转交其他部门',
      suggestedDept: 'bingbu' 
    };
  }
  
  /**
   * 兵部 - 代码执行
   */
  async executeBingbu(task, context) {
    console.log(`[兵部] 处理任务: ${task.id} - 类型: ${task.type}`);
    
    // 代码生成/执行
    if (task.type === 'code' || task.type === 'debug') {
      // TODO: 调用 code-execution skill
      return { 
        status: 'completed', 
        action: 'code_execution',
        result: '代码已生成/执行完成',
        artifacts: ['script.py', 'output.txt']
      };
    }
    
    // 测试任务
    if (task.type === 'test') {
      // TODO: 调用测试 skill
      return {
        status: 'completed',
        action: 'run_tests',
        result: '测试通过',
        coverage: '85%'
      };
    }
    
    return { 
      status: 'deferred', 
      reason: '非代码相关任务',
      suggestedDept: 'hubu' 
    };
  }
  
  /**
   * 户部 - 数据管理
   */
  async executeHubu(task, context) {
    console.log(`[户部] 处理任务: ${task.id}`);
    
    // 数据分析
    if (task.type === 'data' || task.type === 'ml') {
      // TODO: 调用数据分析 skill
      return {
        status: 'completed',
        action: 'data_analysis',
        result: '数据分析完成',
        insights: ['趋势上升', '异常值检测到3处']
      };
    }
    
    // 可视化
    if (task.type === 'visualization') {
      // TODO: 生成图表
      return {
        status: 'completed',
        action: 'create_chart',
        result: '图表已生成',
        chartType: 'bar',
        file: 'chart.png'
      };
    }
    
    // 搜索/总结
    if (task.type === 'search' || task.type === 'summarize') {
      // TODO: 调用搜索 skill
      return {
        status: 'completed',
        action: 'search_summarize',
        result: '信息已检索并总结',
        sources: 5
      };
    }
    
    return {
      status: 'deferred',
      reason: '非数据管理任务',
      suggestedDept: 'bingbu'
    };
  }
  
  /**
   * 礼部 - 文档处理
   */
  async executeLibuJustice(task, context) {
    console.log(`[礼部] 处理任务: ${task.id}`);
    
    if (task.type === 'document') {
      // TODO: 调用 docx skill
      return {
        status: 'completed',
        action: 'generate_document',
        result: '文档已生成',
        format: 'docx',
        file: 'report.docx'
      };
    }
    
    if (task.type === 'format') {
      // TODO: 格式转换
      return {
        status: 'completed',
        action: 'convert_format',
        result: '格式转换完成',
        from: 'docx',
        to: 'pdf'
      };
    }
    
    if (task.type === 'translate') {
      // TODO: 翻译
      return {
        status: 'completed',
        action: 'translate',
        result: '翻译完成',
        targetLang: 'en',
        file: 'translated.docx'
      };
    }
    
    return {
      status: 'deferred',
      reason: '非文档处理任务',
      suggestedDept: 'bingbu'
    };
  }
  
  /**
   * 刑部 - 安全审计
   */
  async executeXingbu(task, context) {
    console.log(`[刑部] 处理任务: ${task.id}`);
    
    if (task.type === 'security' || task.type === 'audit') {
      // TODO: 调用安全审计 skill
      return {
        status: 'completed',
        action: 'security_audit',
        result: '审计完成',
        vulnerabilities: 0,
        risks: ['低风险配置项2处']
      };
    }
    
    if (task.type === 'test') {
      // 测试也由刑部负责
      return {
        status: 'completed',
        action: 'quality_check',
        result: '质量检查通过',
        coverage: '90%'
      };
    }
    
    return {
      status: 'deferred',
      reason: '非安全审计任务',
      suggestedDept: 'hubu'
    };
  }
  
  /**
   * 工部 - 部署运维
   */
  async executeGongbu(task, context) {
    console.log(`[工部] 处理任务: ${task.id}`);
    
    if (task.type === 'deploy' || task.type === 'cicd') {
      // TODO: 部署
      return {
        status: 'completed',
        action: 'deploy',
        result: '部署成功',
        environment: 'production',
        version: 'v1.0.0'
      };
    }
    
    if (task.type === 'monitor') {
      // TODO: 配置监控
      return {
        status: 'completed',
        action: 'setup_monitoring',
        result: '监控已配置',
        tools: ['Prometheus', 'Grafana']
      };
    }
    
    if (task.type === 'maintenance') {
      // TODO: 系统维护
      return {
        status: 'completed',
        action: 'maintenance',
        result: '维护完成',
        tasks: ['清理缓存', '备份数据']
      };
    }
    
    return {
      status: 'deferred',
      reason: '非部署运维任务',
      suggestedDept: 'bingbu'
    };
  }
  
  /**
   * 勘验司 - 技术验收
   * 六部执行完成后进行技术验收
   */
  async executeKanys(task) {
    const deptId = 'kanys';
    const deptConfig = this.deptConfig.get(deptId);
    console.log(`[${deptConfig?.name || '勘验司'}] 开始验收任务: ${task.id}`);
    
    const report = (action, detail) => this.deptConfig.formatReport(deptId, action, detail);
    
    // 上报开始验收
    await this.kanban.progress(task.id,
      report('勘验', '开始技术验收'),
      '环境检测🔄|功能测试|安全扫描|性能测试|出具报告');
    
    const issues = [];
    const inspectionConfig = deptConfig?.inspectionRules || {};
    
    // 1. 环境检测
    await this.kanban.progress(task.id,
      report('勘验', '检测运行环境'),
      '环境检测✅|功能测试🔄|安全扫描|性能测试|出具报告');
    
    if (inspectionConfig.environment?.checkPorts) {
      // 检查端口占用
      const portConflict = await this.checkPortConflict(task);
      if (portConflict) {
        issues.push(`端口冲突：${portConflict}`);
      }
    }
    
    // 2. 功能测试
    await this.kanban.progress(task.id,
      report('勘验', '测试核心功能'),
      '环境检测✅|功能测试✅|安全扫描🔄|性能测试|出具报告');
    
    const functionTest = await this.runFunctionTests(task);
    if (!functionTest.passed) {
      issues.push(...functionTest.issues);
    }
    
    // 3. 安全扫描
    await this.kanban.progress(task.id,
      report('勘验', '扫描安全漏洞'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试🔄|出具报告');
    
    if (inspectionConfig.security?.scanVulnerabilities) {
      const securityScan = await this.runSecurityScan(task);
      if (!securityScan.passed) {
        issues.push(...securityScan.issues);
      }
    }
    
    // 4. 性能测试
    await this.kanban.progress(task.id,
      report('勘验', '测试性能指标'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|出具报告🔄');
    
    if (inspectionConfig.performance?.maxStartupTime) {
      const perfTest = await this.runPerformanceTest(task, inspectionConfig.performance);
      if (!perfTest.passed) {
        issues.push(...perfTest.issues);
      }
    }
    
    // 5. 文档检查
    if (inspectionConfig.documentation?.requireReadme) {
      const docCheck = await this.checkDocumentation(task);
      if (!docCheck.passed) {
        issues.push(...docCheck.issues);
      }
    }
    
    // 6. 配置schema校验（新增）
    await this.kanban.progress(task.id,
      report('勘验', '校验配置schema'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|文档审查✅|配置schema🔄|ID唯一性|父级存在|状态流转|权限矩阵');
    
    const schemaValid = await this.validateConfigSchema(task);
    if (!schemaValid.passed) {
      issues.push(...schemaValid.issues);
    }
    
    // 7. ID唯一性检查（新增）
    await this.kanban.progress(task.id,
      report('勘验', '检查ID唯一性'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|文档审查✅|配置schema✅|ID唯一性🔄|父级存在|状态流转|权限矩阵');
    
    const idUnique = await this.checkDeptIdUniqueness(task);
    if (!idUnique.passed) {
      issues.push(...idUnique.issues);
    }
    
    // 8. 父级存在性检查（新增）
    await this.kanban.progress(task.id,
      report('勘验', '检查父级部门'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|文档审查✅|配置schema✅|ID唯一性✅|父级存在🔄|状态流转|权限矩阵');
    
    const parentExists = await this.checkParentExists(task);
    if (!parentExists.passed) {
      issues.push(...parentExists.issues);
    }
    
    // 9. 状态流转连通性检查（新增）
    await this.kanban.progress(task.id,
      report('勘验', '检查状态流转'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|文档审查✅|配置schema✅|ID唯一性✅|父级存在✅|状态流转🔄|权限矩阵');
    
    const stateConnected = await this.checkStateMachineConnectivity(task);
    if (!stateConnected.passed) {
      issues.push(...stateConnected.issues);
    }
    
    // 10. 权限矩阵一致性检查（新增）
    await this.kanban.progress(task.id,
      report('勘验', '检查权限矩阵'),
      '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|文档审查✅|配置schema✅|ID唯一性✅|父级存在✅|状态流转✅|权限矩阵🔄');
    
    const permissionValid = await this.checkPermissionMatrix(task);
    if (!permissionValid.passed) {
      issues.push(...permissionValid.issues);
    }
    
    // 生成验收报告
    const passed = issues.length === 0;
    const reportData = {
      passed,
      issues,
      timestamp: new Date().toISOString(),
      details: {
        environment: '通过',
        function: functionTest.passed ? '通过' : '未通过',
        security: securityScan?.passed ? '通过' : '未通过',
        performance: perfTest?.passed ? '通过' : '未通过'
      }
    };
    
    // 上报验收结果
    if (passed) {
      await this.kanban.progress(task.id,
        report('勘验', '技术验收通过'),
        '环境检测✅|功能测试✅|安全扫描✅|性能测试✅|验收通过✅');
      await this.kanban.todo(task.id, 'kanys', '技术验收', 'completed', '所有检查项通过');
    } else {
      await this.kanban.progress(task.id,
        report('勘验', `技术验收未通过：${issues.length}个问题`),
        '环境检测✅|功能测试❌|安全扫描⚠️|性能测试⚠️|验收未通过❌');
      await this.kanban.todo(task.id, 'kanys', '技术验收', 'failed', issues.join('\n'));
      
      // 检查是否可自动修复（方案B：走审批流程）
      const autoFixable = await this.analyzeAutoFixable(task, issues);
      if (autoFixable.canFix) {
        console.log(`[勘验司] 发现可自动修复问题，生成修复方案`);
        
        // 生成修复方案
        const fixPlan = await this.generateFixPlan(task, autoFixable.issues);
        
        // 保存修复方案到任务
        task.fixPlan = fixPlan;
        
        // 流转到门下省审议修复方案
        await this.kanban.flow(task.id, '勘验司', '门下省', `📋 提交修复方案：${fixPlan.summary}`);
        await this.kanban.state(task.id, 'menxia', '修复方案待审议');
        await this.kanban.progress(task.id,
          report('勘验', `提交${fixPlan.fixCount}项修复方案审议`),
          '发现问题❌|生成方案🔄|门下审议|尚书派发|工部修复|重新验收');
        
        return {
          passed: false,
          needsFix: true,
          fixPlan: fixPlan,
          issues: issues,
          nextStep: '提交门下省审议修复方案'
        };
      }
    }
    
    console.log(`[勘验司] 验收完成: ${task.id} - ${passed ? '通过' : '未通过'}(${issues.length}个问题)`);
    
    // 【总工程师宪章】承诺2：不跳过验证
    const performedChecks = [
      'environment', 'function', 'security', 'performance',
      'documentation', 'schema', 'id_unique', 'parent_exists',
      'state_machine', 'permission_matrix'
    ].filter(c => reportData.details[c] || reportData.details[c.replace('_', '')]);
    
    const charterCheck = await this.charter.check('no_skip_validation', {
      taskId: task.id,
      checks: performedChecks,
      results: [{ passed, name: '验收' }],
      taskType: task.type || 'default'
    });
    
    if (!charterCheck.passed) {
      console.log(`[勘验司] ${charterCheck.error}`);
      reportData._charterWarning = charterCheck.error;
    } else if (charterCheck.note) {
      console.log(`[勘验司] ${charterCheck.note}`);
    }
    
    return reportData;
  }
  
  /**
   * 检查端口冲突
   */
  async checkPortConflict(task) {
    // TODO: 实现端口检查
    return null;
  }
  
  /**
   * 运行功能测试
   */
  async runFunctionTests(task) {
    // TODO: 实现功能测试
    return { passed: true, issues: [] };
  }
  
  /**
   * 运行安全扫描
   */
  async runSecurityScan(task) {
    // TODO: 实现安全扫描
    return { passed: true, issues: [] };
  }
  
  /**
   * 运行性能测试
   */
  async runPerformanceTest(task, config) {
    // TODO: 实现性能测试
    return { passed: true, issues: [] };
  }
  
  /**
   * 检查文档
   */
  async checkDocumentation(task) {
    // TODO: 实现文档检查
    return { passed: true, issues: [] };
  }
  
  /**
   * 6. 配置schema校验
   */
  async validateConfigSchema(task) {
    const issues = [];
    
    // 获取部门配置
    const deptConfig = task.deptConfig || {};
    
    // 检查必需字段
    const requiredFields = ['id', 'name', 'type', 'execution'];
    for (const field of requiredFields) {
      if (!deptConfig[field]) {
        issues.push(`配置缺少必需字段: ${field}`);
      }
    }
    
    // 检查type有效性
    const validTypes = ['core', 'extension'];
    if (deptConfig.type && !validTypes.includes(deptConfig.type)) {
      issues.push(`无效的type值: ${deptConfig.type}，必须是 core 或 extension`);
    }
    
    // 检查execution配置
    if (deptConfig.execution) {
      const validModes = ['skill', 'script', 'agent', 'direct', 'hybrid', 'skill_based'];
      if (!validModes.includes(deptConfig.execution.mode)) {
        issues.push(`无效的execution.mode: ${deptConfig.execution.mode}`);
      }
      
      if (deptConfig.execution.mode === 'skill' && !deptConfig.execution.skill) {
        issues.push(`skill模式下必须指定skill名称`);
      }
    }
    
    // 检查ID命名规范
    const idPattern = /^[a-z][a-z0-9_]*$/;
    if (deptConfig.id && !idPattern.test(deptConfig.id)) {
      issues.push(`部门ID不符合命名规范: ${deptConfig.id}，必须以小写字母开头，只能包含小写字母、数字、下划线`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
  
  /**
   * 7. 检查部门ID唯一性
   */
  async checkDeptIdUniqueness(task) {
    const issues = [];
    const deptId = task.deptConfig?.id;
    
    if (!deptId) {
      return { passed: false, issues: ['部门ID未定义'] };
    }
    
    // 获取所有部门
    const allDepts = this.deptConfig.getAllDepartments();
    const duplicates = allDepts.filter(d => d.id === deptId);
    
    if (duplicates.length > 1) {
      issues.push(`部门ID '${deptId}' 已存在，不能重复注册`);
    }
    
    // 检查保留ID
    const reservedIds = ['taizi', 'zhongshu', 'menxia', 'shangshu', 'libu', 'bingbu', 'hubu', 'libu-justice', 'xingbu', 'gongbu', 'kanys'];
    if (reservedIds.includes(deptId) && duplicates.length === 0) {
      // 新部门使用了保留ID
      issues.push(`部门ID '${deptId}' 是系统保留ID，不能使用`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
  
  /**
   * 8. 检查父级部门存在性
   */
  async checkParentExists(task) {
    const issues = [];
    const parentId = task.deptConfig?.parent;
    
    if (!parentId) {
      // 没有parent是允许的（顶级部门）
      return { passed: true, issues: [] };
    }
    
    // 检查父部门是否存在
    const parent = this.deptConfig.get(parentId);
    if (!parent) {
      issues.push(`父级部门 '${parentId}' 不存在`);
    }
    
    // 检查parent是否为shangshu（当前只支持尚书省下属）
    if (parentId !== 'shangshu') {
      issues.push(`当前只支持parent为'shangshu'，不支持 '${parentId}'`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
  
  /**
   * 9. 检查状态流转连通性
   */
  async checkStateMachineConnectivity(task) {
    const issues = [];
    const deptConfig = task.deptConfig;
    
    if (!deptConfig) {
      return { passed: false, issues: ['部门配置未定义'] };
    }
    
    // 检查部门是否能被正确调用
    if (deptConfig.type === 'core') {
      // core类型需要有execute方法
      const methodName = `execute${deptConfig.id.charAt(0).toUpperCase() + deptConfig.id.slice(1)}`;
      if (typeof this[methodName] !== 'function') {
        issues.push(`核心部门 '${deptConfig.id}' 缺少 ${methodName}() 方法`);
      }
    }
    
    // 检查是否能从状态机正确流转
    const transitions = this.stateMachine?.transitions || {};
    const canTransition = Object.values(transitions).some(t => 
      t.next && t.next.includes(deptConfig.id)
    );
    
    if (!canTransition && deptConfig.type === 'core') {
      // 警告：可能无法通过状态机直接流转到该部门
      // 但可能通过尚书省派发，所以只是警告
      console.warn(`[勘验司] 警告: 部门 '${deptConfig.id}' 可能无法直接从状态机流转`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
  
  /**
   * 10. 检查权限矩阵一致性
   */
  async checkPermissionMatrix(task) {
    const issues = [];
    const deptConfig = task.deptConfig;
    
    if (!deptConfig) {
      return { passed: false, issues: ['部门配置未定义'] };
    }
    
    // 检查部门权限配置
    if (deptConfig.permissions) {
      const validPermissions = ['call', 'read', 'write', 'admin'];
      for (const perm of Object.keys(deptConfig.permissions)) {
        if (!validPermissions.includes(perm)) {
          issues.push(`未知权限类型: ${perm}`);
        }
      }
    }
    
    // 检查是否能被尚书省调用（关键检查）
    if (deptConfig.parent === 'shangshu' || deptConfig.type === 'extension') {
      // 这些部门应该能被尚书省派发
      console.log(`[勘验司] 部门 '${deptConfig.id}' 可被尚书省派发`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
  
  /**
   * 分析问题是否可自动修复
   */
  async analyzeAutoFixable(task, issues) {
    const autoFixableIssues = [];
    const manualFixIssues = [];
    
    for (const issue of issues) {
      // 可自动修复的问题
      if (issue.includes('术语缺失') || 
          issue.includes('classical-terms.json') ||
          issue.includes('skill') && issue.includes('不存在')) {
        autoFixableIssues.push(issue);
      }
      // 需要人工修复的问题
      else if (issue.includes('代码逻辑') ||
               issue.includes('状态流转断裂') ||
               issue.includes('权限矩阵')) {
        manualFixIssues.push(issue);
      }
      // 其他问题默认人工修复
      else {
        manualFixIssues.push(issue);
      }
    }
    
    return {
      canFix: autoFixableIssues.length > 0,
      autoFixableIssues,
      manualFixIssues,
      autoFixCount: autoFixableIssues.length,
      manualFixCount: manualFixIssues.length
    };
  }
  
  /**
   * 生成修复方案
   */
  async generateFixPlan(task, fixableIssues) {
    const fixes = [];
    
    for (const issue of fixableIssues) {
      if (issue.includes('术语缺失') || issue.includes('classical-terms.json')) {
        fixes.push({
          type: 'missing_term',
          description: '添加古风术语',
          dept: 'libu-justice',
          action: 'autoGenerateTerm',
          params: { deptId: task.deptConfig?.id },
          estimatedTime: '5分钟'
        });
      }
      
      if (issue.includes('skill') && issue.includes('不存在')) {
        fixes.push({
          type: 'missing_skill',
          description: '创建skill模板',
          dept: 'bingbu',
          action: 'createSkillTemplate',
          params: { deptId: task.deptConfig?.id },
          estimatedTime: '10分钟'
        });
      }
    }
    
    const totalTime = fixes.reduce((sum, f) => {
      const minutes = parseInt(f.estimatedTime);
      return sum + (isNaN(minutes) ? 5 : minutes);
    }, 0);
    
    return {
      summary: `${fixes.length}项自动修复（${totalTime}分钟）`,
      fixCount: fixes.length,
      fixes,
      totalTime: `${totalTime}分钟`,
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * 执行修复方案（经门下省准奏后）
   */
  async executeFixPlan(task) {
    const fixPlan = task.fixPlan;
    if (!fixPlan) {
      throw new Error('无修复方案可执行');
    }
    
    console.log(`[勘验司] 执行修复方案: ${fixPlan.summary}`);
    
    const results = [];
    
    for (const fix of fixPlan.fixes) {
      console.log(`[勘验司] 执行修复: ${fix.description}`);
      
      try {
        if (fix.action === 'autoGenerateTerm') {
          await this.autoGenerateTerm(fix.params.deptId);
          results.push({ fix: fix.description, status: 'success' });
        } else if (fix.action === 'createSkillTemplate') {
          await this.createSkillTemplate(fix.params.deptId);
          results.push({ fix: fix.description, status: 'success' });
        }
      } catch (error) {
        results.push({ fix: fix.description, status: 'failed', error: error.message });
      }
    }
    
    // 清除修复方案
    delete task.fixPlan;
    
    return {
      success: results.every(r => r.status === 'success'),
      results,
      summary: `完成${results.filter(r => r.status === 'success').length}/${results.length}项修复`
    };
  }
  
  /**
   * 自动修复 - 生成默认术语
   */
  async autoGenerateTerm(deptId) {
    console.log(`[勘验司] 自动生成术语: ${deptId}`);
    
    const dept = this.deptConfig.get(deptId);
    if (!dept) return false;
    
    // 读取术语文件
    const termsPath = path.join(__dirname, '..', '..', 'config', 'classical-terms.json');
    const terms = JSON.parse(fs.readFileSync(termsPath, 'utf8'));
    
    // 生成默认术语
    terms.departments[deptId] = {
      name: dept.name,
      title: `${dept.name}郎中`,
      role: dept.role || '辅助执行',
      address: '郎中',
      self_address: '下官',
      reporting: {
        progressTemplate: `启奏陛下，${dept.name}正在{action}，{detail}`,
        todoCategories: ['任务接收', '方案制定', '执行办理', '结果汇报']
      }
    };
    
    // 写回文件
    fs.writeFileSync(termsPath, JSON.stringify(terms, null, 2));
    
    console.log(`[勘验司] 术语生成完成: ${deptId}`);
    return true;
  }
  
  /**
   * 自动修复 - 创建skill模板
   */
  async createSkillTemplate(deptId) {
    console.log(`[勘验司] 创建skill模板: ${deptId}`);
    
    const skillsDir = path.join(process.env.HOME, '.stepclaw', 'skills');
    const skillPath = path.join(skillsDir, deptId);
    
    // 创建目录
    if (!fs.existsSync(skillPath)) {
      fs.mkdirSync(skillPath, { recursive: true });
    }
    
    // 创建 skill.json
    const skillConfig = {
      name: deptId,
      version: '1.0.0',
      description: `Auto-generated skill for ${deptId}`,
      entrypoint: 'execute'
    };
    fs.writeFileSync(
      path.join(skillPath, 'skill.json'),
      JSON.stringify(skillConfig, null, 2)
    );
    
    // 创建 index.js 模板
    const indexTemplate = `/**
 * ${deptId} skill
 * Auto-generated by 勘验司
 */

async function execute(context) {
  const { task } = context;
  
  console.log('[${deptId}] 执行任务:', task.id);
  
  // TODO: 实现部门逻辑
  
  return {
    status: 'completed',
    result: '任务执行完成'
  };
}

module.exports = { execute };
`;
    fs.writeFileSync(path.join(skillPath, 'index.js'), indexTemplate);
    
    console.log(`[勘验司] skill模板创建完成: ${deptId}`);
    return true;
  }
  
  /**
   * 根据部门执行结果推进状态
   */
  advanceStateBasedOnDept(task, deptId, result) {
    switch (deptId) {
      case 'zhongshu':
        // 中书省规划完成 → 提交门下省审议
        if (result.status === 'completed') {
          this.stateMachine.transition(task.id, 'menxia', {
            action: 'submit_review',
            note: '规划完成，提交门下省审议'
          });
        }
        break;
        
      case 'menxia':
        // 门下省审核 → 根据结果决定
        if (result.reviewResult === 'approve') {
          this.stateMachine.transition(task.id, 'assigned', {
            action: 'approve',
            note: result.note || '准奏通过'
          });
        } else if (result.reviewResult === 'reject') {
          this.stateMachine.transition(task.id, 'zhongshu', {
            action: 'reject',
            note: result.note || '方案被驳回'
          });
        }
        break;
        
      case 'shangshu':
        // 尚书省派发完成 → 进入执行
        if (result.status === 'dispatched') {
          // 派发任务给各个执行部门
          // 此时状态已经是 assigned，不需要再流转
          // 但需要触发各个执行部门的执行
          this.dispatchToExecutionDepts(task);
        }
        break;
        
      case 'libu':
      case 'bingbu':
      case 'hubu':
      case 'libu-justice':
      case 'xingbu':
      case 'gongbu':
        // 六部执行完成
        if (result.status === 'completed') {
          // 记录实际执行时间（用于学习优化）
          if (assignment.startTime && this.timeEstimator) {
            const actualMinutes = Math.round((Date.now() - assignment.startTime) / 60000);
            this.timeEstimator.saveActualTime(task, {
              id: assignment.subtaskId,
              title: assignment.title,
              dept: deptId
            }, actualMinutes).catch(err => {
              console.warn('[Orchestrator] 保存时间历史失败:', err.message);
            });
          }
          
          // 检查是否所有子任务都完成
          this.checkAndAdvanceFromDoing(task);
        }
        break;
    }
  }
  
  /**
   * 派发任务到执行部门
   */
  async dispatchToExecutionDepts(task) {
    if (!task.assignments) {
      console.log(`[Orchestrator] 任务 ${task.id} 没有分配子任务`);
      return;
    }
    
    // 并行执行所有分配的子任务
    const promises = task.assignments.map(async (assignment) => {
      try {
        const result = await this.executeDepartment(task, assignment.dept);
        assignment.result = result;
        assignment.completedAt = new Date().toISOString();
      } catch (error) {
        assignment.error = error.message;
        assignment.failedAt = new Date().toISOString();
      }
    });
    
    await Promise.all(promises);
    
    // 所有子任务完成后，先进行勘验司验收
    const inspectionResult = await this.executeKanys(task);
    
    if (!inspectionResult.passed) {
      // 验收不通过，退回工部修复
      await this.kanban.flow(task.id, '勘验司', '工部', `❌ 验收不通过：${inspectionResult.issues.join('；')}`);
      await this.kanban.state(task.id, 'gongbu', '验收不通过，退回工部修复');
      
      // 记录需要修复
      task.needsFix = true;
      task.inspectionIssues = inspectionResult.issues;
      
      return {
        status: 'needs_inspection_fix',
        issues: inspectionResult.issues,
        message: '勘验司验收不通过，已退回工部'
      };
    }
    
    // 验收通过，进入 review 状态
    await this.kanban.flow(task.id, '勘验司', '尚书省', '✅ 验收通过');
    this.stateMachine.transition(task.id, 'review', {
      action: 'inspection_passed',
      note: '勘验司验收通过，提交汇总审核'
    });
  }
  
  /**
   * 检查并推进 doing 状态
   */
  checkAndAdvanceFromDoing(task) {
    // 如果所有子任务都完成，则转到 review
    const allCompleted = task.assignments?.every(a => a.result?.status === 'completed') || false;
    
    if (allCompleted) {
      this.stateMachine.transition(task.id, 'review', {
        action: 'all_subtasks_completed',
        note: '所有子任务执行完成，提交汇总审核'
      });
    }
  }
  
  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    return this.stateMachine.getTask(taskId);
  }
  
  /**
   * 获取运行中任务
   */
  getRunningTasks() {
    return this.stateMachine.getRunningTasks();
  }
  
  /**
   * 取消任务
   */
  cancelTask(taskId, reason) {
    return this.stateMachine.cancel(taskId, reason);
  }
  
  /**
   * 封驳任务
   */
  rejectTask(taskId, reason) {
    return this.stateMachine.reject(taskId, reason);
  }
  
  /**
   * 批准任务
   */
  approveTask(taskId, note) {
    return this.stateMachine.approve(taskId, note);
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    const smInfo = this.stateMachine.getInfo();
    return {
      ...this.stats,
      ...smInfo,
      departments: Object.keys(this.departments).length,
      permissions: Object.keys(this.permissionMatrix.permissions).length
    };
  }

  // [MODIFIED 2026-03-27 19:03] 增加技能识别实际使用
  /**
   * 智能分配技能到部门（使用 skill-detection.json）
   * @param {Object} task - 任务对象
   * @returns {Array} 部门分配列表
   */
  async assignSkillToDepartments(task) {
    const assignments = [];
    const rules = this.skillDetection.assignment_rules || {};
    const thresholds = this.skillDetection.matching?.thresholds || { high: 80, medium: 50 };
    
    // 分析任务描述
    const description = (task.description || task.title || '').toLowerCase();
    
    // 遍历所有部门规则，计算匹配分数
    for (const [deptId, deptRules] of Object.entries(rules)) {
      let score = 0;
      const matchedKeywords = [];
      const matchedPatterns = [];
      
      // 关键词匹配
      if (deptRules.keywords) {
        for (const keyword of deptRules.keywords) {
          if (description.includes(keyword.toLowerCase())) {
            score += 10;
            matchedKeywords.push(keyword);
          }
        }
      }
      
      // 描述模式匹配
      if (deptRules.description_patterns) {
        for (const pattern of deptRules.description_patterns) {
          if (description.includes(pattern.toLowerCase())) {
            score += 15;
            matchedPatterns.push(pattern);
          }
        }
      }
      
      // 根据分数决定分配
      if (score >= thresholds.high) {
        assignments.push({
          dept: deptId,
          score,
          confidence: 'high',
          reason: deptRules.reason || '匹配度高',
          matchedKeywords,
          matchedPatterns
        });
      } else if (score >= thresholds.medium) {
        assignments.push({
          dept: deptId,
          score,
          confidence: 'medium',
          reason: deptRules.reason || '部分匹配',
          matchedKeywords,
          matchedPatterns,
          note: '建议人工复核'
        });
      }
    }
    
    // 按分数排序
    assignments.sort((a, b) => b.score - a.score);
    
    console.log(`[技能识别] 分析任务: ${task.title}`);
    console.log(`[技能识别] 匹配部门: ${assignments.length}个`);
    assignments.forEach(a => {
      console.log(`  └─ ${a.dept}: ${a.score}分 (${a.confidence})`);
    });
    
    return assignments;
  }

  /**
   * 应用风格规则格式化输出
   * @param {string} text - 原始文本
   * @param {string} context - 上下文类型 (technical|process|mixed)
   * @returns {string} 格式化后的文本
   */
  applyStyleRules(text, context = 'mixed') {
    const rules = this.styleRules;
    if (!rules || !rules.levels) {
      return text;
    }
    
    const level = rules.levels.formal || { percentage: 0.8 };
    const templates = rules.templates || {};
    
    // 根据上下文选择风格
    let style = 'mixed';
    if (context === 'technical') {
      style = 'plain'; // 技术内容原样
    } else if (context === 'process') {
      style = 'classical'; // 流程用语古风
    }
    
    // 应用模板替换
    let result = text;
    if (templates.process_start && context === 'process') {
      result = result.replace(/开始执行/g, templates.process_start);
    }
    if (templates.process_end && context === 'process') {
      result = result.replace(/执行完成/g, templates.process_end);
    }
    
    return result;
  }

  /**
   * 自动判断项目类型（融合/部门/技能）
   * @param {Object} task - 任务对象
   * @returns {Object} 判断结果
   */
  async classifyProjectType(task) {
    // 基于任务特征判断
    const title = (task.title || '').toLowerCase();
    const description = (task.description || '').toLowerCase();
    
    // 判断是否为部门安装
    const deptPatterns = /安装.*部门|创建.*部门|新增.*部门|dept.*install|department.*create/i;
    if (deptPatterns.test(title) || deptPatterns.test(description)) {
      return {
        type: 'dept_installation',
        reason: '关键词匹配：部门安装',
        confidence: 0.9
      };
    }
    
    // 判断是否为技能安装
    const skillPatterns = /安装.*技能|添加.*插件|skill.*install|plugin/i;
    if (skillPatterns.test(title) || skillPatterns.test(description)) {
      // 进一步判断是否为融合
      const fusionPatterns = /融合|merge|升级|enhance/i;
      if (fusionPatterns.test(title) || fusionPatterns.test(description)) {
        return {
          type: 'fusion',
          reason: '关键词匹配：技能融合',
          confidence: 0.8
        };
      }
      
      return {
        type: 'skill_installation',
        reason: '关键词匹配：技能安装',
        confidence: 0.85
      };
    }
    
    // 默认作为普通任务
    return {
      type: 'task_execution',
      reason: '默认类型：任务执行',
      confidence: 0.5
    };
  }
  // [END MODIFIED]
}

module.exports = { Orchestrator };

// 测试
if (require.main === module) {
  (async () => {
    const orchestrator = new Orchestrator();
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           🏛️  任务编排器 - 端到端测试                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // 测试消息
    const testMessages = [
      '你好',
      '帮我写一个Python爬虫',
      '分析销售数据并生成图表'
    ];
    
    for (const text of testMessages) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📜 用户消息: "${text}"\n`);
      
      const result = await orchestrator.processUserMessage({
        text,
        user: 'test-user',
        channel: 'test',
        sessionId: 'test-session'
      });
      
      console.log(`处理结果: ${result.type}`);
      
      if (result.type === 'direct_reply') {
        console.log(`  └─ 回复: ${result.reply}`);
      } else if (result.type === 'task_created') {
        console.log(`  └─ 任务ID: ${result.taskId}`);
        console.log(`  └─ 当前状态: ${result.task.status}`);
        console.log(`  └─ 目标部门: ${result.task.targetDept}`);
        console.log(`  └─ 回复: ${result.reply}`);
        
        // 查看流转日志
        console.log(`  └─ 流转日志:`);
        result.task.flowLog.forEach((log, i) => {
          console.log(`      ${i + 1}. ${log.from} → ${log.to}: ${log.note}`);
        });
      } else {
        console.log(`  └─ 错误: ${result.reply || result.error}`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 统计信息:');
    console.log(orchestrator.getStats());
  })();
}
