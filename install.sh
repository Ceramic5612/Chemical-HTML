#!/bin/bash

# 化學品配方管理系統 - 一鍵安裝腳本
# 適用於 Ubuntu 20.04+ / Debian 11+

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日誌函式
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查是否為 root
if [ "$EUID" -ne 0 ]; then 
    log_error "請使用 sudo 執行此腳本"
    exit 1
fi

echo "============================================"
echo "🧪 化學品配方管理系統 - 安裝程式"
echo "============================================"
echo ""

# 詢問安裝目錄
read -p "安裝目錄 [/var/www/chemistry-app]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/var/www/chemistry-app}

# 詢問資料庫資訊
read -p "PostgreSQL 資料庫名稱 [chemistry_db]: " DB_NAME
DB_NAME=${DB_NAME:-chemistry_db}

read -p "PostgreSQL 使用者名稱 [chemistry_user]: " DB_USER
DB_USER=${DB_USER:-chemistry_user}

read -sp "PostgreSQL 密碼: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    log_error "資料庫密碼不能為空"
    exit 1
fi

# 詢問 Session 密鑰
read -p "Session 密鑰 (留空自動生成): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    log_info "已自動生成 Session 密鑰"
fi

# 詢問連接埠
read -p "應用程式連接埠 [3000]: " APP_PORT
APP_PORT=${APP_PORT:-3000}

# 更新系統
log_info "更新系統套件..."
apt-get update
apt-get upgrade -y

# 安裝必要套件
log_info "安裝必要套件..."
apt-get install -y curl wget git build-essential

# 安裝 Node.js 18.x
log_info "安裝 Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

log_info "Node.js 版本: $(node -v)"
log_info "npm 版本: $(npm -v)"

# 安裝 PostgreSQL
log_info "安裝 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

log_info "PostgreSQL 版本: $(psql --version)"

# 安裝 Nginx
log_info "安裝 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

log_info "Nginx 版本: $(nginx -v 2>&1)"

# 建立安裝目錄
log_info "建立安裝目錄: $INSTALL_DIR"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 下載或複製專案檔案
if [ -d "/tmp/chemistry-app" ]; then
    log_info "從本地複製檔案..."
    cp -r /tmp/chemistry-app/* $INSTALL_DIR/
else
    log_info "從 GitHub 下載專案..."
    git clone https://github.com/Ceramic5612/Chemical-HTML.git .
fi

# 安裝 Node.js 依賴
log_info "安裝 Node.js 依賴套件..."
npm install --production

# 建立上傳目錄
log_info "建立上傳目錄..."
mkdir -p $INSTALL_DIR/uploads/experiments

# 設定 PostgreSQL
log_info "設定 PostgreSQL 資料庫..."
sudo -u postgres psql <<EOF
-- 建立資料庫使用者
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- 建立資料庫
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

\q
EOF

# 建立 .env 檔案
log_info "建立環境變數檔案..."
cat > $INSTALL_DIR/.env <<EOF
# 資料庫設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# 伺服器設定
PORT=$APP_PORT
NODE_ENV=production

# Session 密鑰
SESSION_SECRET=$SESSION_SECRET

# 檔案上傳設定
UPLOAD_PATH=$INSTALL_DIR/uploads
MAX_FILE_SIZE_IMAGE=10485760
MAX_FILE_SIZE_DATA=52428800
MAX_FILES_PER_EXPERIMENT=20

# 安全設定
BCRYPT_ROUNDS=10
SESSION_TIMEOUT=1800000
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=600000
EOF

# 初始化資料庫
log_info "初始化資料庫架構..."
DB_HOST=localhost DB_PORT=5432 DB_NAME=$DB_NAME DB_USER=$DB_USER DB_PASSWORD=$DB_PASSWORD \
    node scripts/init-database.js

# 建立 systemd 服務
log_info "建立 systemd 服務..."
cat > /etc/systemd/system/chemistry-app.service <<EOF
[Unit]
Description=Chemistry Formula Management System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$INSTALL_DIR
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node $INSTALL_DIR/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 設定檔案權限
log_info "設定檔案權限..."
chown -R www-data:www-data $INSTALL_DIR
chmod -R 755 $INSTALL_DIR
chmod 600 $INSTALL_DIR/.env

# 設定 Nginx
log_info "設定 Nginx..."
cat > /etc/nginx/sites-available/chemistry-app <<EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        alias $INSTALL_DIR/uploads;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 啟用 Nginx 網站
ln -sf /etc/nginx/sites-available/chemistry-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 測試 Nginx 配置
log_info "測試 Nginx 配置..."
nginx -t

# 重新載入 Nginx
systemctl reload nginx

# 啟動服務
log_info "啟動應用程式服務..."
systemctl daemon-reload
systemctl start chemistry-app
systemctl enable chemistry-app

# 檢查服務狀態
sleep 3
if systemctl is-active --quiet chemistry-app; then
    log_info "✓ 服務啟動成功"
else
    log_error "✗ 服務啟動失敗"
    systemctl status chemistry-app
    exit 1
fi

# 設定防火牆 (如果安裝了 ufw)
if command -v ufw &> /dev/null; then
    log_info "設定防火牆..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
fi

# 完成訊息
echo ""
echo "============================================"
echo "✅ 安裝完成！"
echo "============================================"
echo ""
echo "系統資訊:"
echo "  安裝目錄: $INSTALL_DIR"
echo "  資料庫名稱: $DB_NAME"
echo "  應用程式連接埠: $APP_PORT"
echo ""
echo "訪問方式:"
echo "  網址: http://$(hostname -I | awk '{print $1}')"
echo "  或: http://localhost"
echo ""
echo "預設管理員帳號:"
echo "  使用者名稱: M1423013"
echo "  密碼: admin5612"
echo "  ⚠️  請在首次登入後立即變更密碼！"
echo ""
echo "服務管理指令:"
echo "  啟動: sudo systemctl start chemistry-app"
echo "  停止: sudo systemctl stop chemistry-app"
echo "  重啟: sudo systemctl restart chemistry-app"
echo "  狀態: sudo systemctl status chemistry-app"
echo "  日誌: sudo journalctl -u chemistry-app -f"
echo ""
echo "資料庫備份指令:"
echo "  sudo -u postgres pg_dump $DB_NAME > backup.sql"
echo ""
echo "============================================"
