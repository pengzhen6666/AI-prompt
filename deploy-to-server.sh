#!/bin/bash

# 部署配置
# Load configuration from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Check if required variables are set
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_PASSWORD" ] || [ -z "$SERVER_PATH" ]; then
    echo "Error: Missing deployment configuration in .env file"
    echo "Please ensure SERVER_IP, SERVER_USER, SERVER_PASSWORD, and SERVER_PATH are set."
    exit 1
fi

LOCAL_DIST="dist"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  开始部署到服务器${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 步骤 1: 检查 dist 目录是否存在
echo -e "${YELLOW}[1/5]${NC} 检查构建文件..."
if [ ! -d "$LOCAL_DIST" ]; then
    echo -e "${RED}❌ dist 目录不存在，开始构建...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 构建失败！${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 构建文件检查完成${NC}"
echo ""

# 步骤 2: 检查 sshpass 是否安装
echo -e "${YELLOW}[2/5]${NC} 检查依赖工具..."
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠ sshpass 未安装，正在安装...${NC}"
    if command -v brew &> /dev/null; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo -e "${RED}❌ 请先安装 Homebrew 或手动安装 sshpass${NC}"
        echo -e "${YELLOW}提示: 您也可以使用 SSH 密钥认证（更安全）${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 依赖工具检查完成${NC}"
echo ""

# 步骤 3: 在服务器上创建目录（如果不存在）
echo -e "${YELLOW}[3/5]${NC} 准备服务器目录..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "mkdir -p ${SERVER_PATH}/dist"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 无法连接到服务器${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 服务器目录准备完成${NC}"
echo ""

# 步骤 4: 上传文件
echo -e "${YELLOW}[4/5]${NC} 上传文件到服务器..."
sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
    -e "ssh -o StrictHostKeyChecking=no" \
    ${LOCAL_DIST}/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/dist/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 文件上传失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 文件上传完成${NC}"
echo ""

# 步骤 5: 设置权限并重启 Nginx
echo -e "${YELLOW}[5/5]${NC} 配置服务器..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /var/www/supabase-react
sudo chown -R nginx:nginx dist 2>/dev/null || sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
sudo systemctl restart nginx 2>/dev/null || sudo service nginx restart
echo "服务器配置完成"
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ 服务器配置可能需要手动完成${NC}"
else
    echo -e "${GREEN}✓ 服务器配置完成${NC}"
fi
echo ""

# 完成
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  ✓ 部署成功！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "访问地址: ${BLUE}http://${SERVER_IP}${NC}"
echo ""
