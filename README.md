# 🤖 HACI-AI-Learning-Assistant (HACI-LLM-LA)

HACI-AI-Learning-Assistant 是一款专为教育场景设计的智能辅助系统。它基于 LLM（大语言模型）和 RAG（检索增强生成）技术，提供智能问答、知识库管理、OCR 文字识别及多角色教学辅助等功能。

---

## ✨ 核心特性

- **🚀 智能化对话**：支持流式输出，集成硅基流动（SiliconFlow）平台，适配 DeepSeek-V3、Qwen 等主流大模型。
- **📚 RAG 知识库**：支持上传 PDF、Word、TXT、Excel 等多种格式文件，通过本地文本向量化模型实现精准的知识检索。
- **🔍 OCR 文字识别**：内置 Tesseract.js 和多模态处理，支持图片文本解析，协助处理扫描版文档。
- **👤 多角色切换**：内置多种教学助手角色，可根据学习需求动态切换对话风格。
- **🛡️ 管理控制台**：
  - **用户管理**：学号登录、权限控制（ADMIN/USER）。
  - **内容审核**：查看历史对话记录，审计交互内容。
  - **模型配置**：上传、解析及删除知识库文件。
- **🐳 全功能 Docker 化**：一键拉取前端、后端、数据库及向量模型，实现极简部署。

---

## 🛠️ 技术栈

- **前端**：Vue 3 + Typescript + Vite + Naive UI + Pinia
- **后端**：NestJS + TypeORM + MySQL 8.0
- **模型端**：Python + Flask + Sentence-Transformers
   (`text2vec-large-chinese` 或 `paraphrase-multilingual-MiniLM-L12-v2`)
- **运维**：Docker + Docker Compose + Nginx

---

## 🚀 快速开始 (Docker 部署 - 推荐)

### 核心前置准备

在开始之前，请确保你的服务器/系统内安装了以下三种核心环境：

1. **[Git](https://git-scm.com/downloads)** - 用于拉取项目代码和大模型文件。
2. **[Docker](https://docs.docker.com/engine/install/)** - 核心容器引擎（Windows 用户请直接安装 Docker Desktop）。
3. **Docker Compose** - 如果是较新的 Docker 版本本身自带 `docker compose`，如果是老版本 Linux 请单独安装。

---

这是最简单、最稳定的部署方式，适用于所有支持 Docker 的系统。

### 1. 获取源码
```bash
git clone https://github.com/fflow2023/HACI-AI-Learning-Assistant.git
cd HACI-AI-Learning-Assistant
```

### 2. 下载向量模型 (必须)
为了让知识库检索正常工作，你需要手动下载 `paraphrase-multilingual-MiniLM-L12-v2` 模型。
- 下载模型文件后，确保其路径为：`models/embedding/paraphrase-multilingual-MiniLM-L12-v2/`。
- *注：文件夹下应包含 `pytorch_model.bin`、`config.json` 等文件。*

### 3. 配置环境变量
你需要创建两份 `.env` 文件：

- **前端配置**：`views/.env`
```ini
# Glob API URL
VITE_GLOB_API_URL=/AIlearning/api

# 开启后会在终端打印调试输出，部署时关闭
VITE_GLOB_LOG_DEBUG=true

# 前端 API 统一通过 Nginx 代理 /api 访问后端，无需配置具体地址
# VITE_APP_API_BASE_URL 已废弃（之前直连后端用，现在走 /api 代理）

# 是否支持长回复，这可能会导致更高的 API 费用。
VITE_GLOB_OPEN_LONG_REPLY=false

# When you want to use PWA
VITE_GLOB_APP_PWA=false

# 设置siliconflow api key，请自行填入自己的api-key
VITE_SILICONFLOW_API_KEY=sk-

# 设置siliconflow的模型
VITE_SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3.2
# VITE_SILICONFLOW_MODEL="Qwen/Qwen2.5-7B-Instruct"
# 思考模型:
# VITE_SILICONFLOW_MODEL="deepseek-ai/DeepSeek-R1"
# VITE_SILICONFLOW_MODEL="Qwen/QwQ-32B"
```

- **全局 Docker 配置**：`.env.docker`
```ini
# ----- MySQL 配置 -----
MYSQL_ROOT_PASSWORD=123456
MYSQL_DATABASE=llm_service

# ----- Service (后端) 配置 -----
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=llm_service

# embedding 服务在 Docker 网络中的地址
EMBEDDING_SERVER_URL=http://embedding:56391

# CORS 允许的前端地址（Docker 内部通过 Nginx 访问，一般不需要修改）
ALLOWED_ORIGINS=http://localhost,http://localhost:2493,http://127.0.0.1

# JWT 配置
JWT_SECRET= 123abc #随机填一串字符用于鉴权
JWT_EXPIRES_IN=3600s

# 其他 API Key（按需填写）
OPENAI_API_KEY=xxxx
COHERE_API_KEY=WrJWnnCOXit1EiZ3eGvIoeqK3tPvnWyOp55oeSxW
```

### 4. 启动系统
```bash
docker compose up -d --build
```
首次启动可能需要几分钟。完成后，访问：  
- **用户前台**：`http://localhost:2493/AIlearning/`
- **默认管理员**：账号 `admin` / 密码 `Ab123456`

---

## ⚙️ 进阶配置与手动部署

### GPU 性能优化
如果你有 NVIDIA 显卡，可以开启 GPU 加速：
1. 修改 `docker-compose.yml`，解开 `embedding` 服务下的 `deploy` 配置注释。
2. 修改 `models/embedding/Dockerfile`，切换为 `cu121` 版本的 PyTorch。

### 手动本地开发 (非 Docker)
请分别进入各个目录按照以下顺序启动：

1. **MySQL 8.0**：创建名为 `llm_service` 的数据库。
2. **Models Layer**：
   - 进入 `models/embedding`，安装 `requirements.txt`。
   - 运行 `python api.py`。
3. **Backend (Service)**：
   - 进入 `service`，执行 `pnpm install`。
   - 配置 `service/.env`。
   - 运行 `pnpm start:dev`。
4. **Frontend (Views)**：
   - 进入 `views`，执行 `pnpm install`。
   - 运行 `npm run dev`。

---

## 📖 常用管理指令

```bash
docker compose up -d

# 实时查看看某个服务的报错或运行日志（极其常用！）
docker compose logs -f views       # 查看前端
docker compose logs -f service     # 查看后端
docker compose logs -f embedding   # 查看长文本向量解析模型

# 查看当前运行着的容器以及存活状态
docker compose ps

# 强制停止整个项目，并摧毁所有的容器结构
docker compose down

# ⚠️ 连库带本彻底摧毁（连你的聊天记录和上传的文档也全部删除归零重构，慎用！）
docker compose down -v
```

---

## 更新日志:

2026.3.11 完成api路径重构，切换到`/AIlearning/`子域名
2026.3.5 集成课程资料提示词
2026.3.2 实现语料库语言学学习助手