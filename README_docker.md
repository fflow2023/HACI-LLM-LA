# 🐳 HACI-LLM-LA 全功能 Docker 部署指南 (小白向)

本指南旨在帮助任何人，在**完全空白的 Linux 服务器或 Windows 系统**上，从零开始拉起整套带有前端、后端、MySQL 数据库及大模型向量检索服务的完整应用系统。

---

## 🚀 核心前置准备

在开始之前，请确保你的服务器/系统内安装了以下三种核心环境：

1. **[Git](https://git-scm.com/downloads)** - 用于拉取项目代码和大模型文件。
2. **[Docker](https://docs.docker.com/engine/install/)** - 核心容器引擎（Windows 用户请直接安装 Docker Desktop）。
3. **Docker Compose** - 如果是较新的 Docker 版本本身自带 `docker compose`，如果是老版本 Linux 请单独安装。

---

## 📦 第一步：获取源码与本地大模型

### 1.1 克隆项目主代码

找一个空白目录，将整个项目克隆下来并进入文件夹：

```bash
git clone https://github.com/你的仓库地址/HACI-LLM-LA.git
cd HACI-LLM-LA
```

### 1.2 手动下载文本向量化模型（极其重要）

为了让本地知识库（RAG）能够正常运算，你需要将 `text2vec-large-chinese` 模型放置入此项目的特定文件夹下。

请在项目根目录 `HACI-LLM-LA` 内，运行以下命令（请确保你安装了 Git LFS）：

```bash
cd models/embedding
git clone https://huggingface.co/GanymedeNil/text2vec-large-chinese
```

> **注意**：下载完成后，请确保模型文件夹的目录结构必定是 `HACI-LLM-LA/models/embedding/text2vec-large-chinese/`。

完事后，重新回到项目根目录：

```bash
cd ../../
```

---

## ⚙️ 第二步：准备两份神秘的配置文件 (.env)

为了安全与环境独立，你需要**手动创建**两份极为关键的配置文件并填入内容。你可以直接**复制以下模板内容**，只需把它里面提到的“这里替换成你的 API KEY”填好即可。

### 1. 前端配置：`views/.env`

在项目目录的 `views` 文件夹下，创建一个名为 `.env` 的文件（请注意不要带前缀名，就叫 `.env`）。将底下内容全盘复制进去，并把里面的硅基流动 API KEY 填成你的：

```ini
# ====== views/.env 模板 ======

# 全局 API 请求路径，前端所有的接口去向将统一经由 Nginx 代理分发，勿改。
VITE_GLOB_API_URL=/api

# 是否开启长回复（开启可能会耗费更多Token）
VITE_GLOB_OPEN_LONG_REPLY=false

# PWA 支持
VITE_GLOB_APP_PWA=false

# 【请修改】修改为你自己的硅基流动 API KEY (必需项)
VITE_SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 【请修改】选择你想要对话调用的满命大模型，如 deepseek-ai/DeepSeek-V3.2 或 Qwen/Qwen2.5-7B-Instruct
VITE_SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3.2
```

### 2. 全局环境与后端配置：`.env.docker`

回到项目的根目录 `HACI-LLM-LA`，创建一个名为 `.env.docker` 的文件。这主要负责了内网联通的鉴权与数据库密码设置：

```ini
# ====== .env.docker 模板 ======

# ----- MySQL 数据库根密码配置 -----
MYSQL_ROOT_PASSWORD=123456
MYSQL_DATABASE=llm_service

# ----- Service (后端服务连接配置) -----
# 以下地址均为 Docker 单机网桥内的内部服务定位，【千万不要修改】
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=llm_service
EMBEDDING_SERVER_URL=http://embedding:56391

# CORS 允许的请求白名单映射（通常默认即可）
ALLOWED_ORIGINS=http://localhost,http://localhost:2493,http://127.0.0.1

# ----- 系统安全选项 JWT -----
# 建议自行修改成一串随机英文字母，作为你的用户登录鉴权盐值
JWT_SECRET=dev_temp_key_123456
JWT_EXPIRES_IN=3600s

# ----- 第三方外部 API KEY 备用选项（如暂无不填亦可） -----
OPENAI_API_KEY=sk-xxxx
COHERE_API_KEY=xxxx
```

---

## 🚀 第三步：一键神迹降临（构建与启动）

一切就绪！现在，只需在根目录敲下一句命令：

```bash
docker compose up -d --build
```

> **首次运行重点**：这一步因为需要从头下载 Python, Node.js 等构建环境甚至编译纯净 Nginx 静态包，它可能会花费相当长几分钟，请耐心等待命令行显示 `Started` 或 `Healthy` 的完成标语。

---

## 🌐 第四步：畅游系统

部署完毕后，系统通过 Docker 极具穿透性的架构隔离将安全展现完毕。打开你的浏览器：

| 服务与功能项            | 浏览器访问地址            |
| ----------------------- | ------------------------- |
| **💡 主界面与使用入口** | **http://localhost:2493** |
| 后端 API 裸接口验证     | http://localhost:3000     |
| Swagger 文档（开发向）  | http://localhost:3000/api |
| 内部向量数据库 API状态  | http://localhost:56391    |

恭喜！此刻你已成功架设自己的 HACI-LLM-LA 全功能生态圈！

---

## 🛠️ (进阶选项) 全速开启 NVIDIA GPU 加速引擎

如果你所在的部署机器装有英伟达 (NVIDIA) 显卡，你可以开启 GPU 并获得百倍的向量词典组建及检索响应提速（极大解决长文卡顿问题）！

1. 确保服务器机器装有 **NVIDIA 驱动** 及 **[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)**，以此打通宿主机 GPU 传递至 Docker 虚拟机的通道。
2. 打开 `docker-compose.yml` 文件。在第 `41` 行左右，把与 `deploy` / `resources` 相关的注释全部解开（取消 # 号前面），如下：

   ```yaml
   # ===== GPU 支持 =====
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: 1
             capabilities: [gpu]
   ```

3. 打开 `models/embedding/Dockerfile`，修改第 28 行左右（PyTorch 下载地址）：
   - 注释或删掉 CPU 的下载行：`# RUN pip install torch --index-url https://download.pytorch.org/whl/cpu`
   - **放开 GPU(CU121) 的下载行注释**：`RUN pip install torch --index-url https://download.pytorch.org/whl/cu121`

4. 完事后，直接在控制台敲入 `docker compose up -d --build` 重装即可让大模型装上引擎起飞！

---

## 🖥️ 其它你可能会用到的常用指令

```bash
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
