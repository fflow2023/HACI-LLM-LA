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

  #前端地址
  ALLOWED_ORIGINS=http://localhost:1002,http://172.22.80.1:1002

  # Database
  DB_HOST=localhost
  DB_PORT=3306
  DB_USERNAME=root
  DB_PASSWORD=自己的数据库密码
  DB_DATABASE=llm_service

  # JWT 暂时不用管
  JWT_SECRET=dev_temp_key_123456
  JWT_EXPIRES_IN=3600s
  ```

- 手动创建mysql数据库
  ```shell
  mysql -h localhost -u root -p
  CREATE DATABASE llm_service 
  #验证数据库是否创建成功
  SHOW DATABASES LIKE 'llm_service';
  ```

- 启动后端(此时仍然在HACI-LLM-LA/service目录下)
  ```shell
  pnpm start:dev
  ```

- 手动插入管理员账户
  ```shell
  #明文密码需包含大小写字母及数字，如Ab123456
  $hash = node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Ab123456', 10))"
  Write-Host "生成的哈希值: $hash"
  #进入数据库
  mysql -h localhost -u root -p llm_service
  #插入admin
  INSERT INTO users (
  username,
  password,
  role,
  created_at
  ) VALUES (
  'admin1',
  '替换为你的实际哈希值', 
  'ADMIN',
  NOW()
  );
  ```

- 在前端进行注册和登录,USER会进入chat页面，ADMIN会进入管理员界面。
- 在管理员界面可以对用户信息进行查看修改(重置密码的默认密码为Ab123456)
- 在管理员界面可以上传知识库文件，目前chat页面的知识库问答功能是默认开启的，需要运行models层才能生效。



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
> 2025.04.21 `lsf` 增加模版红头文件
> 2025.04.21 `zjh` 增加OCR功能
> 2025.04.09 `zjh` 增加上传文件逻辑
> 2025.03.28 `lsf` 增加文书样版种类
> 2025.03.25 `zq` 增加局域网启动功能
> 2025.03.23 `zq` 增加知识库功能
> 2025.03.20 `zq` 添加silicon flow接口，并实现流式生成
> 2025.03.19 `zhy` 完成“编辑器”功能
> 2025.03.18 `zjh` 完成“在页面中编辑”的功能
> 2025.03.17 `zq` 修复前端页面bug


## 新增功能说明

### 任务一：用户管理功能（zhy）
1. **注册和登录UI + 后端接口**  
   实现用户注册和登录界面的前端与后端接口，确保用户能够成功注册和登录。

2. **登录后生成验证用的token**  
   登录成功后生成验证用的token，并修改代码，确保后续所有操作都需要该token，若token无效或过期，系统会提示用户重新登录。

3. **存储用户交互历史**  
   将用户的交互历史数据存储在服务器端，并使用数据库进行管理。原有的导出历史功能可以参考现有代码（如无法找到可咨询我）。

4. **修改导出历史结构**  
   在现有的导出历史中，新增字段以记录用户的身份ID，方便进行历史记录的追溯。

### 任务二：交互风格定义（lsf）
1. **定义四种类型的prompt**  
   根据DeepSeek的prompt模板，借助大模型，编写四种不同类型的prompt，并将其集成到代码中。

2. **增加前端UI界面**  
   为用户增加选择性格的UI界面，允许用户设置默认的性格类型，提升个性化体验。

3. **修改system prompt**  
   修改原有的system prompt，将其分为静态和动态两部分：静态部分包括基本信息（例如“你是东北大学的学习助手...”），动态部分根据用户选择的性格生成相应的prompt。

4. **修改导出历史结构**  
   在原有的导出历史中，增加一个字段，用于记录用户选择的性格类型，确保每条记录都能关联到具体的交互风格。

### 任务三：知识库管理及管理员管理（zjh）
1. **增加管理员功能**  
   在现有UI中增加管理员相关功能，可以通过增加框架或新建页面实现，确保管理员能够有效管理用户和系统。

2. **将本地RAG改为统一管理的RAG**  
   将原本本地的RAG（Relevance-Aware Graph）模块修改为统一管理模式，以便更高效地进行内容管理。

3. **修改UI界面**  
   适当修改UI界面，允许用户自行修改的部分保留，不允许修改的部分应注释掉或禁用，确保系统安全性和可用性。

4. **完善附件上传功能**  
   支持附件上传功能，允许用户上传不同格式的文件（如pdf、word、csv、ppt、txt、md、xlsx、json等），提升系统的兼容性。

5. **管理员查看用户历史记录**  
   实现管理员功能，允许管理员查看所有用户的交互历史记录，进行必要的审查和管理。
