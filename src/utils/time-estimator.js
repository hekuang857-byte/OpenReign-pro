/**
 * AI动态时间预估器
 * 三层预估：AI预估 → 历史校正 → 实时调整
 */

const fs = require('fs');
const path = require('path');

class TimeEstimator {
  constructor(options = {}) {
    this.historyFile = options.historyFile || path.join(__dirname, '..', 'data', 'time-history.json');
    this.aiModel = options.aiModel || 'default';
    this.minConfidence = options.minConfidence || 70;
  }

  /**
   * 主预估方法：三层预估
   */
  async estimate(task, subtasks = []) {
    console.log(`[时间预估] 开始预估任务: ${task.id}`);
    
    // 第一层：AI预估算
    const aiEstimates = await this.estimateByAI(task, subtasks);
    
    // 第二层：历史数据校正
    const correctedEstimates = await this.correctByHistory(aiEstimates);
    
    // 第三层：计算总时间
    const totalTime = this.calculateTotalTime(correctedEstimates);
    
    console.log(`[时间预估] 完成: 总时间${totalTime.mostLikely} (置信度${totalTime.confidence}%)`);
    
    return {
      subtasks: correctedEstimates,
      total: totalTime,
      source: 'ai+history'
    };
  }

  /**
   * 第一层：AI动态预估算
   */
  async estimateByAI(task, subtasks) {
    const estimates = [];
    
    for (const subtask of subtasks) {
      // 构建AI提示
      const prompt = this.buildEstimatePrompt(task, subtask);
      
      // 调用AI预估（模拟，实际应调用LLM）
      const estimate = await this.callAIForEstimate(prompt);
      
      estimates.push({
        ...subtask,
        aiEstimate: estimate,
        estimatedTime: estimate.mostLikely,
        confidence: estimate.confidence,
        factors: estimate.factors
      });
    }
    
    return estimates;
  }

  /**
   * 构建AI预估提示
   */
  buildEstimatePrompt(task, subtask) {
    return `
你是一名经验丰富的AI项目管理者，擅长预估AI辅助开发的时间。

【任务信息】
- 任务名称：${subtask.title}
- 任务描述：${subtask.description || '无详细描述'}
- 执行部门：${subtask.dept}
- 任务类型：${subtask.type || 'general'}

【AI速度参考】
- AI代码生成速度：约500行/分钟
- AI文档生成速度：约1000字/分钟
- AI配置生成速度：约50行/分钟
- AI测试速度：约20个case/分钟

【预估考虑因素】
1. 任务复杂度（简单/中等/复杂）
2. 需要生成的代码/文档量
3. 验证测试的范围
4. 可能的调试迭代次数
5. 部门专业度（核心部门vs扩展部门）

【输出格式】
请用JSON格式返回：
{
  "optimistic": "乐观时间（如'5分钟'）",
  "pessimistic": "悲观时间（如'15分钟'）",
  "mostLikely": "最可能时间（如'10分钟'）",
  "confidence": 置信度（0-100数字）,
  "factors": ["影响因素1", "影响因素2"],
  "reasoning": "预估理由"
}
`;
  }

  /**
   * 调用AI进行预估（模拟实现）
   */
  async callAIForEstimate(prompt) {
    // TODO: 实际应调用LLM API
    // 这里用启发式规则模拟AI预估
    
    const subtask = this.extractSubtaskFromPrompt(prompt);
    
    // 基于任务类型和部门预估（修正：大幅降低基础时间，提高AI加成）
    const baseTimes = {
      'config': { min: 0.5, max: 2, avg: 1 },     // 配置类：30秒-2分钟
      'code': { min: 1, max: 5, avg: 2 },         // 代码类：1-5分钟
      'doc': { min: 0.5, max: 3, avg: 1 },        // 文档类：30秒-3分钟
      'test': { min: 1, max: 4, avg: 2 },         // 测试类：1-4分钟
      'deploy': { min: 0.5, max: 2, avg: 1 }      // 部署类：30秒-2分钟
    };
    
    const deptMultipliers = {
      'zhongshu': 1.2,    // 规划需要思考
      'menxia': 0.8,      // 审议相对快
      'shangshu': 0.5,    // 派发很快
      'libu': 0.8,        // 技能管理
      'bingbu': 1.0,      // 代码执行
      'hubu': 0.7,        // 数据分析
      'libu-justice': 0.6, // 文档编写
      'xingbu': 0.9,      // 测试审查
      'gongbu': 0.8,      // 部署运维
      'kanys': 0.7        // 验收检查
    };
    
    // 判断任务类型
    let taskType = 'config';
    if (prompt.includes('代码') || prompt.includes('实现')) taskType = 'code';
    if (prompt.includes('文档') || prompt.includes('编写')) taskType = 'doc';
    if (prompt.includes('测试') || prompt.includes('验证')) taskType = 'test';
    if (prompt.includes('部署') || prompt.includes('配置')) taskType = 'deploy';
    
    const base = baseTimes[taskType] || baseTimes.config;
    const multiplier = deptMultipliers[subtask.dept] || 1.0;
    
    // AI速度加成（现代AI比人快50-100倍，2026年水平）
    const aiSpeedup = 60;
    
    const optimistic = Math.max(1, Math.round(base.min * multiplier / aiSpeedup));
    const pessimistic = Math.max(optimistic + 2, Math.round(base.max * multiplier / aiSpeedup));
    const mostLikely = Math.round(base.avg * multiplier / aiSpeedup);
    
    // 置信度基于任务清晰度
    let confidence = 75;
    if (subtask.description && subtask.description.length > 50) confidence += 10;
    if (subtask.dept) confidence += 5;
    confidence = Math.min(95, confidence);
    
    return {
      optimistic: `${optimistic}分钟`,
      pessimistic: `${pessimistic}分钟`,
      mostLikely: `${mostLikely}分钟`,
      confidence,
      factors: [
        `任务类型: ${taskType}`,
        `执行部门: ${subtask.dept}`,
        `AI速度加成: ${aiSpeedup}x`
      ],
      reasoning: `基于${taskType}类型和${subtask.dept}部门，考虑AI${aiSpeedup}倍速度加成`
    };
  }

  /**
   * 从prompt提取subtask信息
   */
  extractSubtaskFromPrompt(prompt) {
    const deptMatch = prompt.match(/执行部门：(\w+)/);
    const titleMatch = prompt.match(/任务名称：(.+)/);
    const descMatch = prompt.match(/任务描述：(.+)/);
    
    return {
      dept: deptMatch ? deptMatch[1] : 'unknown',
      title: titleMatch ? titleMatch[1].trim() : 'unknown',
      description: descMatch ? descMatch[1].trim() : ''
    };
  }

  /**
   * 第二层：历史数据校正
   */
  async correctByHistory(estimates) {
    const history = await this.loadHistory();
    
    return estimates.map(est => {
      // 查找相似历史任务
      const similar = this.findSimilarInHistory(est, history);
      
      if (similar.length >= 3) {
        // 有足够历史数据，用历史平均
        const avgActual = similar.reduce((sum, h) => sum + h.actualMinutes, 0) / similar.length;
        const aiMinutes = this.parseTime(est.aiEstimate.mostLikely);
        
        // 加权平均：历史60% + AI预估40%
        const corrected = Math.round(avgActual * 0.6 + aiMinutes * 0.4);
        
        return {
          ...est,
          estimatedTime: `${corrected}分钟`,
          historicalCorrection: true,
          historicalAvg: `${Math.round(avgActual)}分钟`,
          aiEstimate: est.aiEstimate.mostLikely,
          source: 'history+corrected'
        };
      }
      
      // 无足够历史数据，用AI预估（但标记为首次，建议后续学习）
      return {
        ...est,
        historicalCorrection: false,
        source: 'ai-only',
        note: '首次执行，预估偏保守，执行后将学习优化'
      };
    });
  }

  /**
   * 查找相似历史任务
   */
  findSimilarInHistory(est, history) {
    return history.filter(h => {
      // 同部门
      if (h.dept !== est.dept) return false;
      
      // 标题相似度（简单包含）
      const titleSimilar = h.title.includes(est.title) || 
                          est.title.includes(h.title);
      
      return titleSimilar;
    }).slice(0, 10); // 最多10条
  }

  /**
   * 第三层：计算总时间
   */
  calculateTotalTime(estimates) {
    // 按部门分组（并行执行）
    const byDept = {};
    for (const est of estimates) {
      if (!byDept[est.dept]) byDept[est.dept] = [];
      byDept[est.dept].push(est);
    }
    
    // 每个部门取最大时间（并行）
    let totalMinutes = 0;
    for (const [dept, tasks] of Object.entries(byDept)) {
      const deptMax = Math.max(...tasks.map(t => this.parseTime(t.estimatedTime)));
      totalMinutes += deptMax;
    }
    
    // 平均置信度
    const avgConfidence = Math.round(
      estimates.reduce((sum, e) => sum + (e.confidence || 75), 0) / estimates.length
    );
    
    return {
      optimistic: `${Math.round(totalMinutes * 0.7)}分钟`,
      pessimistic: `${Math.round(totalMinutes * 1.3)}分钟`,
      mostLikely: `${totalMinutes}分钟`,
      confidence: avgConfidence
    };
  }

  /**
   * 解析时间字符串为分钟
   */
  parseTime(timeStr) {
    if (!timeStr) return 0;
    
    const match = timeStr.match(/(\d+)\s*分钟?/);
    if (match) return parseInt(match[1], 10);
    
    const hourMatch = timeStr.match(/(\d+)\s*小时?/);
    if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
    
    return 0;
  }

  /**
   * 加载历史数据
   */
  async loadHistory() {
    try {
      if (!fs.existsSync(this.historyFile)) return [];
      const data = fs.readFileSync(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('[时间预估] 加载历史数据失败:', error.message);
      return [];
    }
  }

  /**
   * 保存实际执行时间（用于学习）
   */
  async saveActualTime(task, subtask, actualMinutes) {
    try {
      const history = await this.loadHistory();
      
      history.push({
        taskId: task.id,
        subtaskId: subtask.id,
        title: subtask.title,
        dept: subtask.dept,
        estimatedMinutes: this.parseTime(subtask.estimatedTime),
        actualMinutes,
        timestamp: new Date().toISOString()
      });
      
      // 只保留最近1000条
      if (history.length > 1000) {
        history.shift();
      }
      
      // 确保目录存在
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
      
      console.log(`[时间预估] 记录实际时间: ${subtask.title} = ${actualMinutes}分钟`);
    } catch (error) {
      console.warn('[时间预估] 保存历史数据失败:', error.message);
    }
  }

  /**
   * 实时调整预估（执行中调用）
   */
  async adjustEstimate(task, elapsedMinutes, progressPercent) {
    if (progressPercent <= 0) return null;
    
    // 基于当前进度重新预估
    const remainingPercent = 1 - progressPercent;
    const estimatedTotal = elapsedMinutes / progressPercent;
    const remainingMinutes = estimatedTotal * remainingPercent;
    
    return {
      originalEstimate: task.plan?.totalEstimatedTime,
      adjustedRemaining: `${Math.round(remainingMinutes)}分钟`,
      estimatedTotal: `${Math.round(estimatedTotal)}分钟`,
      adjustment: remainingMinutes < elapsedMinutes ? '提前' : '延后'
    };
  }
}

module.exports = { TimeEstimator };
