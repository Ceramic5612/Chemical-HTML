# 化學品配方管理系統 - 安裝指南

## 📋 系統需求

### 硬體需求
- **CPU**: 2 核心以上
- **記憶體**: 2GB RAM 以上
- **儲存空間**: 20GB 以上 (建議 SSD)

### 軟體需求
- **作業系統**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Node.js**: 16.x 或更高版本
- **PostgreSQL**: 13.x 或更高版本
- **Nginx**: 1.18.x 或更高版本

## 🚀 快速安裝 (推薦)

### 方法一: 一鍵安裝腳本 (Ubuntu/Debian)

```bash
# 下載安裝腳本
wget https://raw.githubusercontent.com/Ceramic5612/Chemical-HTML/main/install.sh

# 賦予執行權限
chmod +x install.sh

# 執行安裝 (需要 sudo 權限)
sudo ./install.sh
```

安裝腳本會自動完成以下操作:
1. 安裝所有必要的系統套件
2. 安裝並設定 PostgreSQL 資料庫
3. 安裝並設定 Nginx 網頁伺服器
4. 建立資料庫架構
5. 設定 systemd 服務
6. 設定防火牆規則

### 方法二: Docker 容器化部署 (即將推出)

```bash
# 使用 Docker Compose
docker-compose up -d
```

## 📝 手動安裝

### 步驟 1: 安裝系統套件

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y curl wget git build-essential
```

#### CentOS/RHEL
```bash
sudo yum install -y curl wget git gcc-c++ make
```

### 步驟 2: 安裝 Node.js

```bash
# 安裝 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
node -v
npm -v
```

### 步驟 3: 安裝 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get install -y postgresql postgresql-contrib

# 啟動服務
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 驗證安裝
psql --version
```

### 步驟 4: 安裝 Nginx

```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# 啟動服務
sudo systemctl start nginx
sudo systemctl enable nginx

# 驗證安裝
nginx -v
```

### 步驟 5: 下載專案

```bash
# 建立安裝目錄
sudo mkdir -p /var/www/chemistry-app
cd /var/www/chemistry-app

# 從 GitHub 下載
sudo git clone https://github.com/Ceramic5612/Chemical-HTML.git .

# 或使用 wget 下載壓縮檔
sudo wget https://github.com/Ceramic5612/Chemical-HTML/archive/main.zip
sudo unzip main.zip
sudo mv Chemical-HTML-main/* .
```

### 步驟 6: 安裝專案依賴

```bash
# 安裝 Node.js 套件
sudo npm install --production
```

### 步驟 7: 設定 PostgreSQL 資料庫

```bash
# 切換到 postgres 使用者
sudo -u postgres psql

# 在 psql 提示符中執行
CREATE USER chemistry_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE chemistry_db OWNER chemistry_user;
GRANT ALL PRIVILEGES ON DATABASE chemistry_db TO chemistry_user;
\q
```

### 步驟 8: 建立環境變數檔案

```bash
# 複製範例檔案
sudo cp .env.example .env

# 編輯設定
sudo nano .env
```

修改以下內容:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chemistry_db
DB_USER=chemistry_user
DB_PASSWORD=your_secure_password  # 請更改為您的密碼

PORT=3000
NODE_ENV=production

SESSION_SECRET=your_random_secret_key  # 請更改為隨機字串

UPLOAD_PATH=/var/www/chemistry-app/uploads
```

### 步驟 9: 初始化資料庫

```bash
# 執行資料庫初始化腳本
sudo NODE_ENV=production node scripts/init-database.js
```

### 步驟 10: 設定 Nginx

```bash
# 複製 Nginx 配置檔案
sudo cp config/nginx.conf /etc/nginx/sites-available/chemistry-app

# 編輯配置 (修改 server_name)
sudo nano /etc/nginx/sites-available/chemistry-app

# 建立符號連結
sudo ln -s /etc/nginx/sites-available/chemistry-app /etc/nginx/sites-enabled/

# 刪除預設網站
sudo rm -f /etc/nginx/sites-enabled/default

# 測試配置
sudo nginx -t

# 重新載入 Nginx
sudo systemctl reload nginx
```

### 步驟 11: 建立 systemd 服務

```bash
# 建立服務檔案
sudo nano /etc/systemd/system/chemistry-app.service
```

內容:
```ini
[Unit]
Description=Chemistry Formula Management System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/chemistry-app
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /var/www/chemistry-app/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 步驟 12: 設定檔案權限

```bash
# 設定擁有者
sudo chown -R www-data:www-data /var/www/chemistry-app

# 設定權限
sudo chmod -R 755 /var/www/chemistry-app
sudo chmod 600 /var/www/chemistry-app/.env

# 建立上傳目錄
sudo mkdir -p /var/www/chemistry-app/uploads/experiments
sudo chown -R www-data:www-data /var/www/chemistry-app/uploads
```

### 步驟 13: 啟動服務

```bash
# 重新載入 systemd
sudo systemctl daemon-reload

# 啟動服務
sudo systemctl start chemistry-app

# 設定開機自動啟動
sudo systemctl enable chemistry-app

# 檢查服務狀態
sudo systemctl status chemistry-app
```

### 步驟 14: 設定防火牆 (可選)

```bash
# 使用 ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## ✅ 驗證安裝

1. 開啟瀏覽器訪問: `http://your-server-ip`
2. 使用預設管理員帳號登入:
   - 使用者名稱: `M1423013`
   - 密碼: `admin5612`
3. **立即變更密碼！**

## 🔧 常用管理指令

### 服務管理
```bash
# 啟動服務
sudo systemctl start chemistry-app

# 停止服務
sudo systemctl stop chemistry-app

# 重啟服務
sudo systemctl restart chemistry-app

# 檢查狀態
sudo systemctl status chemistry-app

# 查看日誌
sudo journalctl -u chemistry-app -f
```

### 資料庫管理
```bash
# 備份資料庫
sudo -u postgres pg_dump chemistry_db > backup_$(date +%Y%m%d).sql

# 還原資料庫
sudo -u postgres psql chemistry_db < backup.sql
```

### Nginx 管理
```bash
# 測試配置
sudo nginx -t

# 重新載入配置
sudo systemctl reload nginx

# 檢視錯誤日誌
sudo tail -f /var/log/nginx/chemistry-app-error.log
```

## 🔒 設定 HTTPS (Let's Encrypt)

```bash
# 安裝 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 取得憑證
sudo certbot --nginx -d your-domain.com

# 自動更新憑證
sudo certbot renew --dry-run
```

## 🐛 疑難排解

### 服務無法啟動
```bash
# 檢查詳細日誌
sudo journalctl -u chemistry-app -n 50

# 檢查連接埠是否被占用
sudo netstat -tulpn | grep 3000

# 檢查資料庫連線
sudo -u postgres psql -d chemistry_db -c "SELECT version();"
```

### 無法連接資料庫
1. 檢查 `.env` 檔案中的資料庫設定
2. 確認 PostgreSQL 服務運行中
3. 測試資料庫連線

### 檔案上傳失敗
1. 檢查 `uploads` 目錄權限
2. 檢查 Nginx `client_max_body_size` 設定
3. 檢查磁碟空間

## 📞 技術支援

如遇到問題,請在 GitHub 建立 Issue:
https://github.com/Ceramic5612/Chemical-HTML/issues
