/**
 * OpenReign Pro - 项目入口
 * 基于三省六部制的 AI 多 Agent 协作框架
 */

const path = require('path');

// 配置模块路径
module.exports = {
    // 核心引擎
    core: {
        orchestrator: require('./core/orchestrator'),
        stateMachine: require('./core/state-machine'),
        charterEnforcer: require('./core/charter-enforcer')
    },
    
    // Agent 模块
    agent: {
        taizi: require('./agent/taizi/classifier'),
        liubu: require('./agent/liubu/executor')
    },
    
    // 工具
    tools: {
        openreignBridge: require('./tools/openreign-bridge'),
        kanbanClient: require('./tools/kanban-client')
    },
    
    // 记忆
    memory: {
        historySearch: require('./memory/history-search')
    },
    
    // 配置
    config: {
        loader: require('./config/loader')
    },
    
    // 工具函数
    utils: {
        classicalFormatter: require('./utils/classical-formatter'),
        memorialFormatter: require('./utils/memorial-formatter'),
        timeEstimator: require('./utils/time-estimator'),
        permissionMatrix: require('./utils/permission-matrix')
    },
    
    version: '1.2.2'
};

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    console.log('🚀 OpenReign Pro v1.2.2');
    console.log('使用 npm run start:server 启动服务器');
    console.log('使用 npm run start:dashboard 启动前端');
}
