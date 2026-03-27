/**
 * API路由 - 户部 + 奏折系统
 * 融合方案实现
 */

const express = require('express');
const router = express.Router();
const hubu = require('./api-vault');
const memorial = require('../memorial');

// ========== 户部路由 ==========

// GET /api/hubu/wenpai - 列出所有通关文牒
router.get('/hubu/wenpai', async (req, res) => {
  try {
    const wenpai = await hubu.listWenpai();
    res.json({ success: true, wenpai });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hubu/wenpai - 创建通关文牒
router.post('/hubu/wenpai', async (req, res) => {
  console.log('[Hubu] 创建文牒请求:', req.body);
  try {
    const { name, provider, api_key, base_url, models } = req.body;
    
    if (!name || !provider || !api_key) {
      console.log('[Hubu] 缺少必要参数:', { name, provider, api_key: api_key ? '已提供' : '未提供' });
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数：name, provider, api_key' 
      });
    }
    
    console.log('[Hubu] 调用 createWenpai...');
    const wenpai = await hubu.createWenpai({
      name,
      provider,
      api_key,
      base_url: base_url || 'https://api.openai.com/v1',
      models: models || ['gpt-4', 'gpt-3.5-turbo']
    });
    
    console.log('[Hubu] 文牒创建成功:', wenpai.id);
    res.json({ success: true, wenpai });
  } catch (error) {
    console.error('[Hubu] 创建文牒失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/hubu/wenpai/:id - 获取通关文牒详情
router.get('/hubu/wenpai/:id', async (req, res) => {
  try {
    const wenpai = await hubu.getWenpai(req.params.id);
    if (!wenpai) {
      return res.status(404).json({ success: false, error: '文牒不存在' });
    }
    res.json({ success: true, wenpai });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hubu/wenpai/:id/yanqi - 验讫文牒
router.post('/hubu/wenpai/:id/yanqi', async (req, res) => {
  try {
    const result = await hubu.verifyWenpai(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/hubu/wenpai/:id - 删除文牒
router.delete('/hubu/wenpai/:id', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await hubu.deleteWenpai(req.params.id, force);
    
    if (!result.success && result.impact) {
      return res.status(409).json({
        success: false,
        error: result.error,
        impact: result.impact,
        message: '该文牒仍被使用，请确认后强制删除或更换项目配置'
      });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hubu/wenpai/test-connection - 测试连接并获取模型列表
router.post('/hubu/wenpai/test-connection', async (req, res) => {
  try {
    const { api_key, base_url } = req.body;
    
    if (!api_key || !base_url) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：api_key, base_url'
      });
    }
    
    // 测试调用API获取模型列表
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(base_url + '/models', {
        headers: { 'Authorization': `Bearer ${api_key}` },
        timeout: 10000
      });
      
      if (!response.ok) {
        return res.json({
          success: false,
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
      
      const data = await response.json();
      const availableModels = data.data?.map((m) => m.id) || [];
      
      res.json({
        success: true,
        valid: true,
        available_models: availableModels
      });
    } catch (error) {
      res.json({
        success: false,
        valid: false,
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/hubu/wenpai/:id/yingxiang - 获取影响范围
router.get('/hubu/wenpai/:id/yingxiang', async (req, res) => {
  try {
    const wenpai = await hubu.getWenpai(req.params.id);
    if (!wenpai) {
      return res.status(404).json({ success: false, error: '文牒不存在' });
    }
    
    res.json({
      success: true,
      wenpai_id: req.params.id,
      ref_count: wenpai.ref_count,
      used_by: wenpai.used_by
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 奏折路由 ==========

// GET /api/zouzhe/daipi - 获取待批奏折
router.get('/zouzhe/daipi', async (req, res) => {
  try {
    const zouzhe = await memorial.listPending();
    res.json({ success: true, zouzhe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/zouzhe - 获取所有奏折
router.get('/zouzhe', async (req, res) => {
  try {
    const zouzhe = await memorial.listAll();
    res.json({ success: true, zouzhe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/zouzhe/:id - 获取奏折详情
router.get('/zouzhe/:id', async (req, res) => {
  try {
    const zouzhe = await memorial.getMemorial(req.params.id);
    if (!zouzhe) {
      return res.status(404).json({ success: false, error: '奏折不存在' });
    }
    res.json({ success: true, zouzhe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/zouzhe/xinzeng - 创建奏折
router.post('/zouzhe/xinzeng', async (req, res) => {
  try {
    const { type, from, wenpai_id, projects, urgency, title, note } = req.body;
    
    // 检查是否有相同类型的待批奏折（合并）
    if (type === 'API_CREDENTIAL_EXPIRED' && wenpai_id) {
      const existing = await memorial.findPendingByType(type, wenpai_id);
      if (existing) {
        // 合并项目
        const merged = await memorial.mergeProjects(existing.id, projects);
        return res.json({
          success: true,
          merged: true,
          memorial: merged.memorial,
          message: '已合并到现有奏折'
        });
      }
    }
    
    const zouzhe = await memorial.createMemorial({
      type,
      from,
      wenpai_id,
      projects,
      urgency,
      title,
      note
    });
    
    res.json({ success: true, zouzhe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/zouzhe/:id/zhongsheng - 中书省拟定方案
router.post('/zouzhe/:id/zhongsheng', async (req, res) => {
  try {
    const { new_wenpai_id, new_wenpai_config, note } = req.body;
    const result = await memorial.zhongshuApprove(req.params.id, {
      new_wenpai_id,
      new_wenpai_config,
      note
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/zouzhe/:id/menshen - 门下省审核
router.post('/zouzhe/:id/menshen', async (req, res) => {
  try {
    const { approved, note } = req.body;
    const result = await memorial.menxiaApprove(req.params.id, approved, note);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/zouzhe/:id/paifa - 尚书省派发
router.post('/zouzhe/:id/paifa', async (req, res) => {
  try {
    const result = await memorial.shangshuDispatch(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/zouzhe/:id/zhupi - 皇上朱批（快速通过）
router.post('/zouzhe/:id/zhupi', async (req, res) => {
  try {
    const { new_wenpai_id, new_wenpai_config } = req.body;
    const result = await memorial.emperorApprove(req.params.id, {
      new_wenpai_id,
      new_wenpai_config
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/zouzhe/:id/zhixing - 更新执行状态
router.post('/zouzhe/:id/zhixing', async (req, res) => {
  try {
    const { status, results } = req.body;
    const result = await memorial.updateExecution(req.params.id, status, results);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 执行任务路由（增强版） ==========

// POST /api/bingbu/zhixing - 执行任务（支持API失效检测）
router.post('/bingbu/zhixing', async (req, res) => {
  try {
    const { task_id, project_id, wenpai_id, request_config } = req.body;
    
    // 获取通关文牒（含解密密钥）
    const wenpai = await hubu.getWenpaiWithKey(wenpai_id);
    if (!wenpai) {
      return res.status(404).json({
        success: false,
        error: '通关文牒不存在',
        code: 'WENPAI_NOT_FOUND'
      });
    }
    
    // 调用API
    try {
      const controller = new AbortController();
      const timeoutMs = request_config.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(request_config.url, {
        method: request_config.method || 'POST',
        headers: {
          'Authorization': `Bearer ${wenpai.api_key}`,
          'Content-Type': 'application/json',
          ...request_config.headers
        },
        body: JSON.stringify(request_config.body),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // 检查是否为密钥失效
        if (response.status === 401 || response.status === 403) {
          // 获取受影响的项目
          const affectedProjects = await hubu.getAffectedProjects(wenpai_id);
          
          // 创建奏折
          const memorialResult = await memorial.createMemorial({
            type: 'API_CREDENTIAL_EXPIRED',
            from: 'bingbu',
            wenpai_id,
            projects: affectedProjects.map(pid => ({
              id: pid,
              name: pid, // 实际应从项目配置获取名称
              dept: 'bingbu' // 实际应根据项目配置获取部门
            })),
            urgency: 'high',
            title: `兵部急奏 - 通关文牒 ${wenpai.name} 失效`,
            note: `HTTP ${response.status}: ${response.statusText}`
          });
          
          return res.json({
            success: false,
            code: 'API_CREDENTIAL_EXPIRED',
            status: 'memorial_pending',
            memorial_id: memorialResult.id,
            message: '通关文牒失效，已上奏等待处理',
            wenpai: {
              id: wenpai.id,
              name: wenpai.name
            }
          });
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 记录用量
      if (data.usage) {
        // 更新文牒用量统计
        // await hubu.recordUsage(wenpai_id, data.usage);
      }
      
      res.json({
        success: true,
        data
      });
      
    } catch (error) {
      if (error.code === 'API_CREDENTIAL_EXPIRED') {
        throw error;
      }
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
