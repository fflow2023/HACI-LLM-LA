# 知识库检索 API 规范

## API 端点
`POST /api/chatfileContent`

## 请求格式
```json
{
  "message": "用户查询内容",
  "knowledgeBase": "知识库标识",
  "hyperparameters": {
    "document_number": 返回文档片段数量,
  }
}