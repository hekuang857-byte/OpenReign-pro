/**
 * 部门配置管理器
 * 加载和管理部门配置，支持核心部门和扩展部门
 */

const fs = require('fs');
const path = require('path');

class DepartmentConfigManager {
  constructor(configPath) {
    this.configPath = configPath || path.join(__dirname, '..', '..', 'config', 'departments.json');
    this.config = null;
    this.coreDepartments = new Map();
    this.extensionDepartments = new Map();
    
    this.load();
  }

  /**
   * 加载配置
   */
  load() {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.warn(`[DeptConfig] 配置文件不存在: ${this.configPath}`);
        return this.loadDefaults();
      }

      const content = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(content);
      
      // 解析核心部门
      const coreDepts = this.config.core_departments || {};
      Object.entries(coreDepts).forEach(([id, cfg]) => {
        this.coreDepartments.set(id, { ...cfg, id, type: 'core' });
      });
      
      // 解析六部
      const liubu = this.config.liubu || {};
      Object.entries(liubu).forEach(([id, cfg]) => {
        this.coreDepartments.set(id, { ...cfg, id, type: 'core' });
      });
      
      // 解析扩展部门
      const extDepts = this.config.extension_departments || {};
      Object.entries(extDepts).forEach(([id, cfg]) => {
        if (id.startsWith('_') || !cfg.enabled) return; // 跳过注释和禁用部门
        this.extensionDepartments.set(id, { ...cfg, id, type: 'extension' });
      });
      
      console.log(`[DeptConfig] 配置加载成功: ${this.coreDepartments.size} 核心部门, ${this.extensionDepartments.size} 扩展部门`);
      
    } catch (error) {
      console.error('[DeptConfig] 加载配置失败:', error.message);
      return this.loadDefaults();
    }
  }

  /**
   * 加载默认配置
   */
  loadDefaults() {
    console.log('[DeptConfig] 使用默认配置');
    
    // 核心部门默认值
    const defaults = {
      taizi: { name: '太子', level: 1, responsibilities: ['classification'] },
      zhongshu: { name: '中书省', level: 2, responsibilities: ['planning'] },
      menxia: { name: '门下省', level: 2, responsibilities: ['audit'] },
      shangshu: { name: '尚书省', level: 2, responsibilities: ['dispatch'] },
      libu: { name: '吏部', level: 3, responsibilities: ['skill_management'] },
      bingbu: { name: '兵部', level: 3, responsibilities: ['code_execution'] },
      hubu: { name: '户部', level: 3, responsibilities: ['data_analysis'] },
      'libu-justice': { name: '礼部', level: 3, responsibilities: ['documentation'] },
      xingbu: { name: '刑部', level: 3, responsibilities: ['security_audit'] },
      gongbu: { name: '工部', level: 3, responsibilities: ['deployment'] }
    };
    
    Object.entries(defaults).forEach(([id, cfg]) => {
      this.coreDepartments.set(id, { ...cfg, id, type: 'core', enabled: true });
    });
  }

  /**
   * 获取部门配置
   */
  get(id) {
    return this.coreDepartments.get(id) || this.extensionDepartments.get(id);
  }

  /**
   * 获取所有核心部门
   */
  getCoreDepartments() {
    return Array.from(this.coreDepartments.values());
  }

  /**
   * 获取所有扩展部门
   */
  getExtensionDepartments() {
    return Array.from(this.extensionDepartments.values());
  }

  /**
   * 获取所有部门（核心 + 扩展）
   */
  getAllDepartments() {
    return [
      ...this.getCoreDepartments(),
      ...this.getExtensionDepartments()
    ];
  }

  /**
   * 获取六部
   */
  getLiubu() {
    const liubuIds = ['libu', 'bingbu', 'hubu', 'libu-justice', 'xingbu', 'gongbu'];
    return liubuIds.map(id => this.get(id)).filter(Boolean);
  }

  /**
   * 检查是否是核心部门
   */
  isCore(id) {
    return this.coreDepartments.has(id);
  }

  /**
   * 检查是否是扩展部门
   */
  isExtension(id) {
    return this.extensionDepartments.has(id);
  }

  /**
   * 获取部门执行配置
   */
  getExecutionConfig(id) {
    const dept = this.get(id);
    return dept?.execution || { mode: 'direct', timeout: 60000 };
  }

  /**
   * 获取部门上报模板
   */
  getReportingTemplate(id, type = 'progress') {
    const dept = this.get(id);
    if (!dept?.reporting) return null;
    
    if (type === 'progress') {
      return dept.reporting.progressTemplate || '{name}正在{action}：{detail}';
    }
    return dept.reporting.todoCategories || [];
  }

  /**
   * 格式化上报消息
   */
  formatReport(id, action, detail) {
    const dept = this.get(id);
    if (!dept) return `${id}正在${action}：${detail}`;
    
    const template = this.getReportingTemplate(id, 'progress');
    return template
      .replace('{name}', dept.name)
      .replace('{action}', action)
      .replace('{detail}', detail);
  }

  /**
   * 获取审核规则（门下省用）
   */
  getAuditRules(id) {
    const dept = this.get(id);
    return dept?.auditRules || {};
  }

  /**
   * 热重载配置
   */
  reload() {
    console.log('[DeptConfig] 重新加载配置...');
    this.coreDepartments.clear();
    this.extensionDepartments.clear();
    this.load();
  }

  /**
   * 监听配置文件变化
   */
  watch() {
    if (!fs.existsSync(this.configPath)) return;
    
    fs.watchFile(this.configPath, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        console.log('[DeptConfig] 配置文件变化，重新加载');
        this.reload();
      }
    });
    
    console.log('[DeptConfig] 已启用配置热重载');
  }
}

module.exports = { DepartmentConfigManager };
