/**
 * 太子分拣器 - 参考 edict 项目实现
 * 职责：消息接入总负责，识别旨意 vs 闲聊
 */

class TaiziClassifier {
  constructor(config = {}) {
    // 可配置的部门映射（支持扩展）
    this.deptMapping = config.deptMapping || {
      // 核心部门
      taizi: { name: '太子', level: 1, category: 'core' },
      zhongshu: { name: '中书省', level: 2, category: 'core' },
      menxia: { name: '门下省', level: 2, category: 'core' },
      shangshu: { name: '尚书省', level: 2, category: 'core' },
      
      // 六部
      libu: { name: '吏部', level: 3, category: 'execution', role: '人事与技能管理' },
      bingbu: { name: '兵部', level: 3, category: 'execution', role: '代码执行与工具调用' },
      hubu: { name: '户部', level: 3, category: 'execution', role: '数据与记忆管理' },
      'libu-justice': { name: '礼部', level: 3, category: 'execution', role: '文档与沟通管理' },
      xingbu: { name: '刑部', level: 3, category: 'execution', role: '安全与审计' },
      gongbu: { name: '工部', level: 3, category: 'execution', role: '部署与运维' },
      
      // 可扩展部门
      ...(config.customDepts || {})
    };
    
    // 旨意识别模式（15+ 种任务类型）
    this.edictPatterns = [
      // 代码相关 (复杂度 4-5)
      { pattern: /写.*代码|编写.*程序|实现.*功能|开发.*模块|修复.*bug|优化.*性能|重构.*代码/i, type: 'code', dept: 'bingbu', complexity: 5, priority: 'high' },
      { pattern: /测试.*代码|单元测试|集成测试|自动化测试|E2E.*测试|测试.*方案/i, type: 'test', dept: 'xingbu', complexity: 4, priority: 'normal' },
      { pattern: /调试.*程序|排查.*问题|定位.*bug|解决.*错误/i, type: 'debug', dept: 'bingbu', complexity: 4, priority: 'high' },
      { pattern: /代码.*审查|review.*代码|检查.*代码.*质量/i, type: 'code_review', dept: 'xingbu', complexity: 3, priority: 'normal' },
      
      // 数据分析 (复杂度 3-4)
      { pattern: /分析.*数据|处理.*文件|读取.*Excel|解析.*CSV|统计.*报表|数据.*清洗/i, type: 'data', dept: 'hubu', complexity: 4, priority: 'normal' },
      { pattern: /生成.*图表|可视化|画图|plot|chart|数据.*展示/i, type: 'visualization', dept: 'hubu', complexity: 3, priority: 'low' },
      { pattern: /机器学习|训练.*模型|预测.*分析|算法.*实现/i, type: 'ml', dept: 'hubu', complexity: 5, priority: 'high' },
      
      // 文档相关 (复杂度 3-4)
      { pattern: /写.*文档|生成.*报告|制作.*PPT|编写.*说明|撰写.*方案|起草.*文件/i, type: 'document', dept: 'libu-justice', complexity: 4, priority: 'normal' },
      { pattern: /转换.*格式|导出.*PDF|生成.*Word|Excel.*报表|格式.*转换/i, type: 'format', dept: 'libu-justice', complexity: 3, priority: 'low' },
      { pattern: /翻译.*文档|多语言|国际化|i18n/i, type: 'translate', dept: 'libu-justice', complexity: 3, priority: 'normal' },
      
      // 技能/工具 (复杂度 2-3)
      { pattern: /安装.*技能|添加.*插件|配置.*工具|设置.*环境|初始化.*项目/i, type: 'skill', dept: 'libu', complexity: 3, priority: 'normal' },
      { pattern: /卸载.*技能|删除.*插件|移除.*工具|清理.*环境/i, type: 'skill_remove', dept: 'libu', complexity: 3, priority: 'normal' },
      { pattern: /更新.*技能|升级.*插件|版本.*更新/i, type: 'skill_update', dept: 'libu', complexity: 2, priority: 'low' },
      
      // 部署运维 (复杂度 4-5)
      { pattern: /部署|发布|上线|构建|打包|Docker|容器|K8s|Kubernetes/i, type: 'deploy', dept: 'gongbu', complexity: 5, priority: 'high' },
      { pattern: /监控|日志|告警|性能.*分析|链路.*追踪/i, type: 'monitor', dept: 'gongbu', complexity: 4, priority: 'normal' },
      { pattern: /CI.*CD|持续集成|持续部署|流水线|GitHub.*Actions/i, type: 'cicd', dept: 'gongbu', complexity: 4, priority: 'normal' },
      
      // 安全审计 (复杂度 4-5)
      { pattern: /检查.*安全|安全.*审计|漏洞.*扫描|合规.*检查|风险.*评估|渗透.*测试/i, type: 'security', dept: 'xingbu', complexity: 5, priority: 'high' },
      { pattern: /代码.*审计|依赖.*检查|许可证.*合规|SBOM/i, type: 'audit', dept: 'xingbu', complexity: 4, priority: 'normal' },
      
      // 搜索查询 (复杂度 1-2)
      { pattern: /搜索|查找|查询|检索|调研|收集.*信息|获取.*资料/i, type: 'search', dept: 'hubu', complexity: 2, priority: 'low' },
      { pattern: /总结|归纳|提炼.*要点|摘要|概述/i, type: 'summarize', dept: 'hubu', complexity: 2, priority: 'low' },
      
      // 系统维护 (复杂度 2-3)
      { pattern: /清理.*缓存|释放.*空间|优化.*系统|备份.*数据|恢复.*数据/i, type: 'maintenance', dept: 'gongbu', complexity: 3, priority: 'normal' },
      { pattern: /迁移.*数据|数据.*导入|数据.*导出|格式.*转换/i, type: 'migration', dept: 'hubu', complexity: 3, priority: 'normal' }
    ];
    
    // 闲聊识别模式
    this.chatPatterns = [
      { pattern: /^(你好|在吗|嗨|hi|hello|hey)$/i, type: 'greeting', reply: '皇上好！臣在听旨，请吩咐。' },
      { pattern: /^(谢谢|感谢|thx|thanks|多谢)$/i, type: 'thanks', reply: '为皇上分忧，是臣的本分。' },
      { pattern: /^(再见|拜拜|bye|goodbye|退下)$/i, type: 'farewell', reply: '臣告退，随时听候皇上差遣。' },
      { pattern: /^(帮助|help|怎么用|能做什么)$/i, type: 'help', reply: '臣可帮您：\n• 写代码、分析数据、生成文档\n• 安装技能、部署服务、安全审计\n• 管理API密钥、查看任务进度\n\n请直接下旨，臣即刻办理。' },
      { pattern: /^(你是谁|你叫什么|什么身份)$/i, type: 'identity', reply: '臣是太子，负责为皇上分拣旨意、调度三省六部。有任务尽管吩咐臣。' },
      { pattern: /^(今天.*天气|天气.*怎么样|什么.*时间|几点了)$/i, type: 'query', reply: '皇上恕罪，臣暂无实时信息查询之能。臣可帮您写代码、分析数据、生成文档等，请下旨。' }
    ];
    
    // 无效旨意过滤
    this.invalidPatterns = [
      { pattern: /^\s*$/, reason: '空消息' },
      { pattern: /^[\.\,\!\?\s]+$/, reason: '仅标点' },
      { pattern: /^(test|testing|123|abc)$/i, reason: '测试消息' }
    ];
  }

  /**
   * 分拣消息
   * @param {string} message - 用户消息
   * @param {Object} context - 上下文
   * @returns {Object} 分拣结果
   */
  classify(message, context = {}) {
    const text = message.trim();
    
    // 1. 过滤无效消息
    for (const { pattern, reason } of this.invalidPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'invalid',
          reason,
          action: 'ignore',
          reply: null
        };
      }
    }
    
    // 2. 识别闲聊
    for (const { pattern, type, reply } of this.chatPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'chat',
          subtype: type,
          action: 'direct_reply',
          reply,
          complexity: 1,
          createTask: false
        };
      }
    }
    
    // 3. 识别旨意（复杂任务）
    for (const { pattern, type, dept, complexity, priority: defaultPriority } of this.edictPatterns) {
      if (pattern.test(text)) {
        const priority = this.assessPriority(text, complexity);
        const deptInfo = this.deptMapping[dept] || { name: dept, role: '' };
        
        return {
          type: 'edict',
          subtype: type,
          action: 'create_task',
          targetDept: dept,
          complexity,
          priority: priority || defaultPriority || 'normal',
          createTask: true,
          title: this.generateTitle(text, type),
          reply: this.generateReply(type, deptInfo, priority),
          context: {
            detectedType: type,
            detectedDept: dept,
            deptRole: deptInfo.role,
            estimatedTime: this.estimateTime(complexity)
          }
        };
      }
    }
    
    // 4. 默认作为一般旨意
    const defaultPriority = this.assessPriority(text, 3);
    return {
      type: 'edict',
      subtype: 'general',
      action: 'create_task',
      targetDept: 'shangshu',
      complexity: 3,
      priority: defaultPriority,
      createTask: true,
      title: this.generateTitle(text, 'general'),
      reply: this.generateReply('general', { name: '尚书省', role: '执行总调度' }, defaultPriority),
      context: {
        detectedType: 'general',
        detectedDept: 'shangshu',
        deptRole: '执行总调度',
        estimatedTime: this.estimateTime(3)
      }
    };
  }
  
  /**
   * 生成任务标题 - 智能清洗
   */
  generateTitle(text, type) {
    // 去除常见前缀和语气词
    const prefixes = [
      // 请求类
      '请', '帮我', '给我', '给我把', '把', '将', '麻烦', '辛苦', '劳驾',
      '能不能', '能不能帮我', '可以', '可以帮我', '麻烦你', '请你',
      // 动作类
      '需要', '想要', '希望', '打算', '准备',
      // 疑问类
      '怎么', '如何', '怎样', '请问',
      // 其他
      '那个', '这个', '就是', '其实', '话说'
    ];
    
    let cleaned = text.trim();
    
    // 去除前缀
    for (const prefix of prefixes) {
      const regex = new RegExp(`^${prefix}`, 'i');
      cleaned = cleaned.replace(regex, '');
    }
    
    // 去除文件路径、URL、代码片段标记
    cleaned = cleaned
      .replace(/\/Users\/[^\s]+/g, '[文件]')
      .replace(/https?:\/\/[^\s]+/g, '[链接]')
      .replace(/```[\s\S]*?```/g, '[代码]')
      .replace(/`[^`]+`/g, '[代码]');
    
    // 去除多余空格
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // 截断并添加省略号
    const maxLen = 50;
    if (cleaned.length > maxLen) {
      // 尽量在词语边界截断
      const truncated = cleaned.slice(0, maxLen);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > maxLen * 0.7) {
        return truncated.slice(0, lastSpace) + '...';
      }
      return truncated + '...';
    }
    
    return cleaned || '未命名旨意';
  }
  
  /**
   * 评估任务优先级
   */
  assessPriority(text, complexity) {
    // 紧急关键词
    const urgentPatterns = [
      /紧急|急|马上|立刻|立即|asap|urgent/i,
      /崩溃|故障|宕机|down|无法.*使用/i,
      /安全.*漏洞|泄露|被攻击|入侵/i
    ];
    
    // 高优先级关键词
    const highPatterns = [
      /重要|关键|核心|优先|blocking|critical/i,
      /bug|错误|问题|故障|修复/i
    ];
    
    for (const pattern of urgentPatterns) {
      if (pattern.test(text)) return 'urgent';
    }
    
    for (const pattern of highPatterns) {
      if (pattern.test(text)) return 'high';
    }
    
    // 根据复杂度判断
    if (complexity >= 5) return 'high';
    if (complexity <= 2) return 'low';
    
    return 'normal';
  }
  
  /**
   * 生成古风回复
   */
  generateReply(type, deptInfo, priority) {
    const typeName = this.getTypeName(type);
    const deptName = deptInfo.name;
    const role = deptInfo.role ? `（${deptInfo.role}）` : '';
    
    // 根据优先级调整语气
    const urgencyPrefix = {
      urgent: '【紧急】',
      high: '【加急】',
      normal: '',
      low: ''
    }[priority] || '';
    
    const replies = {
      urgent: `臣领${urgencyPrefix}急旨！此为${typeName}，事态紧急，臣即刻转交${deptName}${role}火速办理。奏折已加急呈上！`,
      high: `臣领${urgencyPrefix}旨。此为${typeName}，事关紧要，臣已优先转交${deptName}${role}办理。奏折已呈上，请皇上御览。`,
      normal: `臣领旨。此为${typeName}，需${deptName}${role}办理。奏折已呈上，请皇上御览。`,
      low: `臣领旨。此为${typeName}，臣已转交${deptName}${role}办理。奏折已呈上，请皇上稍候。`
    };
    
    return replies[priority] || replies.normal;
  }
  
  /**
   * 估算任务耗时
   */
  estimateTime(complexity) {
    const estimates = {
      1: '数分钟',
      2: '半小时内',
      3: '1-2小时',
      4: '半日',
      5: '1-2日'
    };
    return estimates[complexity] || '未知';
  }
  
  /**
   * 获取类型名称
   */
  getTypeName(type) {
    const names = {
      code: '代码编写之旨',
      test: '测试方案之旨',
      debug: '调试排错之旨',
      code_review: '代码审查之旨',
      data: '数据分析之旨',
      visualization: '可视化之旨',
      ml: '机器学习之旨',
      document: '文档编撰之旨',
      format: '格式转换之旨',
      translate: '文档翻译之旨',
      skill: '技能配置之旨',
      skill_remove: '技能革除之旨',
      skill_update: '技能更新之旨',
      deploy: '部署发布之旨',
      monitor: '监控运维之旨',
      cicd: '流水线配置之旨',
      security: '安全审计之旨',
      audit: '合规审计之旨',
      search: '信息检索之旨',
      summarize: '内容摘要之旨',
      maintenance: '系统维护之旨',
      migration: '数据迁移之旨',
      general: '一般旨意'
    };
    return names[type] || '旨意';
  }
  
  /**
   * 获取部门名称
   */
  getDeptName(dept) {
    const info = this.deptMapping[dept];
    return info ? info.name : dept;
  }
  
  /**
   * 获取部门信息
   */
  getDeptInfo(dept) {
    return this.deptMapping[dept] || { name: dept, level: 3, category: 'execution' };
  }
  
  /**
   * 批量测试
   */
  test(samples) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           🏛️  太子分拣器 - 全面测试                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const text of samples) {
      const result = this.classify(text);
      const isValid = result.type && result.action;
      
      if (isValid) passed++;
      else failed++;
      
      console.log(`📜 消息: "${text}"`);
      console.log(`   ├─ 类型: ${result.type}${result.subtype ? ` (${result.subtype})` : ''}`);
      console.log(`   ├─ 动作: ${result.action}`);
      console.log(`   ├─ 复杂度: ${'★'.repeat(result.complexity || 1)}${'☆'.repeat(5 - (result.complexity || 1))} (${result.complexity}/5)`);
      console.log(`   ├─ 优先级: ${result.priority || 'normal'}`);
      
      if (result.context) {
        console.log(`   ├─ 指派: ${result.context.deptRole} (${result.targetDept})`);
        console.log(`   ├─ 预估: ${result.context.estimatedTime}`);
      }
      
      console.log(`   ├─ 标题: ${result.title}`);
      console.log(`   └─ 回复: ${result.reply}`);
      console.log('');
    }
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  测试完成: ✅ ${passed} 通过  ❌ ${failed} 失败              ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    return { passed, failed, total: samples.length };
  }
}

// 导出
module.exports = { TaiziClassifier };

// 如果直接运行，执行测试
if (require.main === module) {
  const classifier = new TaiziClassifier();
  
  const testSamples = [
    // ===== 闲聊类 =====
    '你好',
    '在吗',
    '谢谢',
    '再见',
    '帮助',
    '你是谁',
    '今天天气怎么样',
    
    // ===== 代码类 =====
    '帮我写一段Python代码实现爬虫',
    '修复这个bug，紧急',
    '实现一个用户登录功能',
    '重构这段代码，优化性能',
    '调试这个程序，排查问题',
    '审查代码质量',
    
    // ===== 测试类 =====
    '编写单元测试',
    '设计自动化测试方案',
    '做E2E测试',
    
    // ===== 数据类 =====
    '分析这个CSV文件的数据',
    '生成数据可视化图表',
    '训练一个机器学习模型',
    '数据清洗和预处理',
    
    // ===== 文档类 =====
    '写一份项目技术文档',
    '制作PPT汇报材料',
    '导出PDF报告',
    '翻译这份英文文档',
    
    // ===== 技能类 =====
    '安装xlsx处理技能',
    '卸载不需要的技能',
    '更新技能到最新版本',
    
    // ===== 部署类 =====
    '部署到生产服务器',
    '构建Docker镜像',
    '配置CI/CD流水线',
    '设置监控告警',
    
    // ===== 安全类 =====
    '检查安全漏洞',
    '进行代码安全审计',
    '评估系统风险',
    
    // ===== 搜索类 =====
    '搜索相关资料',
    '总结这篇文章要点',
    
    // ===== 维护类 =====
    '清理系统缓存',
    '备份数据库',
    '迁移数据到新系统',
    
    // ===== 无效消息 =====
    '',
    '   ',
    'test',
    '123',
    
    // ===== 一般任务 =====
    '帮我处理一下这个文件',
    '看看这个配置有什么问题'
  ];
  
  classifier.test(testSamples);
}
