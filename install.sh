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

# Proxy 設定（公司/校園環境）
read -p "是否在公司/校園 Proxy 環境 (y/N): " USE_PROXY
USE_PROXY=${USE_PROXY:-N}

PROXY_URL_ENV=${https_proxy:-${http_proxy}}
if [[ "$USE_PROXY" =~ ^[Yy]$ ]]; then
    read -p "代理伺服器 URL (例如 http://user:pass@proxy.example.com:3128) [${PROXY_URL_ENV}]: " PROXY_URL
    PROXY_URL=${PROXY_URL:-$PROXY_URL_ENV}
    read -p "NO_PROXY 例外名單 (逗號分隔，可留空，例如: localhost,127.0.0.1,::1): " NO_PROXY

    if [ -n "$PROXY_URL" ]; then
        log_info "設定 APT 代理: $PROXY_URL"
        cat > /etc/apt/apt.conf.d/01proxy <<EOF
Acquire::http::Proxy "$PROXY_URL";
Acquire::https::Proxy "$PROXY_URL";
EOF

        export http_proxy="$PROXY_URL"
        export https_proxy="$PROXY_URL"
        if [ -n "$NO_PROXY" ]; then
            export no_proxy="$NO_PROXY"
            export NO_PROXY="$NO_PROXY"
        fi

        # 選擇性：安裝公司自簽 CA 憑證以通過 HTTPS 檢查（若 Proxy 進行 TLS 檢查）
        read -p "是否安裝公司自簽 CA 憑證 (輸入憑證檔路徑 .crt/.pem，留空略過): " PROXY_CA_PATH
        if [ -n "$PROXY_CA_PATH" ] && [ -f "$PROXY_CA_PATH" ]; then
            log_info "安裝自簽 CA 憑證: $PROXY_CA_PATH"
            install -m 0644 "$PROXY_CA_PATH" /usr/local/share/ca-certificates/corp-proxy.crt
            update-ca-certificates || true
        fi
    else
        log_warn "未提供 Proxy URL，略過代理設定"
    fi
fi

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

# 詢問進程管理器
read -p "使用 PM2 進程管理器？(推薦) (Y/n): " USE_PM2
USE_PM2=${USE_PM2:-Y}

# APT 以 IPv4 強制連線，避免 IPv6 網路不可達
APT="apt-get -o Acquire::ForceIPv4=true"

# 更新系統（含 HTTPS 鏡像自動回退）
log_info "更新系統套件 (IPv4 模式)..."

# 暫時關閉嚴格錯誤以便嘗試回退
set +e
$APT update
APT_EXIT=$?
if [ $APT_EXIT -ne 0 ]; then
    log_warn "apt update 失敗，嘗試將來源改為 HTTPS 後重試..."
    # 將主要來源改為 HTTPS
    sed -i 's|http://archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g; s|http://security.ubuntu.com/ubuntu|https://security.ubuntu.com/ubuntu|g' /etc/apt/sources.list 2>/dev/null || true
    # 將其他來源（若有）一併改為 HTTPS
    if [ -d /etc/apt/sources.list.d ]; then
        find /etc/apt/sources.list.d -name '*.list' -print0 2>/dev/null | xargs -0 -r sed -i 's|http://|https://|g'
    fi
    $APT update
    APT_EXIT=$?
    if [ $APT_EXIT -ne 0 ]; then
        log_error "apt update 仍失敗，請檢查 Proxy/鏡像設定，或改走離線安裝。"
        exit 1
    fi
fi
set -e

$APT upgrade -y

# 安裝必要套件
log_info "安裝必要套件..."
$APT install -y curl wget git build-essential unzip

# 安裝 Node.js 18.x
log_info "安裝 Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -4 -fsSL https://deb.nodesource.com/setup_18.x | bash -
    $APT install -y nodejs
fi

log_info "Node.js 版本: $(node -v)"
log_info "npm 版本: $(npm -v)"

# 若設定了 Proxy，配置 npm 與 git 使用代理（僅影響目前系統）
if [ -n "$PROXY_URL" ]; then
    log_info "設定 npm 代理..."
    npm config set proxy "$PROXY_URL" || true
    npm config set https-proxy "$PROXY_URL" || true
    if [ -n "$NO_PROXY" ]; then
        npm config set noproxy "$NO_PROXY" || true
    fi

    log_info "設定 git 代理..."
    git config --global http.proxy "$PROXY_URL" || true
    git config --global https.proxy "$PROXY_URL" || true
fi

# 安裝 PostgreSQL
log_info "安裝 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    $APT install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

log_info "PostgreSQL 版本: $(psql --version)"

# 安裝 Nginx
log_info "安裝 Nginx..."
if ! command -v nginx &> /dev/null; then
    $APT install -y nginx
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
elif [ -f "/tmp/chemistry-app.zip" ]; then
    log_info "從本地壓縮檔解壓..."
    unzip -o /tmp/chemistry-app.zip -d /tmp/chemistry-app-unzip
    # 若 zip 內層有目錄，嘗試抓第一層目錄內容
    if [ -d "/tmp/chemistry-app-unzip/Chemical-HTML-main" ]; then
        cp -r /tmp/chemistry-app-unzip/Chemical-HTML-main/* $INSTALL_DIR/
    elif [ -d "/tmp/chemistry-app-unzip/chemistry-app" ]; then
        cp -r /tmp/chemistry-app-unzip/chemistry-app/* $INSTALL_DIR/
    else
        # 找第一個含 package.json 的子目錄
        FIRST_DIR=$(find /tmp/chemistry-app-unzip -mindepth 1 -maxdepth 1 -type d -exec test -f {}/package.json \; -print -quit)
        if [ -n "$FIRST_DIR" ]; then
            log_info "偵測到專案目錄: $FIRST_DIR"
            cp -r "$FIRST_DIR"/* $INSTALL_DIR/
        else
            cp -r /tmp/chemistry-app-unzip/* $INSTALL_DIR/
        fi
    fi
else
    log_info "從 GitHub 下載專案..."
    git clone https://github.com/Ceramic5612/Chemical-HTML.git . || {
        log_warn "GitHub 下載失敗，請改用本地來源：將專案上傳到 /tmp/chemistry-app 或 /tmp/chemistry-app.zip 後重跑本腳本"
        exit 1
    }
fi

# 驗證關鍵檔案是否存在
log_info "驗證專案檔案完整性..."
REQUIRED_FILES=(
    "package.json"
    "server.js"
    "database/schema.sql"
    "scripts/init-database.js"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$INSTALL_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    log_error "專案檔案不完整，缺少以下檔案:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    log_error "請確認:"
    log_error "  1. 若使用 git clone: 確認網路暢通且完整下載"
    log_error "  2. 若使用 zip: 確認壓縮檔完整且解壓後目錄結構正確"
    log_error "  3. 目前安裝目錄內容:"
    ls -la $INSTALL_DIR | head -20
    exit 1
fi

log_info "✓ 專案檔案完整"

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

# 設定檔案權限
log_info "設定檔案權限..."
chown -R www-data:www-data $INSTALL_DIR
chmod -R 755 $INSTALL_DIR
chmod 600 $INSTALL_DIR/.env

# 選擇進程管理器
if [[ "$USE_PM2" =~ ^[Yy]$ ]]; then
    log_info "安裝並設定 PM2..."
    
    # 全域安裝 PM2
    npm install -g pm2
    
    # 建立 PM2 設定檔
    cat > $INSTALL_DIR/ecosystem.config.js <<'PMEOF'
module.exports = {
  apps: [{
    name: 'chemistry-app',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false
  }]
};
PMEOF
    
    # 建立日誌目錄
    mkdir -p $INSTALL_DIR/logs
    chown -R www-data:www-data $INSTALL_DIR/logs
    
    # 以 www-data 使用者啟動 PM2
    log_info "啟動 PM2 應用程式..."
    sudo -u www-data bash -c "cd $INSTALL_DIR && pm2 start ecosystem.config.js"
    
    # 儲存 PM2 進程列表
    sudo -u www-data pm2 save
    
    # 設定 PM2 開機自動啟動
    env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www
    
    log_info "✓ PM2 設定完成"
    
    PM2_COMMANDS="PM2 管理指令:
  啟動: sudo -u www-data pm2 start chemistry-app
  停止: sudo -u www-data pm2 stop chemistry-app
  重啟: sudo -u www-data pm2 restart chemistry-app
  狀態: sudo -u www-data pm2 status
  日誌: sudo -u www-data pm2 logs chemistry-app
  監控: sudo -u www-data pm2 monit"
    
else
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
    
    PM2_COMMANDS="Systemd 管理指令:
  啟動: sudo systemctl start chemistry-app
  停止: sudo systemctl stop chemistry-app
  重啟: sudo systemctl restart chemistry-app
  狀態: sudo systemctl status chemistry-app
  日誌: sudo journalctl -u chemistry-app -f"
fi

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
echo "$PM2_COMMANDS"
echo ""
echo "資料庫備份指令:"
echo "  sudo -u postgres pg_dump $DB_NAME > backup.sql"
echo ""
echo "============================================"
