FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# 先复制依赖文件
COPY requirements.txt ./

# 安装 PyTorch CPU 版本（如需 GPU 版本，请注释下面一行，取消注释再下面的 GPU 行）
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
# GPU 版本（需要 NVIDIA Container Toolkit）：
# RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu121

# 安装其余 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 模型文件通过外部 docker-compose 挂载到 /app/paraphrase-multilingual-MiniLM-L12-v2

# 复制应用代码
COPY api.py ./

EXPOSE 56391

CMD ["python", "api.py"]
