## 部署
### 前提警告
> 本项目使用的node版本为18，如果之前未使用nvm管理node版本，并且下载的node版本非18，可以使用nvm切换

- 查看当前的node版本
  ```shell
  node -v
  ```
- 安装nvm（以mac环境为例）
  ```shell
  brew install nvm
  ```
- 配置环境变量(一般是在.zshrc中配置)
  ```shell
  export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
  ```
- 重新加载配置文件
  ```shell
  source ~/.zshrc
  ```
- 安装node版本
  ```shell
  nvm install 18
  ```
- 使用node版本
  ```shell
  nvm use 18
  ```
- 查看当前node版本
  ```shell
  node -v
  ```


### 详细步骤
- 下载项目，并进入根目录
  ```shell
  git clone https://github.com/Zq5437/HACI-LLM-LA.git
  cd HACI-LLM-LA
  ```
- 进入view文件夹，安装依赖和设置变量
  ```shell
  cd views
  pnpm i
  ```
- 在当前目录（HACI-LLM-LA/views）下，新建`.env`文件，并添加以下内容
  ```shell
  # Glob API URL
  VITE_GLOB_API_URL=/api

  VITE_APP_API_BASE_URL=http://127.0.0.1:3002/

  # Whether long replies are supported, which may result in higher API fees
  VITE_GLOB_OPEN_LONG_REPLY=false

  # When you want to use PWA
  VITE_GLOB_APP_PWA=false

  # 设置siliconflow api key，请自行填入自己的api-key
  VITE_SILICONFLOW_API_KEY="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

  # 设置siliconflow的模型
  VITE_SILICONFLOW_MODEL="deepseek-ai/DeepSeek-V3"
  # VITE_SILICONFLOW_MODEL="Qwen/Qwen2.5-7B-Instruct"
  # 思考模型:
  
  # VITE_SILICONFLOW_MODEL="deepseek-ai/DeepSeek-R1"
  # VITE_SILICONFLOW_MODEL="Qwen/QwQ-32B" 

  # 设置views的地址，启动为局域网时，需修改为实际地址
  VITE_VIEWS_ADDRESS="http://127.0.0.1:1002"
  # VITE_VIEWS_ADDRESS="http://10.108.113.53:1002"
  
  # 设置service的地址，启动为局域网时，需修改为实际地址
  VITE_SERVICE_ADDRESS="http://127.0.0.1:3000"
  # VITE_SERVICE_ADDRESS="http://10.108.113.53:3000"
  ```
- 启动前端(此时仍然在HACI-LLM-LA/views目录下)
  ```shell
  npm run dev
  ```
- 打开前端地址：http://localhost:1002/
- 退出views目录，进入service目录，安装依赖
  ```shell
  cd ../service
  yarn
  ```
- 在当前（service）目录下新建.env文件，并添加以下内容
  ```shell
  # 2 below are examples
  # 本地启动
  EMBEDDING_SERVER_URL=http://127.0.0.1:56391
  # 启动为局域网
  # EMBEDDING_SERVER_URL=http://10.108.113.53:56391


  CHATGLM_6B_SERVER_URL=http://192.168.1.99:56721    
  #EMBEDDING_SERVER_URL=
  #CHATGLM_6B_SERVER_URL=
  OPENAI_API_KEY=xxxx
  COHERE_API_KEY=WrJWnnCOXit1EiZ3eGvIoeqK3tPvnWyOp55oeSxW
  ```
- 启动后端(此时仍然在HACI-LLM-LA/service目录下)
  ```shell
  pnpm start:dev
  ```

- 退出service目录，进入models/embedding目录，安装依赖(建议单独拉一个python环境安装，依赖挺容易出问题)
  ```shell
  cd ../models/embedding
  pip install -r requirements.txt
  ```
- 手动下载[text2vec-large-chinese](https://huggingface.co/GanymedeNil/text2vec-large-chinese)到embedding目录下(embedding/text2vec-large-chinese)，或者输入命令:
  ```shell
  git clone https://huggingface.co/GanymedeNil/text2vec-large-chinese
  ```
- 启动模型层(此时仍然在HACI-LLM-LA/models/embedding目录下)
  ```shell
  python api.py
  ```

## 快速启动
> `前提是前面的配置都已经完成`，这个时候可以用下面的命令快速启动和停止，并保留日志文件，日志文件在`/HACI-LLM-LA/logs`下。
### 启动
```shell
bash run.sh
```

### 停止
```shell
bash stop.sh
```

## 局域网内启动提示
1. 在[/HACI-LLM-LA/views/.env](/views/.env)中，将VITE_VIEWS_ADDRESS修改为views端的局域网地址
2. 在[/HACI-LLM-LA/views/.env](/views/.env)中，将VITE_SERVICE_ADDRESS修改为service端的局域网地址
3. 在[/HACI-LLM-LA/service/.env](/service/.env)中，将EMBEDDING_SERVER_URL修改为embedding模型的局域网地址
4. 如果service中没有局域网地址，请检查[HACI-LLM-LA/service/src/main.ts](/service/src/main.ts)文件中start_lan变量是否设置为true（默认为true）
-----------------------------------

## 项目日志
> 2025.04.09 `zjh` 增加上传文件逻辑
> 2025.03.28 `lsf` 增加文书样版种类
> 2025.03.25 `zq` 增加局域网启动功能
> 2025.03.23 `zq` 增加知识库功能
> 2025.03.20 `zq` 添加silicon flow接口，并实现流式生成
> 2025.03.19 `zhy` 完成“编辑器”功能
> 2025.03.18 `zjh` 完成“在页面中编辑”的功能
> 2025.03.17 `zq` 修复前端页面bug




----------------------------------

下面的readme可以先不用看，后续readme会更新

---------------------------------

## 介绍

本项目旨在构建一个：模型层(models)-服务层(service)-展示层(views) 三层完全解耦的、支持二次开发、分开部署的、LLM落地框架。

(本项目展示层(views)已支持[langchain-ChatGLM](https://github.com/imClumsyPanda/langchain-ChatGLM))

模型层：使用Python 3。采用各种方式加载模型，并采用Fastapi将所有接口api化。
后续计划：
用OPenai api的格式统一封装所有本地模型。
将模型层制作成sdk并独立仓库，进一步降低部署难度。       
计划参考：https://github.com/ninehills/chatglm-openai-api

服务层：使用JS。采用Langchain.js+nest.js框架，实现业务逻辑开发与数据处理，提高与拓展模型层的性能。
后续计划:
不断跟进langchain-ChatGLM等优秀中间层项目，升级服务层。
参考项目：https://github.com/imClumsyPanda/langchain-ChatGLM

展示层: 使用JS。采用vue3全家桶+native-ui,展示本项目的成果。
后续计划：
不断跟进应用层的升级，同时提高页面的美观程度和交互体验。
参考项目：https://github.com/Chanzhaoyu/chatgpt-web


## 未来展望

本项目的阶段性目标，是提供 LLM封装->本地知识库搭建->商业化部署->用户反馈收集(前端埋点，数据清洗等)->模型专业领域微调(使用上一个阶段收集的数据集)->LLM封装
这样的LLM专业领域落地闭环解决方案

即在将数据收集处理，模型微调解决方案也加入工作流。




## 项目原理

⛓️ 本项目实现原理如下图来自(https://github.com/imClumsyPanda/langchain-ChatGLM/tree/master) 所示，过程包括加载文件 -> 读取文本 -> 文本分割 -> 文本向量化 -> 问句向量化 -> 在文本向量中匹配出与问句向量最相似的`top k`个 -> 匹配出的文本作为上下文和问题一起添加到`prompt`中 -> 提交给`LLM`生成回答。

![实现原理图](img/langchain+chatglm.png)

## 变更日志
2023.5.18 service层初步重构，部署后访问http://localhost:3000/api 即可查看接口文档.

2023.5.11 项目引入Openai和Cohere接口，降低硬件要求 v0.2.5

2023.5.7 项目完成初步设计v0.2.0

2023.4.27 项目正式发布v0.1.0





## 硬件需求
- Openai或Cohere无硬件需求
   
   本项目已引入Openai与Cohere接口，使用apikey，无硬件要求。
   
   Cohere的embedding模型可以在线使用，注册门槛低且有免费试用额度，推荐尝试 https://dashboard.cohere.ai/api-keys
   
- ChatGLM-6B 模型硬件需求
  
    | **量化等级**   | **最低 GPU 显存**（推理） | **最低 GPU 显存**（高效参数微调） |
    | -------------- | ------------------------- | --------------------------------- |
    | FP16（无量化） | 13 GB                     | 14 GB                             |
    | INT8           | 8 GB                     | 9 GB                             |
    | INT4           | 6 GB                      | 7 GB                              |

- Embedding 模型硬件需求

    本项目选用的 Embedding 模型 [GanymedeNil/text2vec-large-chinese](https://huggingface.co/GanymedeNil/text2vec-large-chinese/tree/main) 约占用显存 3GB，也可修改为在 CPU 中运行。


## 开发部署

### 软件需求

Node18,Python 3

### 如果本地已有模型：从本地加载模型

请参考 [THUDM/ChatGLM-6B#从本地加载模型](https://github.com/THUDM/ChatGLM-6B#从本地加载模型)

### 服务层(service)
cd service
安装依赖并启动
- 项目下载\
- 安装依赖
    - yarn 
- 运行
  - pnpm start:dev 
- 配置
  - .env\
    `在项目的根目录下，设置.env，EMBEDDING_SERVER_URL为embedding的ip地址,CHATGLM_6B_SERVER_URL为chatGLM-6B的ip地址`
    
### 模型层(models)    
（如果不使用本地模型，请忽略此步骤）
cd models

 - chatGLM-6B\
    `cd ChatGLM-6B`
    - pip install -r requirements.txt #建议走国内pip镜像源，比较快
    - python api.py
    
  - embedding\
    `cd ../embedding`
    - python api.py # 依赖讲道理都可以在chatGLM-6B的依赖里

### 前端(views)
cd views

pnpm i

npm run dev

### docker部署
- 1. \
  ```git clone https://github.com/fxjhello/langchain_chatglm_nest.git```
- 2. \
  ```cd langchain_chatglm_nest```
- 3. \
  ```cd service```\
  ```docker build -t langchain_chatglm_nest:v1.0.0 -f ./dockerfile . # 打包```
- 4. \
  ```docker run -d --restart=always --name langchain_chatglm_nest-main  -p  51798:3000  langchain_chatglm_nest-main:1.0.0 #左边的端口随便取```
### 提问
- issues
- 微信群\
  欢迎大家提问，我们会补充文档和优化的
## 鸣谢
本项目的原理图，实现思路，以及Embedding 模型py封装，均来自(https://github.com/imClumsyPanda/langchain-ChatGLM/tree/master)

## 路线图

- [ ] Langchain 应用
  - [x] 支持多种文档格式（已支持 pdf、docx、txt 文件格式）
  - [ ] 搜索引擎与本地网页接入
  - [ ] 结构化数据接入（如 csv、Excel、SQL 等）
  - [ ] 知识图谱/图数据库接入
  - [ ] 更多功能 实现
- [ ] 增加更多 LLM 模型支持
  - [x] [THUDM/chatglm-6b](https://huggingface.co/THUDM/chatglm-6b)
- [ ] 增加更多 Embedding 模型支持
  - [x] [GanymedeNil/text2vec-large-chinese](https://huggingface.co/GanymedeNil/text2vec-large-chinese)
- [ ] 前端
  - [x] 增加前端展示界面
