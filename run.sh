#!/bin/bash

# 彩色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_BASE_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_DIR="$LOG_BASE_DIR/$TIMESTAMP"
mkdir -p "$LOG_DIR"

# 创建或更新latest链接
rm -f "$LOG_BASE_DIR/latest"
ln -s "$LOG_DIR" "$LOG_BASE_DIR/latest"

# 检查服务是否已在运行
check_service_running() {
    local service_name=$1
    local pattern=$2
    
    # 使用pgrep检查进程
    if pgrep -f "$pattern" > /dev/null; then
        echo -e "${YELLOW}⚠️  $service_name 已在运行，跳过启动${NC}"
        return 1
    fi
    return 0
}

echo -e "${YELLOW}🚀 开始启动所有服务...${NC}"
echo -e "${BLUE}📁 本次日志目录: $LOG_DIR${NC}"

# 启动服务函数
start_service() {
    local service_name=$1
    local command=$2
    local pattern=$3
    local log_file="$LOG_DIR/${service_name}.log"
    
    if ! check_service_running "$service_name" "$pattern"; then
        return
    fi
    
    echo -e "${BLUE}🔄 启动 $service_name...${NC}"
    eval "$command" >> "$log_file" 2>&1 &
    local pid=$!
    
    # 检查是否启动成功
    sleep 1
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✅ $service_name 启动成功! (PID: $pid)${NC}"
        echo "$pid:$service_name" >> "$LOG_DIR/pids.txt"
    else
        echo -e "${RED}❌ $service_name 启动失败! 查看日志: $log_file${NC}"
    fi
}

# 清空旧的PID文件
> "$LOG_DIR/pids.txt"

# 启动各服务（第三个参数是用于识别进程的匹配模式）
start_service "service服务" "cd $SCRIPT_DIR/service && pnpm start:dev" "pnpm start:dev"
start_service "Python后端" "cd $SCRIPT_DIR/models/embedding && python3 api.py" "python3 api.py"
start_service "views服务" "cd $SCRIPT_DIR/views && pnpm run dev" "pnpm run dev"

echo -e "\n${GREEN}🌈 服务启动完成!${NC}"
echo -e "\n👉 查看实时日志:"
echo -e "  service服务: tail -f $LOG_DIR/service服务.log"
echo -e "  Python后端: tail -f $LOG_DIR/Python后端.log"
echo -e "  views服务: tail -f $LOG_DIR/views服务.log"
echo -e "\n🛑 停止所有服务: bash ./stop.sh"

echo -e "\n快速进入：http://localhost:2493/"