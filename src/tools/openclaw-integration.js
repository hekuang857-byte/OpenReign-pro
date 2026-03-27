#!/usr/bin/env node

/**
 * OpenReign Pro - OpenClaw Gateway 集成入口
 * 
 * 使用方法:
 * 1. 将此文件放入 OpenClaw 的 hooks 目录
 * 2. 或在 OpenClaw 配置中引用此模块
 * 
 * 功能:
 * - 拦截所有消息
 * - 太子分拣（简单/复杂任务）
 * - 简单任务直接处理
 * - 复杂任务创建 OpenReign 奏折
 */

const { OpenReignBridge } = require('./openreign-bridge');

// 全局桥接实例
let bridge = null;

/**
 * 初始化 OpenReign 集成
 * @param {Object} openclaw - OpenClaw 实例
 */
function init(openclaw) {
  console.log('[OpenReign] 初始化集成...');
  
  bridge = new OpenReignBridge({
    openreignEndpoint: 'http://localhost:18790',
    gatewayEndpoint: openclaw.config?.gateway?.endpoint || 'http://localhost:18789'
  });
  
  // 监听消息事件
  openclaw.on('message', handleMessage);
  
  console.log('[OpenReign] 集成完成，等待消息...');
}

/**
 * 处理消息
 * @param {Object} message - OpenClaw 消息对象
 * @param {Function} next - 下一个处理器
 */
async function handleMessage(message, next) {
  // 如果桥接未初始化，跳过
  if (!bridge) {
    return next();
  }
  
  try {
    const result = await bridge.processMessage({
      text: message.text,
      user: message.user,
      channel: message.channel,
      sessionId: message.sessionId
    });
    
    // 如果是直接回复，拦截消息
    if (result.type === 'direct_reply') {
      // 发送回复
      message.reply(result.reply);
      return; // 不继续传递
    }
    
    // 如果是任务创建，先回复用户，然后继续传递（如果需要）
    if (result.type === 'task_created') {
      message.reply(result.reply);
      // 可以继续传递或停止
      return;
    }
    
    // 其他情况继续传递
    next();
  } catch (error) {
    console.error('[OpenReign] 处理消息失败:', error);
    next();
  }
}

/**
 * OpenClaw 插件导出
 */
module.exports = {
  name: 'openreign-pro',
  version: '1.2.2',
  description: 'OpenReign Pro - 三省六部治理架构',
  
  // 生命周期钩子
  async onLoad(openclaw) {
    init(openclaw);
  },
  
  async onUnload() {
    console.log('[OpenReign] 卸载集成');
    bridge = null;
  },
  
  // 命令扩展
  commands: {
    'openreign.status': {
      description: '查看 OpenReign 状态',
      async execute() {
        if (!bridge) {
          return 'OpenReign 未初始化';
        }
        const tasks = await bridge.getRunningTasks();
        return `OpenReign 运行中，当前有 ${tasks.count || 0} 个任务在执行`;
      }
    },
    
    'openreign.tasks': {
      description: '查看运行中任务',
      async execute() {
        if (!bridge) {
          return 'OpenReign 未初始化';
        }
        const result = await bridge.getRunningTasks();
        if (!result.tasks || result.tasks.length === 0) {
          return '暂无运行中任务';
        }
        return result.tasks.map(t => `- ${t.taskId}: ${t.status}`).join('\n');
      }
    }
  }
};

// 如果直接运行此文件，启动测试
if (require.main === module) {
  console.log('OpenReign Pro - OpenClaw 集成模块');
  console.log('请将此模块通过 OpenClaw 配置加载');
  console.log('');
  console.log('测试太子分拣器:');
  
  const testBridge = new OpenReignBridge();
  
  const testMessages = [
    '你好',
    '帮我写一段Python代码',
    '分析一下这个数据',
    '生成一份项目报告'
  ];
  
  for (const msg of testMessages) {
    const intent = testBridge.classifyIntent(msg);
    console.log(`\n消息: "${msg}"`);
    console.log(`  -> 类型: ${intent.type}`);
    console.log(`  -> 动作: ${intent.action}`);
    console.log(`  -> 原因: ${intent.reason}`);
  }
}
