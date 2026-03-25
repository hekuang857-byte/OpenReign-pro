# UI 复古优化方案

> 参考 React Bits 动画 + 帝国复古风格

## 一、命名复古化（前后端统一）

### 当前 → 复古

| 当前 | 复古命名 | 说明 |
|------|---------|------|
| Dashboard | **御书房** | 皇帝办公处 |
| 总览 | **天下大势** | 俯瞰全局 |
| 任务 | **奏折** | 古代公文 |
| 架构 | **朝廷架构** | 三省六部 |
| 兵器库 | **武备司** | 武器管理 |
| 奏折阁 | **存档阁** | 归档存储 |
| 圣旨 | **诏令司** | 命令模板 |
| 军机处 | **钦天监** | 定时观测 |
| 议政 | **朝会** | 群臣议政 |
| 排行 | **功勋榜** | 功劳排行 |
| 记忆 | **史官** | 记录存储 |
| 技能 | **技艺司** | 技能管理 |

### API 路径复古化

```
/api/departments    → /api/chaoting/bumen    (朝廷/部门)
/api/tasks          → /api/zouzhe            (奏折)
/api/armory         → /api/wubeisi           (武备司)
/api/templates      → /api/zhaolingsi        (诏令司)
/api/cron           → /api/qintianjian       (钦天监)
/api/stats/tokens   → /api/gongxunbang       (功勋榜)
```

---

## 二、视觉风格（帝国复古）

### 色彩方案

```css
/* 主色调 - 皇家金黄 */
--imperial-gold: #D4AF37;
--imperial-gold-light: #F4E4BC;
--imperial-gold-dark: #8B6914;

/* 辅色 - 朱砂红 */
--cinnabar-red: #C93756;
--cinnabar-red-light: #E8A5B3;

/* 背景 - 玄黑 */
--mystic-black: #0A0A0A;
--mystic-black-light: #1A1A1A;

/* 文字 - 宣纸白 */
--rice-paper: #F5F5DC;
--rice-paper-dim: #C9C9B5;
```

### 字体方案

```css
/* 标题 - 书法体 */
--font-title: 'Noto Serif SC', 'Source Han Serif SC', serif;

/* 正文 - 宋体 */
--font-body: 'Noto Sans SC', 'Source Han Sans SC', sans-serif;

/* 数字 - 等宽 */
--font-mono: 'SF Mono', 'Fira Code', monospace;
```

---

## 三、动画效果（React Bits 风格）

### 1. 文字动画

```typescript
// 诏令文字逐字显示
function ImperialText({ text }: { text: string }) {
  return (
    <div className="imperial-text">
      {text.split('').map((char, i) => (
        <span 
          key={i}
          style={{ animationDelay: `${i * 0.1}s` }}
          className="char-fade-in"
        >
          {char}
        </span>
      ))}
    </div>
  );
}
```

### 2. 卡片悬浮效果

```typescript
// 部门卡片 - 玉牌悬浮
function DepartmentCard({ dept }) {
  return (
    <div className="jade-card">
      <div className="jade-shine" />
      <div className="jade-content">
        <div className="seal">{dept.name}</div>
        <div className="description">{dept.role}</div>
      </div>
    </div>
  );
}
```

### 3. 页面过渡

```typescript
// 圣旨展开动画
function ImperialTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {children}
    </motion.div>
  );
}
```

### 4. 粒子效果（龙纹）

```typescript
// 背景龙纹粒子
function DragonParticles() {
  return (
    <div className="dragon-particles">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="dragon-scale"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      ))}
    </div>
  );
}
```

---

## 四、组件改造清单

### 前端组件

| 组件 | 改造内容 | 时间 |
|------|---------|------|
| Header | 改为圣旨卷轴样式 | 1h |
| Nav | 改为玉牌导航 | 1h |
| DepartmentCard | 改为玉玺印章样式 | 2h |
| TaskRow | 改为奏折样式 | 2h |
| Toast | 改为诏令宣读样式 | 1h |
| Loading | 改为龙纹旋转 | 1h |
| Button | 改为朱砂印泥按钮 | 1h |
| Input | 改为宣纸输入框 | 1h |

### 后端 API

| API | 改造内容 | 时间 |
|-----|---------|------|
| 路径 | 全部改为复古命名 | 2h |
| 返回数据 | 字段名改为复古 | 2h |
| 错误信息 | 改为诏令口吻 | 1h |

---

## 五、实施计划

### 第一阶段：命名统一（4小时）
- [ ] 前端路由改名
- [ ] 后端 API 路径改名
- [ ] 前端显示文字改名
- [ ] 配置文件改名

### 第二阶段：视觉改造（8小时）
- [ ] CSS 变量定义
- [ ] 字体引入
- [ ] 背景改造
- [ ] 卡片组件改造
- [ ] 按钮组件改造
- [ ] 导航改造

### 第三阶段：动画添加（6小时）
- [ ] 页面过渡动画
- [ ] 文字动画
- [ ] 悬浮效果
- [ ] 加载动画
- [ ] 粒子背景

### 第四阶段：测试跑通（2小时）
- [ ] 前端构建测试
- [ ] 后端 API 测试
- [ ] 整体流程测试

**总计：约20小时**

---

## 六、技术选型

### 动画库
```json
{
  "framer-motion": "^11.0.0",    // 页面过渡
  "gsap": "^3.12.0",             // 复杂动画
  "react-spring": "^9.7.0"       // 物理动画
}
```

### 字体
```bash
npm install @chinese-fonts/syst
```

### 图标
```bash
# 使用自定义 SVG 龙纹图标
```

---

## 七、示例效果

### 改造前
```
[现代风格]
┌─────────────────┐
│ OpenReign Pro   │
│ 兵器库          │
│ [兵部]          │
└─────────────────┘
```

### 改造后
```
[帝国复古]
┌─────────────────┐
│  御书房         │
│  ╔═══════╗      │
│  ║ 武备司 ║      │
│  ╚═══════╝      │
│  [兵部司]       │
└─────────────────┘
```

---

要我开始实施吗？建议分阶段来，先做命名统一（4小时）？
