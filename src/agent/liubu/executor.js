/**
 * 扩展部门执行器
 * 支持通过配置添加新部门，无需修改核心代码
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ExtensionExecutor {
  constructor(kanbanClient, options = {}) {
    this.kanban = kanbanClient;
    this.skillCache = new Map();
    this.config = {
      skillsPath: options.skillsPath || '~/.stepclaw/skills',
      scriptsPath: options.scriptsPath || '~/.openreign/extensions',
      timeout: options.timeout || 60000
    };
  }

  /**
   * 执行扩展部门
   */
  async execute(task, deptConfig) {
    const { id, execution, reporting } = deptConfig;
    
    console.log(`[Extension] 执行扩展部门: ${deptConfig.name} (${id})`);
    
    // 1. 上报开始
    await this.reportProgress(task.id, deptConfig, '开始执行');
    
    let result;
    
    // 2. 根据执行模式调用
    switch (execution.mode) {
      case 'skill':
        result = await this.executeBySkill(task, execution, deptConfig);
        break;
      case 'script':
        result = await this.executeByScript(task, execution, deptConfig);
        break;
      case 'agent':
        result = await this.executeByAgent(task, execution, deptConfig);
        break;
      default:
        throw new Error(`未知的执行模式: ${execution.mode}`);
    }
    
    // 3. 上报完成
    await this.reportDone(task.id, deptConfig, result);
    
    return result;
  }

  /**
   * 通过 Skill 执行
   */
  async executeBySkill(task, execution, deptConfig) {
    const { skill, entrypoint = 'execute', timeout = 60000 } = execution;
    
    console.log(`[Extension] 调用 Skill: ${skill}.${entrypoint}()`);
    
    // 上报进度
    await this.reportProgress(task.id, deptConfig, `加载 Skill: ${skill}`);
    
    // 加载 skill
    const skillModule = await this.loadSkill(skill);
    if (!skillModule[entrypoint]) {
      throw new Error(`Skill ${skill} 缺少入口函数: ${entrypoint}`);
    }
    
    // 上报进度
    await this.reportProgress(task.id, deptConfig, `执行 Skill: ${skill}`);
    
    // 执行
    const context = {
      kanban: this.kanban,
      task,
      config: deptConfig,
      report: (action, detail) => this.reportProgress(task.id, deptConfig, `${action}: ${detail}`)
    };
    
    const result = await Promise.race([
      skillModule[entrypoint](task, context),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('执行超时')), timeout)
      )
    ]);
    
    return {
      status: 'completed',
      output: result?.output || JSON.stringify(result),
      summary: result?.summary || `${deptConfig.name}执行完成`
    };
  }

  /**
   * 通过脚本执行
   */
  async executeByScript(task, execution, deptConfig) {
    const { script, args = [], timeout = 60000 } = execution;
    
    console.log(`[Extension] 执行脚本: ${script}`);
    
    // 替换变量
    const replacedArgs = args.map(arg => 
      arg
        .replace('{taskId}', task.id)
        .replace('{taskTitle}', task.title || '')
        .replace('{taskType}', task.type || 'general')
        .replace('{input}', JSON.stringify(task.description || ''))
    );
    
    const command = `${script} ${replacedArgs.join(' ')}`;
    
    // 上报进度
    await this.reportProgress(task.id, deptConfig, `执行脚本: ${script}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout });
      
      if (stderr) {
        console.warn(`[Extension] 脚本警告: ${stderr}`);
      }
      
      return {
        status: 'completed',
        output: stdout,
        summary: `${deptConfig.name}脚本执行完成`
      };
    } catch (error) {
      return {
        status: 'failed',
        output: error.stdout || '',
        error: error.message,
        summary: `${deptConfig.name}脚本执行失败: ${error.message}`
      };
    }
  }

  /**
   * 通过 Agent 执行
   */
  async executeByAgent(task, execution, deptConfig) {
    const { agentId, promptTemplate, timeout = 60000 } = execution;
    
    console.log(`[Extension] 调用 Agent: ${agentId}`);
    
    // 构建 prompt
    const prompt = promptTemplate
      .replace('{taskId}', task.id)
      .replace('{taskTitle}', task.title || '')
      .replace('{taskDescription}', task.description || '')
      .replace('{task}', JSON.stringify(task, null, 2));
    
    // 上报进度
    await this.reportProgress(task.id, deptConfig, `调用 Agent: ${agentId}`);
    
    // TODO: 调用 OpenClaw subagent API
    // const result = await openclaw.callSubagent(agentId, prompt, { timeout });
    
    // 模拟执行
    console.log(`[Extension] Agent Prompt:\n${prompt.substring(0, 200)}...`);
    
    return {
      status: 'completed',
      output: `Agent ${agentId} 执行结果（模拟）`,
      summary: `${deptConfig.name}通过Agent执行完成`
    };
  }

  /**
   * 加载 Skill
   */
  async loadSkill(skillName) {
    // 检查缓存
    if (this.skillCache.has(skillName)) {
      return this.skillCache.get(skillName);
    }
    
    // 尝试多个路径
    const paths = [
      `${this.config.skillsPath}/${skillName}`,
      `${this.config.skillsPath}/${skillName}/index.js`,
      `~/.stepclaw/skills/${skillName}`,
      `~/.stepclaw/skills/${skillName}/index.js`
    ];
    
    for (const skillPath of paths) {
      try {
        const resolvedPath = skillPath.replace('~', process.env.HOME);
        const skill = require(resolvedPath);
        this.skillCache.set(skillName, skill);
        console.log(`[Extension] Skill 加载成功: ${skillName}`);
        return skill;
      } catch (e) {
        // 继续尝试下一个路径
      }
    }
    
    throw new Error(`无法加载 Skill: ${skillName}`);
  }

  /**
   * 上报进度
   */
  async reportProgress(taskId, deptConfig, detail) {
    const template = deptConfig.reporting?.progressTemplate || '{name}正在{action}：{detail}';
    const message = template
      .replace('{name}', deptConfig.name)
      .replace('{action}', '执行')
      .replace('{detail}', detail);
    
    await this.kanban.progress(taskId, message);
  }

  /**
   * 上报完成
   */
  async reportDone(taskId, deptConfig, result) {
    await this.kanban.done(
      taskId,
      result.output,
      result.summary || `${deptConfig.name}执行完成`
    );
  }

  /**
   * 验证扩展部门配置
   */
  validateConfig(config) {
    const required = ['id', 'name', 'type', 'execution'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
      throw new Error(`扩展部门配置缺少必需字段: ${missing.join(', ')}`);
    }
    
    if (config.type !== 'extension') {
      throw new Error(`扩展部门类型必须是 'extension', 实际: ${config.type}`);
    }
    
    const execConfig = config.execution;
    if (!['skill', 'script', 'agent'].includes(execConfig.mode)) {
      throw new Error(`未知的执行模式: ${execConfig.mode}`);
    }
    
    // 根据模式验证必需字段
    switch (execConfig.mode) {
      case 'skill':
        if (!execConfig.skill) {
          throw new Error('skill 模式必需配置: execution.skill');
        }
        break;
      case 'script':
        if (!execConfig.script) {
          throw new Error('script 模式必需配置: execution.script');
        }
        break;
      case 'agent':
        if (!execConfig.agentId) {
          throw new Error('agent 模式必需配置: execution.agentId');
        }
        break;
    }
    
    return true;
  }
}

module.exports = { ExtensionExecutor };
