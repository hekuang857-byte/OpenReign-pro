# 快速开始指南

## 5 分钟上手 OpenReign Pro

### 1. 启动服务（1分钟）

```bash
cd dashboard
npm install  # 如果还没安装
npm run server
```

服务启动后：
- Dashboard: http://localhost:18790
- API: http://localhost:18790/api

### 2. 创建第一个任务（2分钟）

```bash
# 创建任务
curl -X POST http://localhost:18790/api/kanban/create \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "JJC-001",
    "title": "我的第一个任务",
    "state": "taizi",
    "org": "太子",
    "official": "太子"
  }'

# 添加流转记录
curl -X POST http://localhost:18790/api/kanban/flow \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "JJC-001",
    "from": "太子",
    "to": "中书省",
    "remark": "分拣完成"
  }'
```

### 3. 查看奏折（1分钟）

```bash
# 获取奏折
curl http://localhost:18790/api/kanban/memorial/JJC-001 | jq .

# 导出 Markdown
curl http://localhost:18790/api/kanban/memorial/JJC-001/markdown
```

### 4. 查看前端（1分钟）

打开浏览器访问：http://localhost:18790

---

## 常用操作

### 创建完整流程

```bash
#!/bin/bash

TASK_ID="JJC-$(date +%s)"

# 1. 创建任务
curl -X POST http://localhost:18790/api/kanban/create \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"title\": \"测试完整流程\",
    \"state\": \"taizi\"
  }"

# 2. 太子→中书
curl -X POST http://localhost:18790/api/kanban/flow \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"from\": \"太子\",
    \"to\": \"中书省\"
  }"

# 3. 中书→门下
curl -X POST http://localhost:18790/api/kanban/flow \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"from\": \"中书省\",
    \"to\": \"门下省\"
  }"

# 4. 门下→尚书
curl -X POST http://localhost:18790/api/kanban/flow \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"from\": \"门下省\",
    \"to\": \"尚书省\",
    \"remark\": \"准奏\"
  }"

# 5. 尚书→六部
curl -X POST http://localhost:18790/api/kanban/flow \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"from\": \"尚书省\",
    \"to\": \"兵部\"
  }"

# 6. 完成
curl -X POST http://localhost:18790/api/kanban/done \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"output\": \"任务执行完成\",
    \"summary\": \"事已告竣\"
  }"

echo "任务完成: $TASK_ID"
```

### 查看任务列表

```bash
curl http://localhost:18790/api/kanban/tasks | jq '.tasks'
```

### 查看奏折列表

```bash
curl http://localhost:18790/api/kanban/memorials | jq '.memorials'
```

---

## 配置自定义部门

编辑 `config/departments.json`：

```json
{
  "my_dept": {
    "id": "my_dept",
    "name": "我的部门",
    "type": "extension",
    "execution": {
      "mode": "skill",
      "skill": "my-skill",
      "entrypoint": "execute"
    },
    "reporting": {
      "progressTemplate": "启奏陛下，{name}正在{action}，{detail}"
    }
  }
}
```

重启服务后生效。

---

## 下一步

- 📖 阅读 [古风使用指南](docs/classical-style-guide.md)
- 🔧 了解 [扩展部门](docs/extension-departments.md)
- 📚 查看完整 [README](README.md)

---

遇到问题？检查服务日志：

```bash
npm run server 2>&1 | tee server.log
```
