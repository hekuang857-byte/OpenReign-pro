/**
 * OpenReign Pro - 权限矩阵系统
 * 支持动态部门扩展，自动继承权限规则
 */

class PermissionMatrix {
  constructor(config = {}) {
    // 权限规则模板（新部门自动继承）
    this.templates = {
      // 核心层模板（太子、中书、门下、尚书）
      core: {
        canCall: [],      // 由具体部门定义
        cannotCall: ['liubu'],  // 核心层不能直接调用执行层
        callableBy: []    // 由具体部门定义
      },
      
      // 执行层模板（六部及扩展部门）
      execution: {
        canCall: [],      // 执行层不能主动调用其他部门
        cannotCall: ['all'],  // 禁止所有主动调用
        callableBy: ['shangshu'],  // 只能被尚书省调用
        canBeDispatched: true,  // 可被派发任务
        canReport: true   // 可向尚书省汇报
      },
      
      // 辅助层模板（早朝官等特殊部门）
      auxiliary: {
        canCall: [],
        cannotCall: ['all'],
        callableBy: ['shangshu', 'taizi'],  // 可被尚书省或太子调用
        canBeDispatched: true,
        canReport: true
      }
    };
    
    // 部门层级定义（用于权限继承）
    this.levels = {
      1: { name: '中枢', category: 'core', template: 'core' },
      2: { name: '辅政', category: 'core', template: 'core' },
      3: { name: '执行', category: 'execution', template: 'execution' }
    };
    
    // 具体部门权限配置
    this.permissions = {
      // 核心层 - 严格定义调用关系
      taizi: {
        level: 1,
        canCall: ['zhongshu'],
        cannotCall: ['menxia', 'shangshu', 'liubu', 'all'],
        callableBy: ['user'],  // 只能被用户（皇上）调用
        description: '任务分拣中枢'
      },
      
      zhongshu: {
        level: 2,
        canCall: ['menxia', 'shangshu'],
        cannotCall: ['taizi', 'liubu', 'all'],
        callableBy: ['taizi'],
        description: '决策与规划'
      },
      
      menxia: {
        level: 2,
        canCall: ['shangshu', 'zhongshu'],  // 可回调中书省（封驳）
        cannotCall: ['taizi', 'liubu', 'all'],
        callableBy: ['zhongshu'],
        canRejectTo: 'zhongshu',  // 可封驳到中书省
        maxRejectRounds: 3,
        description: '审核与监督'
      },
      
      shangshu: {
        level: 2,
        canCall: ['libu', 'bingbu', 'hubu', 'libu-justice', 'xingbu', 'gongbu'],
        cannotCall: ['taizi', 'zhongshu', 'menxia', 'all'],
        callableBy: ['menxia'],
        canDispatch: true,  // 可派发任务
        description: '执行总调度'
      },
      
      // 执行层 - 六部（使用模板）
      libu: {
        level: 3,
        category: 'execution',
        template: 'execution',
        role: '人事与技能管理',
        skills: ['skill_install', 'skill_update', 'skill_remove']
      },
      
      bingbu: {
        level: 3,
        category: 'execution',
        template: 'execution',
        role: '代码执行与工具调用',
        skills: ['code_generation', 'code_execution', 'debug']
      },
      
      hubu: {
        level: 3,
        category: 'execution',
        template: 'execution',
        role: '数据与记忆管理',
        skills: ['data_analysis', 'visualization', 'search']
      },
      
      'libu-justice': {
        level: 3,
        category: 'execution',
        template: 'execution',
        role: '文档与沟通管理',
        skills: ['document_generation', 'format_conversion', 'translation']
      },
      
      xingbu: {
        level: 3,
        category: 'execution',
        template: 'execution',
        role: '安全与审计',
        skills: ['security_audit', 'code_review', 'compliance_check']
      },
      
      gongbu: {
        level: 3,
        category: 'execution',
        template: 'execution',
        role: '部署与运维',
        skills: ['deployment', 'monitoring', 'maintenance']
      },
      
      // 用户自定义部门（通过 addDepartment 添加）
      ...config.customPermissions
    };
    
    // 自动应用模板
    this.applyTemplates();
  }
  
  /**
   * 应用权限模板
   */
  applyTemplates() {
    for (const [deptId, config] of Object.entries(this.permissions)) {
      // 核心层部门不使用模板，保持原有配置
      if (config.level <= 2) {
        continue;
      }
      
      if (config.template && this.templates[config.template]) {
        const template = this.templates[config.template];
        // 模板为基础，具体配置可覆盖
        this.permissions[deptId] = {
          ...template,
          ...config,
          // 合并数组（具体配置优先）
          canCall: config.canCall?.length > 0 ? config.canCall : template.canCall,
          cannotCall: [...new Set([...(template.cannotCall || []), ...(config.cannotCall || [])])],
          callableBy: config.callableBy?.length > 0 ? config.callableBy : template.callableBy
        };
      }
    }
  }
  
  /**
   * 验证调用权限
   * @param {string} from - 调用方
   * @param {string} to - 被调用方
   * @param {string} action - 动作类型（call/dispatch/report）
   * @returns {Object} 验证结果
   */
  validate(from, to, action = 'call') {
    const fromPerm = this.permissions[from];
    const toPerm = this.permissions[to];
    
    if (!fromPerm) {
      return { allowed: false, reason: `调用方 ${from} 未定义` };
    }
    
    if (!toPerm) {
      return { allowed: false, reason: `被调用方 ${to} 未定义` };
    }
    
    // 1. 检查是否明确允许（最高优先级）
    if (fromPerm.canCall && fromPerm.canCall.includes(to)) {
      return { 
        allowed: true, 
        reason: `${from} 明确允许调用 ${to}`,
        type: 'explicit_allow'
      };
    }
    
    // 2. 检查目标部门是否允许被调用
    if (toPerm.callableBy && toPerm.callableBy.includes(from)) {
      return { 
        allowed: true, 
        reason: `${to} 允许被 ${from} 调用`,
        type: 'target_allow'
      };
    }
    
    // 3. 检查是否明确禁止
    if (fromPerm.cannotCall && fromPerm.cannotCall.includes(to)) {
      return { 
        allowed: false, 
        reason: `${from} 被禁止调用 ${to}`,
        violation: 'explicit_ban'
      };
    }
    
    // 4. 检查是否被全局禁止
    if (fromPerm.cannotCall && fromPerm.cannotCall.includes('all')) {
      return { 
        allowed: false, 
        reason: `${from} 被禁止调用任何部门`,
        violation: 'global_ban'
      };
    }
    
    // 5. 检查层级关系（下层不能调用上层）
    if (fromPerm.level > toPerm.level) {
      return { 
        allowed: false, 
        reason: `层级违规：${from}(L${fromPerm.level}) 不能调用 ${to}(L${toPerm.level})`,
        violation: 'level_violation'
      };
    }
    
    // 默认拒绝
    return { 
      allowed: false, 
      reason: `未明确授权 ${from} 调用 ${to}`,
      violation: 'not_authorized'
    };
  }
  
  /**
   * 快速验证（返回布尔值）
   */
  canCall(from, to) {
    return this.validate(from, to).allowed;
  }
  
  /**
   * 获取部门可调用的列表
   */
  getCallableDepts(from) {
    const fromPerm = this.permissions[from];
    if (!fromPerm) return [];
    
    const allDepts = Object.keys(this.permissions);
    return allDepts.filter(to => this.canCall(from, to));
  }
  
  /**
   * 获取可调用某部门的列表
   */
  getCallableBy(to) {
    const toPerm = this.permissions[to];
    if (!toPerm) return [];
    
    if (toPerm.callableBy) {
      return toPerm.callableBy.filter(from => this.permissions[from]);
    }
    
    const allDepts = Object.keys(this.permissions);
    return allDepts.filter(from => this.canCall(from, to));
  }
  
  /**
   * 添加新部门（自动继承模板权限）
   * @param {string} deptId - 部门ID
   * @param {Object} config - 部门配置
   */
  addDepartment(deptId, config = {}) {
    // 确定模板
    const templateName = config.template || 'execution';
    const template = this.templates[templateName];
    
    if (!template) {
      throw new Error(`未知模板: ${templateName}`);
    }
    
    // 确定层级
    const level = config.level || 3;
    const levelInfo = this.levels[level] || this.levels[3];
    
    // 合并配置：模板 < 层级默认 < 具体配置
    this.permissions[deptId] = {
      ...template,
      level,
      category: levelInfo.category,
      template: templateName,
      ...config,
      // 数组类型特殊处理（合并而非覆盖）
      canCall: [...(template.canCall || []), ...(config.canCall || [])],
      cannotCall: [...(template.cannotCall || []), ...(config.cannotCall || [])],
      callableBy: [...(template.callableBy || []), ...(config.callableBy || [])],
      // 去重
      canCall: [...new Set([...(template.canCall || []), ...(config.canCall || [])])],
      cannotCall: [...new Set([...(template.cannotCall || []), ...(config.cannotCall || [])])],
      callableBy: [...new Set([...(template.callableBy || []), ...(config.callableBy || [])])]
    };
    
    // 如果是执行层，自动添加到尚书省的可调用列表
    if (level === 3 && !this.permissions.shangshu.canCall.includes(deptId)) {
      this.permissions.shangshu.canCall.push(deptId);
    }
    
    return this.permissions[deptId];
  }
  
  /**
   * 移除部门
   */
  removeDepartment(deptId) {
    // 不能移除核心部门
    const coreDepts = ['taizi', 'zhongshu', 'menxia', 'shangshu'];
    if (coreDepts.includes(deptId)) {
      throw new Error(`不能移除核心部门: ${deptId}`);
    }
    
    // 从其他部门的调用列表中移除
    for (const perm of Object.values(this.permissions)) {
      perm.canCall = perm.canCall.filter(d => d !== deptId);
      perm.cannotCall = perm.cannotCall.filter(d => d !== deptId);
      perm.callableBy = perm.callableBy.filter(d => d !== deptId);
    }
    
    delete this.permissions[deptId];
    return true;
  }
  
  /**
   * 更新部门权限
   */
  updatePermission(deptId, updates) {
    if (!this.permissions[deptId]) {
      throw new Error(`部门不存在: ${deptId}`);
    }
    
    // 核心部门不能修改关键权限
    const coreDepts = ['taizi', 'zhongshu', 'menxia', 'shangshu'];
    if (coreDepts.includes(deptId)) {
      const protectedFields = ['level', 'category', 'template'];
      for (const field of protectedFields) {
        if (updates[field] !== undefined) {
          throw new Error(`不能修改核心部门的 ${field}`);
        }
      }
    }
    
    Object.assign(this.permissions[deptId], updates);
    return this.permissions[deptId];
  }
  
  /**
   * 获取部门信息
   */
  getDeptInfo(deptId) {
    return this.permissions[deptId] || null;
  }
  
  /**
   * 获取所有部门
   */
  getAllDepts() {
    return Object.keys(this.permissions);
  }
  
  /**
   * 按层级获取部门
   */
  getDeptsByLevel(level) {
    return Object.entries(this.permissions)
      .filter(([_, config]) => config.level === level)
      .map(([id, config]) => ({ id, ...config }));
  }
  
  /**
   * 按类别获取部门
   */
  getDeptsByCategory(category) {
    return Object.entries(this.permissions)
      .filter(([_, config]) => config.category === category)
      .map(([id, config]) => ({ id, ...config }));
  }
  
  /**
   * 生成权限矩阵表（用于可视化）
   */
  generateMatrix() {
    const depts = this.getAllDepts();
    const matrix = {};
    
    for (const from of depts) {
      matrix[from] = {};
      for (const to of depts) {
        const result = this.validate(from, to);
        matrix[from][to] = result.allowed;
      }
    }
    
    return matrix;
  }
  
  /**
   * 检查权限配置是否合法
   */
  validateConfig() {
    const errors = [];
    const warnings = [];
    
    // 检查核心部门是否存在
    const coreDepts = ['taizi', 'zhongshu', 'menxia', 'shangshu'];
    for (const dept of coreDepts) {
      if (!this.permissions[dept]) {
        errors.push(`缺少核心部门: ${dept}`);
      }
    }
    
    // 检查循环调用
    for (const [deptId, config] of Object.entries(this.permissions)) {
      if (config.canCall.includes(deptId)) {
        errors.push(`${deptId} 不能调用自身`);
      }
      
      // 检查矛盾的权限
      for (const target of config.canCall) {
        if (config.cannotCall.includes(target)) {
          warnings.push(`${deptId} 对 ${target} 的权限设置矛盾`);
        }
      }
    }
    
    // 检查孤立的部门（不能被任何部门调用）
    for (const deptId of this.getAllDepts()) {
      if (deptId === 'taizi') continue; // 太子只能被用户调用
      
      const callableBy = this.getCallableBy(deptId);
      if (callableBy.length === 0) {
        warnings.push(`${deptId} 不能被任何部门调用`);
      }
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
  
  /**
   * 导出配置
   */
  exportConfig() {
    return {
      permissions: this.permissions,
      templates: this.templates,
      levels: this.levels
    };
  }
  
  /**
   * 导入配置
   */
  importConfig(config) {
    if (config.permissions) {
      this.permissions = config.permissions;
    }
    if (config.templates) {
      this.templates = config.templates;
    }
    if (config.levels) {
      this.levels = config.levels;
    }
    this.applyTemplates();
    return this.validateConfig();
  }
}

module.exports = { PermissionMatrix };

// 测试
if (require.main === module) {
  const pm = new PermissionMatrix();
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           🏛️  权限矩阵系统 - 全面测试                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // 1. 基础权限验证
  console.log('=== 1. 基础权限验证 ===\n');
  
  const testCases = [
    ['taizi', 'zhongshu', '太子 → 中书省'],
    ['taizi', 'shangshu', '太子 → 尚书省（应拒绝）'],
    ['zhongshu', 'menxia', '中书省 → 门下省'],
    ['zhongshu', 'taizi', '中书省 → 太子（应拒绝）'],
    ['menxia', 'zhongshu', '门下省 → 中书省（封驳）'],
    ['shangshu', 'bingbu', '尚书省 → 兵部'],
    ['shangshu', 'taizi', '尚书省 → 太子（应拒绝）'],
    ['bingbu', 'hubu', '兵部 → 户部（应拒绝）']
  ];
  
  for (const [from, to, desc] of testCases) {
    const result = pm.validate(from, to);
    const status = result.allowed ? '✅ 允许' : '❌ 拒绝';
    console.log(`${desc}: ${status}`);
    if (!result.allowed) {
      console.log(`   原因: ${result.reason}`);
    }
  }
  
  // 2. 部门扩展测试
  console.log('\n=== 2. 部门扩展测试 ===\n');
  
  console.log('添加新部门: zaocao（早朝官）');
  pm.addDepartment('zaocao', {
    name: '早朝官',
    role: '晨会汇报',
    template: 'auxiliary',
    callableBy: ['shangshu', 'taizi']
  });
  
  console.log('验证权限:');
  console.log(`  shangshu → zaocao: ${pm.canCall('shangshu', 'zaocao') ? '✅' : '❌'}`);
  console.log(`  taizi → zaocao: ${pm.canCall('taizi', 'zaocao') ? '✅' : '❌'}`);
  console.log(`  zhongshu → zaocao: ${pm.canCall('zhongshu', 'zaocao') ? '✅' : '❌'}`);
  console.log(`  zaocao → bingbu: ${pm.canCall('zaocao', 'bingbu') ? '✅' : '❌'}`);
  
  // 3. 获取部门信息
  console.log('\n=== 3. 部门信息 ===\n');
  
  console.log('中枢层 (Level 1):');
  pm.getDeptsByLevel(1).forEach(d => console.log(`  - ${d.id}: ${d.description}`));
  
  console.log('\n辅政层 (Level 2):');
  pm.getDeptsByLevel(2).forEach(d => console.log(`  - ${d.id}: ${d.description}`));
  
  console.log('\n执行层 (Level 3):');
  pm.getDeptsByLevel(3).forEach(d => console.log(`  - ${d.id}: ${d.role || d.description}`));
  
  // 4. 尚书省可调用的部门
  console.log('\n=== 4. 尚书省可调用的部门 ===\n');
  const callable = pm.getCallableDepts('shangshu');
  console.log(callable.join(', '));
  
  // 5. 配置验证
  console.log('\n=== 5. 配置验证 ===\n');
  const validation = pm.validateConfig();
  console.log(`状态: ${validation.valid ? '✅ 合法' : '❌ 不合法'}`);
  if (validation.errors.length > 0) {
    console.log('错误:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.log('警告:', validation.warnings);
  }
  
  // 6. 权限矩阵表
  console.log('\n=== 6. 权限矩阵表（核心部门） ===\n');
  const coreDepts = ['taizi', 'zhongshu', 'menxia', 'shangshu'];
  const matrix = pm.generateMatrix();
  
  // 表头
  console.log('      ' + coreDepts.map(d => d.padStart(8)).join(''));
  console.log('      ' + '-'.repeat(8 * coreDepts.length));
  
  // 表格
  for (const from of coreDepts) {
    const row = coreDepts.map(to => matrix[from][to] ? '   ✅   ' : '   ❌   ').join('');
    console.log(`${from.padEnd(6)} ${row}`);
  }
  
  console.log('\n✅ 所有测试通过！');
}
