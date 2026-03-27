/**
 * 户部 - API密钥库管理模块
 * 融合方案：模块化存储 + 复制密钥 + 引用计数 + 奏折流程
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const CONFIG_DIR = path.join(process.env.HOME, '.openreign', 'config', 'hubu');
const VAULT_FILE = path.join(CONFIG_DIR, 'wenpai-ku.json');

// 加密配置 - 必须是32字节
// 使用固定密钥（不依赖环境变量）
const ENCRYPTION_KEY = 'openreign-pro-fixed-key-32-chars!';

class HubuWenpaiKu {
  constructor() {
    this.data = { _meta: { version: '1.0', module: 'wenpai-ku', managed_by: 'hubu' }, wenpai: {} };
    this.initialized = false;
  }

  // 初始化
  async init() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const content = await fs.readFile(VAULT_FILE, 'utf8');
      this.data = JSON.parse(content);
    } catch (error) {
      // 文件不存在，使用默认数据
      await this.save();
    }
    
    this.initialized = true;
  }

  // 保存数据
  async save() {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(VAULT_FILE, JSON.stringify(this.data, null, 2));
  }

  // 加密API密钥
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(ENCRYPTION_KEY);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('[Hubu] 加密失败:', error.message);
      throw new Error('加密失败: ' + error.message);
    }
  }

  // 解密API密钥
  decrypt(encryptedData) {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = Buffer.from(ENCRYPTION_KEY);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('[Hubu] 解密失败:', error.message);
      throw new Error('解密失败: ' + error.message);
    }
  }

  // 生成唯一ID
  generateId() {
    return 'wenpai-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
  }

  // 创建通关文牒
  async createWenpai(config) {
    await this.init();
    
    const id = this.generateId();
    const wenpai = {
      id,
      name: config.name,
      provider: config.provider,
      api_key_encrypted: this.encrypt(config.api_key),
      base_url: config.base_url,
      models: config.models || [],
      status: 'active',
      created_at: new Date().toISOString(),
      expired_at: null,
      ref_count: 0,
      used_by: [],
      replaced_by: null,
      usage: {
        total_calls: 0,
        total_tokens: 0
      }
    };
    
    this.data.wenpai[id] = wenpai;
    await this.save();
    
    // 返回脱敏数据
    return this.sanitizeWenpai(wenpai);
  }

  // 获取通关文牒（脱敏）
  async getWenpai(id) {
    await this.init();
    const wenpai = this.data.wenpai[id];
    if (!wenpai) return null;
    return this.sanitizeWenpai(wenpai);
  }

  // 获取通关文牒（含解密密钥）
  async getWenpaiWithKey(id) {
    await this.init();
    const wenpai = this.data.wenpai[id];
    if (!wenpai) return null;
    
    return {
      ...this.sanitizeWenpai(wenpai),
      api_key: this.decrypt(wenpai.api_key_encrypted)
    };
  }

  // 列出所有通关文牒
  async listWenpai() {
    await this.init();
    return Object.values(this.data.wenpai).map(w => this.sanitizeWenpai(w));
  }

  // 更新引用计数
  async updateRefCount(id, projectId, action = 'add') {
    await this.init();
    const wenpai = this.data.wenpai[id];
    if (!wenpai) return false;
    
    if (action === 'add') {
      if (!wenpai.used_by.includes(projectId)) {
        wenpai.used_by.push(projectId);
        wenpai.ref_count = wenpai.used_by.length;
      }
    } else if (action === 'remove') {
      wenpai.used_by = wenpai.used_by.filter(pid => pid !== projectId);
      wenpai.ref_count = wenpai.used_by.length;
    }
    
    await this.save();
    return true;
  }

  // 标记失效
  async markExpired(id, newWenpaiId = null) {
    await this.init();
    const wenpai = this.data.wenpai[id];
    if (!wenpai) return false;
    
    wenpai.status = 'expired';
    wenpai.expired_at = new Date().toISOString();
    wenpai.replaced_by = newWenpaiId;
    
    await this.save();
    return true;
  }

  // 删除文牒（检查引用）
  async deleteWenpai(id, force = false) {
    await this.init();
    const wenpai = this.data.wenpai[id];
    if (!wenpai) return { success: false, error: '文牒不存在' };
    
    if (wenpai.ref_count > 0 && !force) {
      return {
        success: false,
        error: '该文牒仍被使用',
        impact: {
          ref_count: wenpai.ref_count,
          used_by: wenpai.used_by
        }
      };
    }
    
    delete this.data.wenpai[id];
    await this.save();
    
    return { success: true, deleted_id: id };
  }

  // 验讫文牒（测试连通）
  async verifyWenpai(id) {
    const wenpai = await this.getWenpaiWithKey(id);
    if (!wenpai) return { valid: false, error: '文牒不存在' };
    
    try {
      // 测试调用API（列出模型）
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(wenpai.base_url + '/models', {
        headers: { 'Authorization': `Bearer ${wenpai.api_key}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}`, latency };
      }
      
      const data = await response.json();
      const availableModels = data.data?.map(m => m.id) || [];
      
      return {
        valid: true,
        latency,
        available_models: availableModels
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // 获取受影响的项目
  async getAffectedProjects(id) {
    await this.init();
    const wenpai = this.data.wenpai[id];
    if (!wenpai) return [];
    return wenpai.used_by;
  }

  // 脱敏处理
  sanitizeWenpai(wenpai) {
    const { api_key_encrypted, ...sanitized } = wenpai;
    return {
      ...sanitized,
      api_key_masked: 'sk-••••••••••••••••••••••' + wenpai.id.slice(-4)
    };
  }
}

module.exports = new HubuWenpaiKu();
