以下为旧的手动部署教程，现在已经更新为docker部署，请参考[README_docker.md](README_docker.md)

---

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
  VITE_VIEWS_ADDRESS="http://127.0.0.1:2493"
  # VITE_VIEWS_ADDRESS="http://10.108.113.53:2493"
  
  # 设置service的地址，启动为局域网时，需修改为实际地址
  VITE_SERVICE_ADDRESS="http://127.0.0.1:3000"
  # VITE_SERVICE_ADDRESS="http://10.108.113.53:3000"
  ```
- 启动前端(此时仍然在HACI-LLM-LA/views目录下)
  ```shell
  npm run dev
  ```
- 打开前端地址：http://localhost:2493/
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

  # 配置允许的域名/地址（用英文逗号分隔）
  ALLOWED_ORIGINS=http://localhost:2493,http://172.22.80.1:2493

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

- 手动创建mysql数据库（目前新添了姓名字段，之前的存入的数据需要统一清空重新存入）
  ```shell
  mysql -h localhost -u root -p
  CREATE DATABASE llm_service 
  #验证数据库是否创建成功
  SHOW DATABASES LIKE 'llm_service';
  ```

- 目前新增了chatrecord表用于存储交互记录，如无法自动建表请手动插入
  ```shell
  mysql -h localhost -u root -p
  
  CREATE TABLE chat_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    username VARCHAR(9) NOT NULL COMMENT '学号（外键）',
    name VARCHAR(30) NOT NULL COMMENT '用户姓名',
    question TEXT NOT NULL COMMENT '用户提问内容',
    answer TEXT NOT NULL COMMENT 'AI回答内容',
    character_used VARCHAR(50) DEFAULT 'strict' COMMENT '使用的教师角色',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 外键约束
    FOREIGN KEY (username) 
    REFERENCES users(username)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
    
    -- 索引优化
    INDEX idx_username (username),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  name,
  password,
  role,
  created_at
  ) VALUES (
  'admin1',
  '管理员',
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