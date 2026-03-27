/**
 * 奏折格式化器
 * 将任务数据转换为古风奏折格式
 */

const { ClassicalFormatter } = require('../utils/classical-formatter');

class MemorialFormatter {
  constructor() {
    this.formatter = new ClassicalFormatter();
    
    // 五阶段定义（对齐 edict）
    this.stages = [
      { id: 'emperor', name: '圣旨', icon: '👑', color: '#FFD700' },
      { id: 'taizi', name: '东宫', icon: '👑', color: '#FFA500' },
      { id: 'zhongshu', name: '中书', icon: '📋', color: '#4169E1' },
      { id: 'menxia', name: '门下', icon: '🔍', color: '#32CD32' },
      { id: 'shangshu', name: '尚书', icon: '⚙️', color: '#9370DB' },
      { id: 'liubu', name: '六部', icon: '🏛️', color: '#20B2AA' },
      { id: 'completed', name: '回奏', icon: '✅', color: '#228B22' }
    ];
  }

  /**
   * 将任务转换为奏折格式
   */
  formatMemorial(task) {
    if (!task) return null;

    const flowLog = task.flowLog || [];
    const progressLog = task.progressLog || [];
    const todos = task.todos || [];

    // 构建五阶段时间线
    const timeline = this.buildTimeline(task, flowLog, progressLog);

    // 生成奏折内容
    const content = this.generateContent(task, timeline, todos);

    // 生成 Markdown
    const markdown = this.generateMarkdown(task, timeline, todos);

    return {
      id: task.id,
      title: task.title,
      status: task.state,
      statusName: this.formatter.terms.status[task.state] || task.state,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      timeline,
      content,
      markdown,
      stats: this.calculateStats(task, timeline, todos)
    };
  }

  /**
   * 构建五阶段时间线
   */
  buildTimeline(task, flowLog, progressLog) {
    const timeline = [];

    // 1. 圣旨阶段（创建）
    timeline.push({
      stage: 'emperor',
      stageName: '圣旨下达',
      timestamp: task.createdAt,
      status: 'completed',
      content: `皇上旨意：${task.title}`,
      detail: task.description || '未详述',
      icon: '👑'
    });

    // 2. 东宫阶段（太子分拣）
    const taiziFlow = flowLog.find(f => f.to === '太子' || f.to === 'taizi');
    if (taiziFlow) {
      timeline.push({
        stage: 'taizi',
        stageName: '东宫分拣',
        timestamp: taiziFlow.timestamp,
        status: 'completed',
        content: '太子接旨分拣',
        detail: taiziFlow.remark || '已分拣完毕',
        icon: '👑'
      });
    }

    // 3. 中书阶段（规划）
    const zhongshuFlow = flowLog.find(f => f.to === '中书省' || f.to === 'zhongshu');
    const zhongshuProgress = progressLog.filter(p => 
      p.progress?.includes('中书')
    );
    if (zhongshuFlow) {
      timeline.push({
        stage: 'zhongshu',
        stageName: '中书草拟',
        timestamp: zhongshuFlow.timestamp,
        status: 'completed',
        content: '中书省草拟方案',
        detail: zhongshuProgress[zhongshuProgress.length - 1]?.progress || '方案已拟定',
        icon: '📋',
        todos: this.extractTodosForStage('zhongshu', task.todos)
      });
    }

    // 4. 门下阶段（审议）
    const menxiaFlow = flowLog.find(f => f.to === '门下省' || f.to === 'menxia');
    const menxiaResult = flowLog.find(f => 
      f.from === '门下省' && (f.to === '尚书省' || f.to === '中书省')
    );
    if (menxiaFlow) {
      const isApproved = menxiaResult?.to === '尚书省';
      timeline.push({
        stage: 'menxia',
        stageName: '门下审议',
        timestamp: menxiaFlow.timestamp,
        status: 'completed',
        content: isApproved ? '门下省准奏' : '门下省封驳',
        detail: menxiaResult?.remark || '审议完成',
        icon: '🔍',
        result: isApproved ? 'approved' : 'rejected'
      });
    }

    // 5. 尚书阶段（派发）
    const shangshuFlow = flowLog.find(f => f.to === '尚书省' || f.to === 'shangshu');
    if (shangshuFlow) {
      const dispatches = flowLog.filter(f => f.from === '尚书省');
      timeline.push({
        stage: 'shangshu',
        stageName: '尚书分派',
        timestamp: shangshuFlow.timestamp,
        status: 'completed',
        content: `尚书省分派${dispatches.length}项子任务`,
        detail: dispatches.map(d => `→ ${d.to}`).join('，'),
        icon: '⚙️'
      });
    }

    // 6. 六部阶段（执行）
    const liubuFlows = flowLog.filter(f => 
      ['吏部', '户部', '兵部', '礼部', '刑部', '工部', '勘验司'].includes(f.to)
    );
    if (liubuFlows.length > 0) {
      timeline.push({
        stage: 'liubu',
        stageName: '六部施行',
        timestamp: liubuFlows[0].timestamp,
        status: 'completed',
        content: `六部施行${liubuFlows.length}项子任务`,
        detail: liubuFlows.map(f => `${f.to}：${f.remark || '已施行'}`).join('\n'),
        icon: '🏛️',
        subtasks: liubuFlows.map(f => ({
          dept: f.to,
          status: 'completed',
          remark: f.remark
        }))
      });
    }

    // 7. 回奏阶段（完成）
    if (task.state === 'completed') {
      timeline.push({
        stage: 'completed',
        stageName: '回奏告竣',
        timestamp: task.completedAt || task.updatedAt,
        status: 'completed',
        content: '事已告竣，恭请圣裁',
        detail: task.summary || '任务执行完毕',
        icon: '✅'
      });
    }

    return timeline;
  }

  /**
   * 提取阶段的 todos
   */
  extractTodosForStage(stageId, todos) {
    if (!todos) return [];
    
    // 根据 todo ID 或内容匹配阶段
    return todos.filter(todo => {
      const todoId = todo.id || '';
      return todoId.includes(stageId) || 
             todo.title?.includes(this.getStageName(stageId));
    });
  }

  /**
   * 获取阶段名称
   */
  getStageName(stageId) {
    const stage = this.stages.find(s => s.id === stageId);
    return stage?.name || stageId;
  }

  /**
   * 生成奏折内容
   */
  generateContent(task, timeline, todos) {
    const lines = [
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
      '┃　　　　　　　　　　　奏　折　　　　　　　　　　　┃',
      '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫',
      `┃　奏折编号：${task.id}　　　　　　　　　　　　　　┃`,
      `┃　奏报事由：${task.title}　　　　　　　　　　　　　┃`,
      '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫'
    ];

    // 添加时间线
    timeline.forEach((item, index) => {
      lines.push(`┃　${item.icon} ${item.stageName}`);
      lines.push(`┃　　${item.content}`);
      if (item.detail) {
        const detailLines = item.detail.split('\n').slice(0, 3); // 最多3行
        detailLines.forEach(d => {
          lines.push(`┃　　　${d.substring(0, 40)}`);
        });
      }
      if (index < timeline.length - 1) {
        lines.push('┃　　↓');
      }
    });

    lines.push('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
    lines.push('┃　谨具奏闻，伏候圣裁。　　　　　　　　　　　　　　┃');
    lines.push('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

    return lines.join('\n');
  }

  /**
   * 生成 Markdown
   */
  generateMarkdown(task, timeline, todos) {
    const lines = [
      '# 奏折',
      '',
      `**奏折编号**：${task.id}`,
      `**奏报事由**：${task.title}`,
      `**当前状态**：${this.formatter.terms.status[task.state] || task.state}`,
      `**创建时间**：${task.createdAt}`,
      task.completedAt ? `**完成时间**：${task.completedAt}` : '',
      '',
      '---',
      '',
      '## 办理流程',
      ''
    ];

    // 时间线
    timeline.forEach(item => {
      lines.push(`### ${item.icon} ${item.stageName}`);
      lines.push('');
      lines.push(`- **时间**：${item.timestamp}`);
      lines.push(`- **内容**：${item.content}`);
      if (item.detail) {
        lines.push(`- **详情**：`);
        item.detail.split('\n').forEach(d => {
          lines.push(`  - ${d}`);
        });
      }
      lines.push('');
    });

    // 子任务
    if (todos && todos.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## 子任务');
      lines.push('');
      todos.forEach((todo, index) => {
        lines.push(`${index + 1}. **${todo.title}**`);
        lines.push(`   - 状态：${todo.status}`);
        if (todo.detail) {
          lines.push(`   - 详情：${todo.detail}`);
        }
        lines.push('');
      });
    }

    lines.push('---');
    lines.push('');
    lines.push('*谨具奏闻，伏候圣裁。*');

    return lines.filter(l => l !== '').join('\n');
  }

  /**
   * 计算统计
   */
  calculateStats(task, timeline, todos) {
    const totalStages = this.stages.length;
    const completedStages = timeline.filter(t => t.status === 'completed').length;
    
    return {
      totalStages,
      completedStages,
      progress: Math.round((completedStages / totalStages) * 100),
      totalTodos: todos?.length || 0,
      completedTodos: todos?.filter(t => t.status === 'completed').length || 0,
      duration: this.calculateDuration(task)
    };
  }

  /**
   * 计算耗时
   */
  calculateDuration(task) {
    if (!task.createdAt) return null;
    
    const start = new Date(task.createdAt);
    const end = task.completedAt ? new Date(task.completedAt) : new Date();
    const duration = end - start;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}时${minutes}分`;
    }
    return `${minutes}分`;
  }

  /**
   * 批量格式化
   */
  formatMemorials(tasks) {
    return tasks.map(t => this.formatMemorial(t)).filter(Boolean);
  }
}

module.exports = { MemorialFormatter };
