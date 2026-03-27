/**
 * OpenReign Pro - OpenClaw Gateway 桥接模块
 * 实现太子分拣逻辑和任务流转
 */

const EventEmitter = require('events');

class OpenReignBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.openreignEndpoint = options.openreignEndpoint || 'http://localhost:18790';
    this.gatewayEndpoint = options.gatewayEndpoint || 'http://localhost:18789';
    this.timeout = options.timeout || 30000;
  }

  /**
   * 太子分拣 - 识别用户意图
   * @param {string} message - 用户输入
   * @param {Object} context - 上下文信息
   * @returns {Object} 分拣结果
   */
  classifyIntent(message, context = {}) {
    // 闲聊模式识别
    const chatPatterns = [
      { pattern: /^(你好|在吗|嗨|hi|hello|hey)$/i, type: 'greeting' },
      { pattern: /^(谢谢|感谢|thx|thanks)$/i, type: 'thanks' },
      { pattern: /^(再见|拜拜|bye|goodbye)$/i, type: 'farewell' },
      { pattern: /^(帮助|help|怎么|如何|是什么)$/i, type: 'help' },
      { pattern: /^(怎么样|好吗|可以吗)$/i, type: 'chat' }
    ];

    for (const { pattern, type } of chatPatterns) {
      if (pattern.test(message)) {
        return {
          type: 'chat',
          subtype: type,
          action: 'direct_reply',
          reason: `识别为${type}，直接回复`,
          complexity: 1
        };
      }
    }

    // 简单查询识别
    const queryPatterns = [
      { pattern: /查.*天气|天气.*怎么样/i, type: 'weather_query' },
      { pattern: /现在.*时间|几点了/i, type: 'time_query' },
      { pattern: /搜索|查找|查一下/i, type: 'search_query' }
    ];

    for (const { pattern, type } of queryPatterns) {
      if (pattern.test(message)) {
        return {
          type: 'simple_task',
          subtype: type,
          action: 'execute_directly',
          reason: `识别为${type}，直接执行`,
          complexity: 2
        };
      }
    }

    // 复杂任务识别
    const complexPatterns = [
      { pattern: /写.*(代码|程序|脚本)/i, type: 'code_generation', dept: 'bingbu' },
      { pattern: /分析.*数据|处理.*文件/i, type: 'data_analysis', dept: 'hubu' },
      { pattern: /生成.*文档|写.*报告|制作.*PPT/i, type: 'document_creation', dept: 'libu-justice' },
      { pattern: /安装.*技能|添加.*插件/i, type: 'skill_install', dept: 'libu' },
      { pattern: /检查.*安全|审计|漏洞/i, type: 'security_audit', dept: 'xingbu' },
      { pattern: /部署|发布|上线/i, type: 'deployment', dept: 'gongbu' }
    ];

    for (const { pattern, type, dept } of complexPatterns) {
      if (pattern.test(message)) {
        return {
          type: 'complex_task',
          subtype: type,
          action: 'create_task',
          targetDept: dept,
          reason: `识别为${type}，需要${dept}执行`,
          complexity: 5
        };
      }
    }

    // 默认作为一般任务
    return {
      type: 'general_task',
      action: 'create_task',
      reason: '一般任务，进入标准流程',
      complexity: 3
    };
  }

  /**
   * 处理消息 - 太子入口
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 处理结果
   */
  async processMessage(message) {
    const { text, user, channel, sessionId } = message;
    
    console.log(`[太子] 收到消息: ${text.slice(0, 50)}...`);
    
    // 1. 分拣意图
    const intent = this.classifyIntent(text, { user, channel });
    console.log(`[太子] 分拣结果:`, intent);

    // 2. 简单任务直接处理
    if (intent.type === 'chat' || intent.type === 'simple_task') {
      return this.handleSimpleTask(text, intent);
    }

    // 3. 复杂任务创建奏折
    return this.createTask(text, intent, { user, channel, sessionId });
  }

  /**
   * 处理简单任务
   */
  async handleSimpleTask(text, intent) {
    // 闲聊直接回复
    if (intent.type === 'chat') {
      const replies = {
        greeting: '你好！我是 OpenReign Pro，有什么可以帮你的吗？',
        thanks: '不客气！随时为您服务。',
        farewell: '再见！有需要随时找我。',
        help: '我可以帮您：写代码、分析数据、生成文档、管理技能等。请直接告诉我您的需求。',
        chat: '我在听，请继续说。'
      };
      
      return {
        success: true,
        type: 'direct_reply',
        reply: replies[intent.subtype] || '我在听，请继续说。'
      };
    }

    // 简单任务直接执行
    return {
      success: true,
      type: 'direct_execute',
      message: `收到，正在为您${intent.subtype === 'weather_query' ? '查询天气' : '处理'}...`
    };
  }

  /**
   * 创建任务（奏折）
   */
  async createTask(text, intent, context) {
    try {
      const response = await fetch(`${this.openreignEndpoint}/api/zouzhe/zhixing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: intent.subtype || 'general_task',
          description: text,
          priority: intent.complexity > 4 ? 'high' : 'normal',
          context: {
            user: context.user,
            channel: context.channel,
            sessionId: context.sessionId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`[太子] 奏折已呈上: ${result.taskId}`);
      
      return {
        success: true,
        type: 'task_created',
        taskId: result.taskId,
        reply: `已收到旨意，奏折已呈上：**${result.taskId}**\n\n任务将经过中书省规划、门下省审核、尚书省派发，最后由${intent.targetDept || '六部'}执行。\n\n您可以通过 Dashboard 查看进度: http://localhost:18790`
      };
    } catch (error) {
      console.error('[太子] 创建任务失败:', error);
      
      return {
        success: false,
        type: 'error',
        reply: '抱歉，奏折呈递失败，请稍后重试。'
      };
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId) {
    try {
      const response = await fetch(`${this.openreignEndpoint}/api/zouzhe/${taskId}/zhuangtai`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[太子] 查询任务状态失败:', error);
      return null;
    }
  }

  /**
   * 获取运行中任务列表
   */
  async getRunningTasks() {
    try {
      const response = await fetch(`${this.openreignEndpoint}/api/zouzhe/yunxing`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[太子] 获取任务列表失败:', error);
      return { tasks: [] };
    }
  }
}

module.exports = { OpenReignBridge };
