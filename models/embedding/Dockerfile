FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# 💥 必须放到 COPY requirements 之前！这样 Docker 会永久缓存这巨大的几百兆依赖，
# 使用阿里云镜像源加速 PyTorch (CPU 版) 下载
RUN pip install torch==2.1.2+cpu -f https://mirrors.aliyun.com/pytorch-wheels/cpu/torch_stable.html

# 先复制依赖文件
COPY requirements.txt ./

# 安装其余 Python 依赖 (清华源)
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 模型文件通过外部 docker-compose 挂载到 /app/paraphrase-multilingual-MiniLM-L12-v2

# 复制应用代码
COPY api.py ./

EXPOSE 56391

CMD ["python", "api.py"]
