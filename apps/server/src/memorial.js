/**
 * 奏折系统 - 帝国制度任务流程
 * 支持API失效紧急奏折
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

const CONFIG_DIR = path.join(process.env.HOME, '.openreign', 'config');
const MEMORIAL_FILE = path.join(CONFIG_DIR, 'zouzhe.json');

class MemorialSystem extends EventEmitter {
  constructor() {
    super();
    this.data = { _meta: { version: '1.0', module: 'zouzhe' }, zouzhe: {} };
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const content = await fs.readFile(MEMORIAL_FILE, 'utf8');
      this.data = JSON.parse(content);
    } catch (error) {
      await this.save();
    }
    
    this.initialized = true;
  }

  async save() {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(MEMORIAL_FILE, JSON.stringify(this.data, null, 2));
  }

  // 生成奏折ID
  generateId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Object.keys(this.data.zouzhe).length + 1;
    return `zz-${date}-${String(seq).padStart(3, '0')}`;
  }

  // 创建奏折
  async createMemorial(config) {
    await this.init();
    
    const id = this.generateId();
    const memorial = {
      id,
      type: config.type,  // API_CREDENTIAL_EXPIRED, EXECUTE_TASK, etc.
      title: config.title || this.getDefaultTitle(config.type),
      from: config.from,  // bingbu, gongbu, etc.
      status: 'pending',  // pending → zhongshu → menxia → approved → dispatched → executing → completed
      urgency: config.urgency || 'normal',  // normal, high, urgent
      wenpai_id: config.wenpai_id,
      projects: config.projects || [],
      new_wenpai_id: null,
      new_wenpai_config: null,
      flow_log: [{
        step: 'created',
        by: config.from,
        at: new Date().toISOString(),
        note: config.note || ''
      }],
      created_at: new Date().toISOString(),
      completed_at: null
    };
    
    this.data.zouzhe[id] = memorial;
    await this.save();
    
    // 触发事件
    this.emit('memorial_created', memorial);
    
    return memorial;
  }

  // 获取默认标题
  getDefaultTitle(type) {
    const titles = {
      'API_CREDENTIAL_EXPIRED': '急奏 - 通关文牒失效',
      'EXECUTE_TASK': '执行任务',
      'INSTALL_SKILL': '安装技能'
    };
    return titles[type] || '普通奏折';
  }

  // 获取奏折
  async getMemorial(id) {
    await this.init();
    return this.data.zouzhe[id] || null;
  }

  // 列出待批奏折
  async listPending() {
    await this.init();
    return Object.values(this.data.zouzhe)
      .filter(z => ['pending', 'zhongshu', 'menxia'].includes(z.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 列出所有奏折
  async listAll() {
    await this.init();
    return Object.values(this.data.zouzhe)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 中书省拟定方案
  async zhongshuApprove(id, config) {
    await this.init();
    const memorial = this.data.zouzhe[id];
    if (!memorial) return { success: false, error: '奏折不存在' };
    if (memorial.status !== 'pending') return { success: false, error: '奏折状态错误' };
    
    memorial.status = 'zhongshu';
    memorial.new_wenpai_id = config.new_wenpai_id;
    memorial.new_wenpai_config = config.new_wenpai_config;
    memorial.flow_log.push({
      step: 'zhongshu',
      by: 'zhongshu',
      at: new Date().toISOString(),
      note: config.note || '中书省拟定方案'
    });
    
    await this.save();
    this.emit('memorial_zhongshu', memorial);
    
    return { success: true, memorial };
  }

  // 门下省审核
  async menxiaApprove(id, approved = true, note = '') {
    await this.init();
    const memorial = this.data.zouzhe[id];
    if (!memorial) return { success: false, error: '奏折不存在' };
    if (memorial.status !== 'zhongshu') return { success: false, error: '奏折状态错误' };
    
    if (approved) {
      memorial.status = 'menxia';
      memorial.flow_log.push({
        step: 'menxia',
        by: 'menxia',
        at: new Date().toISOString(),
        note: note || '门下省审核通过'
      });
    } else {
      memorial.status = 'pending';
      memorial.flow_log.push({
        step: 'menxia_rejected',
        by: 'menxia',
        at: new Date().toISOString(),
        note: note || '门下省封驳，退回中书省重新拟定'
      });
    }
    
    await this.save();
    this.emit(approved ? 'memorial_menxia_approved' : 'memorial_menxia_rejected', memorial);
    
    return { success: true, memorial };
  }

  // 尚书省派发执行
  async shangshuDispatch(id) {
    await this.init();
    const memorial = this.data.zouzhe[id];
    if (!memorial) return { success: false, error: '奏折不存在' };
    if (memorial.status !== 'menxia') return { success: false, error: '奏折状态错误' };
    
    memorial.status = 'dispatched';
    memorial.flow_log.push({
      step: 'dispatched',
      by: 'shangshu',
      at: new Date().toISOString(),
      note: '尚书省派发六部执行'
    });
    
    await this.save();
    this.emit('memorial_dispatched', memorial);
    
    return { success: true, memorial };
  }

  // 更新执行状态
  async updateExecution(id, status, results = []) {
    await this.init();
    const memorial = this.data.zouzhe[id];
    if (!memorial) return { success: false, error: '奏折不存在' };
    
    memorial.status = status;  // executing, completed, partial_failed
    memorial.execution_results = results;
    memorial.flow_log.push({
      step: status,
      by: 'liubu',
      at: new Date().toISOString(),
      note: `执行${status === 'completed' ? '完成' : '部分失败'}`
    });
    
    if (status === 'completed') {
      memorial.completed_at = new Date().toISOString();
    }
    
    await this.save();
    this.emit(`memorial_${status}`, memorial);
    
    return { success: true, memorial };
  }

  // 皇上直接批准（快速通道）
  async emperorApprove(id, config) {
    await this.init();
    const memorial = this.data.zouzhe[id];
    if (!memorial) return { success: false, error: '奏折不存在' };
    
    // 快速通过三省
    memorial.status = 'menxia';
    memorial.new_wenpai_id = config.new_wenpai_id;
    memorial.new_wenpai_config = config.new_wenpai_config;
    memorial.flow_log.push({
      step: 'emperor_approved',
      by: 'emperor',
      at: new Date().toISOString(),
      note: '皇上朱批，快速通过三省'
    });
    
    await this.save();
    this.emit('memorial_emperor_approved', memorial);
    
    return { success: true, memorial };
  }

  // 检查是否有相同类型的待批奏折（合并用）
  async findPendingByType(type, wenpaiId) {
    await this.init();
    return Object.values(this.data.zouzhe).find(
      z => z.type === type && z.wenpai_id === wenpaiId && 
           ['pending', 'zhongshu', 'menxia'].includes(z.status)
    );
  }

  // 合并项目到现有奏折
  async mergeProjects(id, newProjects) {
    await this.init();
    const memorial = this.data.zouzhe[id];
    if (!memorial) return { success: false, error: '奏折不存在' };
    
    // 去重合并
    const existingIds = memorial.projects.map(p => p.id);
    for (const proj of newProjects) {
      if (!existingIds.includes(proj.id)) {
        memorial.projects.push(proj);
      }
    }
    
    memorial.flow_log.push({
      step: 'merged',
      by: 'system',
      at: new Date().toISOString(),
      note: `合并 ${newProjects.length} 个项目`
    });
    
    await this.save();
    this.emit('memorial_merged', memorial);
    
    return { success: true, memorial };
  }
}

module.exports = new MemorialSystem();
