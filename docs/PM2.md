# PM2 進程管理指南

PM2 是 Node.js 的進階進程管理器，提供負載平衡、自動重啟、日誌管理等功能。

## 🚀 快速開始

### 安裝時選擇 PM2
```bash
sudo ./install.sh
# 當詢問「使用 PM2 進程管理器？」時，輸入 Y
```

### 手動安裝 PM2（已有系統）
```bash
# 全域安裝 PM2
sudo npm install -g pm2

# 進入專案目錄
cd /var/www/chemistry-app

# 以 www-data 使用者啟動
sudo -u www-data pm2 start ecosystem.config.js

# 儲存 PM2 進程列表
sudo -u www-data pm2 save

# 設定開機自動啟動
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www
```

## 📋 常用指令

### 基本管理
```bash
# 啟動應用程式
sudo -u www-data pm2 start chemistry-app
# 或使用設定檔
sudo -u www-data pm2 start ecosystem.config.js

# 停止應用程式
sudo -u www-data pm2 stop chemistry-app

# 重啟應用程式
sudo -u www-data pm2 restart chemistry-app

# 優雅重載（零停機，叢集模式）
sudo -u www-data pm2 reload chemistry-app

# 刪除應用程式
sudo -u www-data pm2 delete chemistry-app

# 查看所有進程
sudo -u www-data pm2 list
sudo -u www-data pm2 status
```

### 日誌管理
```bash
# 即時查看日誌
sudo -u www-data pm2 logs chemistry-app

# 查看最近 100 行
sudo -u www-data pm2 logs chemistry-app --lines 100

# 清除所有日誌
sudo -u www-data pm2 flush

# 清除特定應用日誌
sudo -u www-data pm2 flush chemistry-app
```

### 監控與除錯
```bash
# 即時監控面板
sudo -u www-data pm2 monit

# 查看詳細資訊
sudo -u www-data pm2 show chemistry-app

# 查看資源使用情況
sudo -u www-data pm2 describe chemistry-app
```

### 進階操作
```bash
# 擴展到 4 個實例
sudo -u www-data pm2 scale chemistry-app 4

# 重設重啟次數
sudo -u www-data pm2 reset chemistry-app

# 儲存當前進程列表
sudo -u www-data pm2 save

# 復原已儲存的進程
sudo -u www-data pm2 resurrect

# 更新 PM2
sudo npm install -g pm2
sudo -u www-data pm2 update
```

## 🔧 配置檔說明

`ecosystem.config.js` 主要設定：

```javascript
{
  name: 'chemistry-app',           // 應用程式名稱
  script: './server.js',            // 啟動腳本
  instances: 'max',                 // 實例數量（max = CPU 核心數）
  exec_mode: 'cluster',             // 叢集模式（負載平衡）
  max_memory_restart: '500M',       // 記憶體超過 500MB 自動重啟
  autorestart: true,                // 崩潰時自動重啟
  max_restarts: 10,                 // 最大重啟次數
  min_uptime: '10s',                // 最小運行時間
  watch: false,                     // 不監看檔案變更
}
```

### 自訂配置
```bash
# 編輯配置檔
sudo nano /var/www/chemistry-app/ecosystem.config.js

# 重新載入配置
sudo -u www-data pm2 reload ecosystem.config.js
```

## 📊 PM2 優勢

### vs Systemd

| 功能 | PM2 | Systemd |
|------|-----|---------|
| 叢集模式 | ✅ 內建負載平衡 | ❌ 單進程 |
| 零停機重啟 | ✅ 支援 | ❌ 會中斷 |
| 記憶體監控 | ✅ 自動重啟 | ❌ 需手動 |
| 即時監控 | ✅ pm2 monit | ❌ 需額外工具 |
| 日誌輪替 | ✅ 內建 | ✅ journald |
| 設定簡易度 | ✅ JS 配置 | ⚠️ systemd 語法 |

## 🔄 從 Systemd 遷移到 PM2

```bash
# 1. 停止並停用 systemd 服務
sudo systemctl stop chemistry-app
sudo systemctl disable chemistry-app

# 2. 安裝 PM2
sudo npm install -g pm2

# 3. 啟動 PM2
cd /var/www/chemistry-app
sudo -u www-data pm2 start ecosystem.config.js

# 4. 儲存並設定自動啟動
sudo -u www-data pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www

# 5. 驗證
sudo -u www-data pm2 status
```

## 🐛 疑難排解

### PM2 無法啟動
```bash
# 檢查 Node.js 路徑
which node

# 手動指定 Node 路徑
sudo -u www-data pm2 start ecosystem.config.js --interpreter=/usr/bin/node

# 查看錯誤日誌
sudo -u www-data pm2 logs chemistry-app --err
```

### 開機後未自動啟動
```bash
# 重新設定 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www

# 儲存進程列表
sudo -u www-data pm2 save

# 測試重啟
sudo reboot
# 重開後檢查
sudo -u www-data pm2 status
```

### 記憶體洩漏
```bash
# 查看記憶體使用
sudo -u www-data pm2 monit

# 降低 max_memory_restart 閾值
# 編輯 ecosystem.config.js，設為 300M
sudo -u www-data pm2 reload ecosystem.config.js
```

### 日誌檔過大
```bash
# 安裝 PM2 日誌輪替模組
sudo pm2 install pm2-logrotate

# 設定日誌大小上限（10MB）
sudo pm2 set pm2-logrotate:max_size 10M

# 設定保留天數
sudo pm2 set pm2-logrotate:retain 7
```

## 📈 生產環境建議

1. **使用叢集模式**
   - 充分利用多核 CPU
   - 自動負載平衡
   - 零停機重啟

2. **設定記憶體限制**
   - 避免記憶體洩漏導致系統不穩定
   - 建議設為 500M-1G

3. **啟用日誌輪替**
   - 避免日誌檔無限增長
   - 定期清理舊日誌

4. **監控與告警**
   - 整合 PM2 Plus（付費服務）
   - 或使用 Prometheus + Grafana

5. **定期重啟（可選）**
   - 使用 cron_restart 設定每日重啟
   - 避免長期運行累積問題

## 📚 更多資源

- [PM2 官方文件](https://pm2.keymetrics.io/)
- [PM2 進階功能](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Plus 監控平台](https://pm2.io/)

## 💡 快速指令備忘

```bash
# 常用快捷指令（設為 www-data 使用者）
alias pm2="sudo -u www-data pm2"

# 然後可以直接使用
pm2 status
pm2 logs chemistry-app
pm2 restart chemistry-app
pm2 monit
```
