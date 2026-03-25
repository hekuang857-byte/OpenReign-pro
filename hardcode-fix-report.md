# 硬编码部门问题修复报告

## 🔍 发现的问题

### 1. 前端硬编码（已修复）
- ✅ **TokenRanking.tsx** - 8行硬编码部门数据 → 改为动态读取 `/api/departments`
- ✅ **Memorials.tsx** - STAGE_CONFIG 硬编码 + 示例数据硬编码 → 改为动态生成
- ✅ **CourtDiscussion.tsx** - DEPTS 硬编码数组 → 改为动态读取
- ✅ **Armory.tsx** - SKILL_CATEGORIES 硬编码 → 改为动态读取

### 2. 后端硬编码（已修复）
- ✅ **server.js /api/stats/tokens** - 8行硬编码部门统计 → 改为从 `cfg.agents` 动态读取
- ✅ **server.js /api/memorials** - 3条硬编码奏折 → 改为动态生成

### 3. 导航重复（已修复）
- ✅ **App.tsx** - 删除重复的"技能"导航（兵器库已包含技能管理）

## ✅ 修复后的行为

| 功能 | 数据来源 | 新部门自动展示 |
|------|----------|----------------|
| Token排行榜 | `/api/stats/tokens` | ✅ |
| 奏折阁 | `/api/memorials` | ✅ |
| 朝堂议政 | `/api/departments` | ✅ |
| 兵器库 | `/api/departments` | ✅ |

## 📝 代码规范

**以后涉及部门的功能，遵循以下规则：**

1. **前端组件**
   ```typescript
   // ✅ 正确 - 动态获取
   const [departments, setDepartments] = useState([]);
   useEffect(() => {
     fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.departments));
   }, []);
   
   // ❌ 错误 - 硬编码
   const DEPTS = [{ id: 'bingbu', name: '兵部' }, ...];
   ```

2. **后端 API**
   ```javascript
   // ✅ 正确 - 从配置读取
   const agents = cfg?.agents || {};
   const depts = Object.values(agents).filter(d => d.enabled !== false);
   
   // ❌ 错误 - 硬编码
   const stats = [{ dept: '太子', ... }, { dept: '中书省', ... }];
   ```

## 🎯 测试结果

- Token统计 API: 返回 6 个部门 ✅
- 构建成功: 245KB JS ✅
- TypeScript: 零错误 ✅

## 📁 修改文件

1. `dashboard/src/pages/TokenRanking.tsx`
2. `dashboard/src/pages/Memorials.tsx`
3. `dashboard/src/pages/CourtDiscussion.tsx`
4. `dashboard/src/pages/Armory.tsx`
5. `dashboard/src/App.tsx`
6. `dashboard/server.js`

---
**状态**: 全部硬编码已修复，现在所有部门相关功能都支持用户创建的新部门自动展示
