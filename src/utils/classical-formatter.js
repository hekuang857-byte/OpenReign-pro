/**
 * 古风消息格式化器
 * 将现代消息转换为古代奏折风格
 */

const fs = require('fs');
const path = require('path');

class ClassicalFormatter {
  constructor() {
    this.terms = this.loadTerms();
  }

  /**
   * 加载古风术语
   */
  loadTerms() {
    try {
      const termsPath = path.join(__dirname, '..', '..', 'config', 'classical-terms.json');
      const content = fs.readFileSync(termsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('[ClassicalFormatter] 无法加载古风术语，使用默认配置');
      return this.getDefaultTerms();
    }
  }

  /**
   * 默认术语
   */
  getDefaultTerms() {
    return {
      departments: {},
      actions: {
        create: '草拟',
        analyze: '辨析',
        plan: '谋定',
        execute: '施行',
        review: '勘核',
        dispatch: '分派',
        complete: '告竣'
      },
      status: {
        pending: '待旨',
        taizi: '东宫分拣',
        zhongshu: '中书草拟',
        menxia: '门下审议',
        assigned: '尚书分派',
        doing: '六部施行',
        completed: '告竣'
      }
    };
  }

  /**
   * 格式化进度消息
   */
  formatProgress(deptId, action, detail) {
    const dept = this.terms.departments[deptId];
    if (!dept) {
      return this.formatDefault(deptId, action, detail);
    }

    const template = dept.reporting?.progressTemplate || 
      '启奏陛下，{name}正在{action}，{detail}';

    const classicalAction = this.terms.actions[action] || action;

    return template
      .replace('{name}', dept.name)
      .replace('{action}', classicalAction)
      .replace('{detail}', detail);
  }

  /**
   * 格式化默认消息
   */
  formatDefault(deptId, action, detail) {
    const classicalAction = this.terms.actions[action] || action;
    return `启奏陛下，${deptId}正在${classicalAction}，${detail}`;
  }

  /**
   * 格式化流转消息
   */
  formatFlow(from, to, remark) {
    const fromDept = this.terms.departments[from];
    const toDept = this.terms.departments[to];
    
    const fromName = fromDept?.name || from;
    const toName = toDept?.name || to;

    if (remark) {
      return `由${fromName}转交${toName}，${remark}`;
    }
    
    return `由${fromName}转交${toName}`;
  }

  /**
   * 格式化状态变更
   */
  formatState(state, note) {
    const stateName = this.terms.status[state] || state;
    
    if (note) {
      return `${stateName}，${note}`;
    }
    
    return stateName;
  }

  /**
   * 格式化完成消息
   */
  formatComplete(deptId, output, summary) {
    const dept = this.terms.departments[deptId];
    const deptName = dept?.name || deptId;

    return {
      output: output || '',
      summary: summary || `${deptName}事已告竣，恭请圣裁`
    };
  }

  /**
   * 获取部门称谓
   */
  getAddress(deptId) {
    const dept = this.terms.departments[deptId];
    return dept?.address || deptId;
  }

  /**
   * 获取部门自称
   */
  getSelfAddress(deptId) {
    const dept = this.terms.departments[deptId];
    return dept?.self_address || '下官';
  }

  /**
   * 获取部门标题
   */
  getTitle(deptId) {
    const dept = this.terms.departments[deptId];
    return dept?.title || dept?.name || deptId;
  }

  /**
   * 获取 TODO 分类
   */
  getTodoCategories(deptId) {
    const dept = this.terms.departments[deptId];
    return dept?.reporting?.todoCategories || ['办理', '施行', '完结'];
  }

  /**
   * 古风化现代术语
   */
  modernToClassical(text) {
    const mappings = {
      '任务': '奏折',
      '创建': '草拟',
      '执行': '施行',
      '完成': '告竣',
      '失败': '失机',
      '分析': '辨析',
      '测试': '勘验',
      '部署': '安置',
      '代码': '文书',
      '数据': '典籍',
      '技能': '技艺',
      '配置': '章程',
      'API': '接口',
      '服务器': '机房',
      '数据库': '档案库',
      '错误': '差池',
      '警告': '警示',
      '信息': '情报',
      '用户': '臣民',
      '系统': '体制',
      '程序': '规程',
      '文件': '案卷',
      '目录': '名册',
      '路径': '通道',
      '网络': '驿道',
      '安全': '防务',
      '监控': '监察',
      '日志': '记录',
      '缓存': '暂存',
      '备份': '存档',
      '恢复': '复原',
      '更新': '修订',
      '升级': '擢升',
      '降级': '贬谪',
      '安装': '安置',
      '卸载': '撤除',
      '启动': '启奏',
      '停止': '停罢',
      '重启': '复启',
      '连接': '连通',
      '断开': '断绝',
      '发送': '递送',
      '接收': '收讫',
      '上传': '呈递',
      '下载': '领取',
      '输入': '录入',
      '输出': '产出',
      '处理': '处置',
      '计算': '演算',
      '存储': '贮藏',
      '读取': '阅取',
      '写入': '缮写',
      '删除': '勾销',
      '修改': '改易',
      '查询': '查核',
      '搜索': '搜寻',
      '过滤': '筛选',
      '排序': '排列',
      '分组': '分群',
      '合并': '归并',
      '拆分': '分拆',
      '复制': '抄录',
      '粘贴': '贴附',
      '剪切': '裁切',
      '撤销': '撤回',
      '重做': '复作',
      '保存': '存案',
      '提交': '呈递',
      '取消': '撤销',
      '确认': '核准',
      '选择': '拣选',
      '全选': '尽选',
      '反选': '逆选',
      '导入': '引入',
      '导出': '输出',
      '打印': '刊印',
      '预览': '预观',
      '编辑': '编纂',
      '查看': '查阅',
      '关闭': '闭合',
      '打开': '开启',
      '新建': '新拟',
      '删除': '勾销',
      '重命名': '更名',
      '移动': '迁移',
      '复制': '抄录',
      '属性': '性质',
      '设置': '设定',
      '选项': '择项',
      '帮助': '协助',
      '关于': '关于',
      '退出': '退出'
    };

    let result = text;
    for (const [modern, classical] of Object.entries(mappings)) {
      result = result.replace(new RegExp(modern, 'g'), classical);
    }
    
    return result;
  }

  /**
   * 格式化完整奏折
   */
  formatMemorial(task, results) {
    const lines = [
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
      '┃　　　　　　　　　　　奏　折　　　　　　　　　　　┃',
      '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫',
      `┃　奏报人：${this.getTitle(task.currentDept || 'zhongshu')}　　　　　　　　　　　　　　　　┃`,
      `┃　奏报事：${task.title || '未具名要务'}　　　　　　　　　　　　┃`,
      '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫',
      '┃　　　　　　　　　　　　　　　　　　　　　　　　　┃'
    ];

    if (results && results.length > 0) {
      results.forEach((result, i) => {
        const dept = this.terms.departments[result.dept];
        const deptName = dept?.name || result.dept;
        lines.push(`┃　${i + 1}. ${deptName}：${result.summary || '事已办妥'}　　　　　　　　┃`);
      });
    }

    lines.push('┃　　　　　　　　　　　　　　　　　　　　　　　　　┃');
    lines.push('┃　谨具奏闻，伏候圣裁。　　　　　　　　　　　　　　┃');
    lines.push('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

    return lines.join('\n');
  }
}

module.exports = { ClassicalFormatter };
