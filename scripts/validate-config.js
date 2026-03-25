#!/usr/bin/env node

/**
 * OpenReign Pro 配置验证工具
 * 自动检查配置完整性，防止遗漏
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.env.HOME, '.openreign', 'config', 'openreign.json');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const color = colors[level] || colors.reset;
  console.log(`${color}${message}${colors.reset}`);
}

// 加载配置
function loadConfig() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    log('red', `❌ 无法加载配置: ${err.message}`);
    process.exit(1);
  }
}

// 验证部门配置
function validateDepartments(config) {
  const errors = [];
  const warnings = [];
  
  const agents = config.agents;
  const requiredFields = ['id', 'name', 'role', 'enabled', 'model', 'permissions'];
  
  // 检查每个部门
  const allDepts = [
    agents.taizi,
    agents.zhongshu,
    agents.menxia,
    agents.shangshu,
    agents.waishiyuan,
    ...Object.values(agents.liubu)
  ];
  
  allDepts.forEach(dept => {
    // 检查必填字段
    requiredFields.forEach(field => {
      if (!(field in dept)) {
        errors.push(`部门 ${dept.id || 'unknown'} 缺少字段: ${field}`);
      }
    });
    
    // 检查权限配置
    if (dept.permissions) {
      if (!dept.permissions.can_call || !Array.isArray(dept.permissions.can_call)) {
        errors.push(`部门 ${dept.id} permissions.can_call 配置错误`);
      }
    }
    
    // 检查模型配置
    if (dept.model && dept.model !== 'inherit' && dept.model !== 'disabled') {
      const validModels = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-opus'];
      if (!validModels.includes(dept.model)) {
        warnings.push(`部门 ${dept.id} 使用非标准模型: ${dept.model}`);
      }
    }
    
    // 检查层级配置
    if (dept.level) {
      if (!dept.parent && dept.id !== 'taizi') {
        warnings.push(`部门 ${dept.id} 有 level 但没有 parent（建议设置 parent 或标记为根节点）`);
      }
    }
  });
  
  // 检查权限矩阵对称性
  const matrix = config.permissions?.matrix;
  if (matrix) {
    Object.entries(matrix).forEach(([deptId, perms]) => {
      if (perms.can_call) {
        perms.can_call.forEach(target => {
          // 检查目标部门是否存在
          const targetExists = allDepts.some(d => d.id === target) || 
                              target === 'local-tools' || 
                              target === 'external-agents';
          if (!targetExists) {
            errors.push(`权限矩阵: ${deptId} 调用的 ${target} 不存在`);
          }
        });
      }
    });
  }
  
  return { errors, warnings };
}

// 检查缺失的层级定义
function validateLevelDefinitions(config) {
  const errors = [];
  const warnings = [];
  
  // 收集所有使用的层级
  const usedLevels = new Set();
  const agents = config.agents;
  const allDepts = [
    agents.taizi,
    agents.zhongshu,
    agents.menxia,
    agents.shangshu,
    agents.waishiyuan,
    ...Object.values(agents.liubu)
  ];
  
  allDepts.forEach(dept => {
    if (dept.level) {
      usedLevels.add(dept.level);
    }
  });
  
  // 检查是否有 levelDefinitions
  if (!config.level_definitions) {
    warnings.push('缺少 level_definitions 配置（建议添加以支持层级扩展）');
  } else {
    const definedLevels = new Set(config.level_definitions.map(l => l.level));
    usedLevels.forEach(level => {
      if (!definedLevels.has(level)) {
        errors.push(`层级 L${level} 被使用但未在 level_definitions 中定义`);
      }
    });
  }
  
  return { errors, warnings };
}

// 检查外邦使节配置
function validateExternalAgents(config) {
  const errors = [];
  const warnings = [];
  
  const waishiyuan = config.agents?.waishiyuan;
  if (!waishiyuan) {
    errors.push('缺少外史院 (waishiyuan) 配置');
  } else {
    if (!waishiyuan.external_agents || Object.keys(waishiyuan.external_agents).length === 0) {
      warnings.push('外史院没有配置任何外邦使节');
    }
  }
  
  return { errors, warnings };
}

// 检查任务生命周期配置
function validateTaskLifecycle(config) {
  const errors = [];
  const warnings = [];
  
  const lifecycle = config.task_lifecycle;
  if (!lifecycle) {
    errors.push('缺少 task_lifecycle 配置');
  } else {
    const requiredStates = ['created', 'planning', 'reviewing', 'dispatching', 'executing', 'completed', 'failed', 'cancelled'];
    const states = lifecycle.states || [];
    
    requiredStates.forEach(state => {
      if (!states.includes(state)) {
        errors.push(`task_lifecycle.states 缺少状态: ${state}`);
      }
    });
    
    if (!lifecycle.task_id_format) {
      warnings.push('缺少 task_id_format 配置');
    }
    
    if (!lifecycle.cancel_mechanism) {
      warnings.push('缺少 cancel_mechanism 配置');
    }
  }
  
  return { errors, warnings };
}

// 生成修复建议
function generateFixes(errors, warnings) {
  const fixes = [];
  
  if (errors.length > 0) {
    fixes.push('');
    fixes.push('🔧 修复建议:');
    fixes.push('1. 编辑 ~/.openreign/config/openreign.json');
    fixes.push('2. 根据上述错误补充缺失配置');
    fixes.push('3. 运行 openreign-validate 再次验证');
  }
  
  if (warnings.length > 0) {
    fixes.push('');
    fixes.push('💡 优化建议:');
    fixes.push('- 建议修复警告以提升系统稳定性');
    fixes.push('- 参考 docs/CONFIGURATION.md 了解最佳实践');
  }
  
  return fixes;
}

// 主函数
function main() {
  log('blue', '🔍 OpenReign Pro 配置验证工具');
  log('blue', '================================');
  console.log('');
  
  const config = loadConfig();
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  // 运行所有验证
  const validations = [
    { name: '部门配置', fn: validateDepartments },
    { name: '层级定义', fn: validateLevelDefinitions },
    { name: '外邦使节', fn: validateExternalAgents },
    { name: '任务生命周期', fn: validateTaskLifecycle }
  ];
  
  validations.forEach(({ name, fn }) => {
    console.log(`\n📋 检查: ${name}`);
    const { errors, warnings } = fn(config);
    
    if (errors.length === 0 && warnings.length === 0) {
      log('green', '  ✅ 通过');
    } else {
      errors.forEach(err => {
        log('red', `  ❌ ${err}`);
      });
      warnings.forEach(warn => {
        log('yellow', `  ⚠️  ${warn}`);
      });
    }
    
    totalErrors += errors.length;
    totalWarnings += warnings.length;
  });
  
  // 总结
  console.log('');
  log('blue', '================================');
  
  if (totalErrors === 0 && totalWarnings === 0) {
    log('green', '✅ 所有检查通过！配置完整。');
    process.exit(0);
  } else {
    if (totalErrors > 0) {
      log('red', `❌ 发现 ${totalErrors} 个错误`);
    }
    if (totalWarnings > 0) {
      log('yellow', `⚠️  发现 ${totalWarnings} 个警告`);
    }
    
    const fixes = generateFixes([], []);
    fixes.forEach(fix => console.log(fix));
    
    process.exit(totalErrors > 0 ? 1 : 0);
  }
}

main();
