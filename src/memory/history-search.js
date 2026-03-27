/**
 * 历史技能/部门搜索器
 * 为新部门创建提供历史参考
 */

class HistorySearcher {
  constructor(deptConfig) {
    this.deptConfig = deptConfig;
  }

  /**
   * 搜索相似部门
   */
  async searchSimilarDepts(newDeptDescription) {
    const allDepts = this.deptConfig.getAllDepartments();
    const similarities = [];
    
    for (const dept of allDepts) {
      const similarity = this.calculateSimilarity(newDeptDescription, dept);
      if (similarity.score > 0.3) {  // 相似度阈值
        similarities.push({
          dept: dept,
          score: similarity.score,
          reasons: similarity.reasons
        });
      }
    }
    
    // 按相似度排序
    similarities.sort((a, b) => b.score - a.score);
    
    return similarities.slice(0, 5);  // 返回前5个
  }

  /**
   * 计算相似度
   */
  calculateSimilarity(description, dept) {
    let score = 0;
    const reasons = [];
    
    // 1. 职责关键词匹配
    const descKeywords = this.extractKeywords(description);
    const deptKeywords = [
      ...(dept.responsibilities || []),
      dept.role || '',
      dept.name
    ];
    
    const keywordMatches = descKeywords.filter(k => 
      deptKeywords.some(dk => dk.toLowerCase().includes(k.toLowerCase()))
    );
    
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 0.2;
      reasons.push(`职责匹配: ${keywordMatches.join(', ')}`);
    }
    
    // 2. 执行模式匹配
    if (description.includes('skill') && dept.execution?.mode === 'skill') {
      score += 0.3;
      reasons.push('执行模式: skill');
    }
    if (description.includes('代码') && dept.execution?.mode === 'hybrid') {
      score += 0.3;
      reasons.push('执行模式: 代码');
    }
    
    // 3. 部门类型匹配
    if (description.includes('核心') && dept.type === 'core') {
      score += 0.2;
      reasons.push('类型: 核心部门');
    }
    if (description.includes('扩展') && dept.type === 'extension') {
      score += 0.2;
      reasons.push('类型: 扩展部门');
    }
    
    // 4. 父级匹配
    if (description.includes('尚书') && dept.parent === 'shangshu') {
      score += 0.2;
      reasons.push('归属: 尚书省下属');
    }
    
    return {
      score: Math.min(1.0, score),
      reasons
    };
  }

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    if (!text) return [];
    
    // 技术关键词
    const techKeywords = [
      '分析', '验证', '测试', '检查', '审查', '验收',
      '代码', '开发', '实现', '编写', '生成',
      '数据', '统计', '计算', '处理',
      '安全', '监控', '审计', '防护',
      '部署', '配置', '安装', '维护',
      '文档', '报告', '记录', '归档',
      '智能', 'AI', '学习', '推理', '预测'
    ];
    
    return techKeywords.filter(k => text.includes(k));
  }

  /**
   * 生成参考建议
   */
  generateReference(similarDepts, newDeptName) {
    if (similarDepts.length === 0) {
      return {
        hasReference: false,
        suggestion: '无历史相似部门，建议参考标准模板'
      };
    }
    
    const topRef = similarDepts[0];
    const refDept = topRef.dept;
    
    return {
      hasReference: true,
      reference: {
        id: refDept.id,
        name: refDept.name,
        similarity: Math.round(topRef.score * 100),
        reasons: topRef.reasons
      },
      suggestion: `可参考${refDept.name}的设计：`,
      configTemplate: this.extractConfigTemplate(refDept),
      termTemplate: this.extractTermTemplate(refDept),
      executionTemplate: this.extractExecutionTemplate(refDept)
    };
  }

  /**
   * 提取配置模板
   */
  extractConfigTemplate(dept) {
    return {
      type: dept.type,
      parent: dept.parent,
      level: dept.level,
      execution: {
        mode: dept.execution?.mode,
        timeout: dept.execution?.timeout
      },
      reporting: {
        progressTemplate: dept.reporting?.progressTemplate,
        todoCategories: dept.reporting?.todoCategories
      }
    };
  }

  /**
   * 提取术语模板
   */
  extractTermTemplate(dept) {
    return {
      title: dept.title,
      role: dept.role,
      address: dept.address,
      self_address: dept.self_address
    };
  }

  /**
   * 提取执行模板
   */
  extractExecutionTemplate(dept) {
    return {
      mode: dept.execution?.mode,
      skill: dept.execution?.skill,
      entrypoint: dept.execution?.entrypoint,
      timeout: dept.execution?.timeout
    };
  }

  /**
   * 智能生成新部门配置
   */
  async generateDeptConfig(newDeptDescription, newDeptId, newDeptName) {
    // 搜索相似部门
    const similarDepts = await this.searchSimilarDepts(newDeptDescription);
    
    // 生成参考建议
    const reference = this.generateReference(similarDepts, newDeptName);
    
    // 基于参考生成配置
    const config = {
      id: newDeptId,
      name: newDeptName,
      type: 'extension',
      parent: 'shangshu',
      level: 3,
      
      // 基于参考或默认
      title: reference.termTemplate?.title || `${newDeptName}郎中`,
      role: this.inferRole(newDeptDescription) || '辅助执行',
      
      responsibilities: this.inferResponsibilities(newDeptDescription),
      
      execution: {
        mode: reference.executionTemplate?.mode || 'skill',
        skill: newDeptId,
        entrypoint: 'execute',
        timeout: reference.executionTemplate?.timeout || 60000
      },
      
      reporting: {
        progressTemplate: reference.termTemplate?.progressTemplate || 
          `启奏陛下，${newDeptName}正在{action}，{detail}`,
        todoCategories: reference.termTemplate?.todoCategories || 
          ['任务接收', '方案制定', '执行办理', '结果汇报']
      },
      
      // 参考来源
      _reference: reference
    };
    
    return config;
  }

  /**
   * 推断职责
   */
  inferResponsibilities(description) {
    const responsibilities = [];
    
    if (description.includes('分析')) responsibilities.push('数据分析');
    if (description.includes('验证')) responsibilities.push('验证检查');
    if (description.includes('测试')) responsibilities.push('测试验证');
    if (description.includes('代码')) responsibilities.push('代码生成');
    if (description.includes('文档')) responsibilities.push('文档编写');
    if (description.includes('部署')) responsibilities.push('部署配置');
    if (description.includes('安全')) responsibilities.push('安全审查');
    if (description.includes('智能') || description.includes('AI')) {
      responsibilities.push('智能分析');
      responsibilities.push('辅助决策');
    }
    
    return responsibilities.length > 0 ? responsibilities : ['辅助执行'];
  }

  /**
   * 推断角色
   */
  inferRole(description) {
    if (description.includes('智能') || description.includes('AI')) {
      return '演算智能，辅助决策';
    }
    if (description.includes('分析')) {
      return '数据分析，洞察规律';
    }
    if (description.includes('验证') || description.includes('检查')) {
      return '验证检查，质量把关';
    }
    return '辅助执行';
  }
}

module.exports = { HistorySearcher };
