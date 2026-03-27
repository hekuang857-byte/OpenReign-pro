/**
 * 总工程师宪章执行器
 * 融入三省六部流程，不独立运行
 */

const fs = require('fs');
const path = require('path');

class CharterEnforcer {
  constructor(configPath) {
    this.charter = this.loadCharter(configPath);
    this.auditLog = [];
  }

  loadCharter(configPath) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('[宪章] 加载失败，使用默认:', error.message);
      return { principles: [] };
    }
  }

  /**
   * 检查承诺（由各部门调用）
   */
  async check(principleId, context) {
    const principle = this.charter.principles.find(p => p.id === principleId);
    if (!principle) {
      return { passed: true, note: '无此承诺' };
    }

    const result = await this.executeCheck(principle, context);
    
    // 记录审计
    this.auditLog.push({
      principle: principleId,
      dept: principle.enforcedBy,
      context: context.taskId,
      result: result.passed,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * 执行具体检查
   */
  async executeCheck(principle, context) {
    switch (principle.id) {
      case 'no_simplification':
        return this.checkNoSimplification(context);
      case 'no_skip_validation':
        return this.checkNoSkipValidation(context);
      case 'full_report':
        return this.checkFullReport(context);
      case 'quality_first':
        return this.checkQualityFirst(context);
      default:
        return { passed: true };
    }
  }

  /**
   * 承诺1：不简化代码（中书省规划时检查）
   */
  checkNoSimplification(context) {
    const { plan, userChoice } = context;
    
    // 默认推荐完整方案
    if (!userChoice) {
      return {
        passed: true,
        recommendation: 'complete',
        note: '【中书省】默认推荐完整方案',
        canOverride: true
      };
    }

    // 用户选择简化
    if (userChoice === 'simplified') {
      return {
        passed: true,
        warning: '【中书省】陛下选择简化方案，效果可能受损',
        note: '用户主动选择简化，记录备查'
      };
    }

    return { passed: true };
  }

  /**
   * 承诺2：不跳过验证（勘验司验收时检查）
   */
  checkNoSkipValidation(context) {
    const { checks, results, taskType } = context;
    
    // 动态确定检查项（根据任务类型）
    const requiredChecks = this.determineChecks(taskType);
    
    // 检查是否有遗漏
    const missingChecks = requiredChecks.filter(c => !checks.includes(c));
    if (missingChecks.length > 0) {
      return {
        passed: false,
        error: `【勘验司】遗漏检查项：${missingChecks.join(', ')}`,
        action: 'require_all_checks'
      };
    }

    // 检查是否全部通过
    const failedChecks = results.filter(r => !r.passed);
    if (failedChecks.length > 0) {
      return {
        passed: false,
        error: `【勘验司】未通过项：${failedChecks.map(f => f.name).join(', ')}`,
        action: 'return_for_fix'
      };
    }

    return {
      passed: true,
      note: `【勘验司】${checks.length}项检查全部通过`
    };
  }

  /**
   * 动态确定检查项
   */
  determineChecks(taskType) {
    const checkMap = {
      'dept_installation': [
        'config_schema', 'id_unique', 'parent_exists',
        'execution_mode', 'terms_complete', 'code_impl',
        'frontend_display', 'state_machine', 'permission_matrix', 'docs_complete'
      ],
      'skill_installation': [
        'skill_exists', 'config_valid', 'execution_ready', 'docs_complete'
      ],
      'task_execution': [
        'plan_complete', 'resources_ready', 'permissions_valid'
      ],
      'default': ['basic_check', 'result_valid']
    };

    return checkMap[taskType] || checkMap['default'];
  }

  /**
   * 承诺3：完整报告（六部执行时检查）
   */
  checkFullReport(context) {
    const { logs, step } = context;
    
    // 检查是否有日志
    if (!logs || logs.length === 0) {
      return {
        passed: false,
        warning: '【六部】缺少审计日志',
        action: 'auto_generate_log'
      };
    }

    return {
      passed: true,
      note: `【六部】${step}步骤已记录审计日志`,
      logCount: logs.length
    };
  }

  /**
   * 承诺4：效果优先（皇上决策时提示）
   */
  checkQualityFirst(context) {
    const { options, userChoice } = context;
    
    // 默认推荐质量方案
    const qualityOption = options.find(o => o.quality === 'high');
    const fastOption = options.find(o => o.speed === 'fast');

    if (!userChoice) {
      return {
        passed: true,
        recommendation: qualityOption?.id,
        note: '【系统】默认推荐高质量方案',
        warning: fastOption ? '快速方案效果可能不佳' : null,
        canChoose: true
      };
    }

    if (userChoice === fastOption?.id) {
      return {
        passed: true,
        warning: '【系统】陛下选择快速方案，效果可能受损',
        note: '用户主动选择，记录备查'
      };
    }

    return { passed: true };
  }

  /**
   * 生成宪章执行报告
   */
  generateReport(taskId) {
    const taskLogs = this.auditLog.filter(l => l.context === taskId);
    
    return {
      taskId,
      totalChecks: taskLogs.length,
      passed: taskLogs.filter(l => l.result).length,
      failed: taskLogs.filter(l => !l.result).length,
      details: taskLogs,
      summary: taskLogs.every(l => l.result) 
        ? '✅ 所有承诺已遵守'
        : `⚠️ ${taskLogs.filter(l => !l.result).length}项待注意`
    };
  }

  /**
   * 保存审计日志
   */
  async saveAuditLog(taskId) {
    const report = this.generateReport(taskId);
    // 实际保存逻辑由调用方处理
    return report;
  }
}

module.exports = { CharterEnforcer };
