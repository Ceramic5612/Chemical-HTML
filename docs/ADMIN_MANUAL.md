# 化學品配方管理系統 - 管理員手冊

## 📖 目錄
1. [管理員職責](#管理員職責)
2. [使用者管理](#使用者管理)
3. [系統監控](#系統監控)
4. [資料備份與還原](#資料備份與還原)
5. [已刪除項目管理](#已刪除項目管理)
6. [安全性管理](#安全性管理)
7. [系統維護](#系統維護)

---

## 👨‍💼 管理員職責

### 主要職責
- 建立和管理使用者帳號
- 監控系統使用狀況
- 維護系統安全性
- 定期備份資料
- 管理已刪除的項目
- 處理使用者問題和請求

### 管理員權限
管理員擁有以下特殊權限:
- ✅ 建立/刪除使用者帳號
- ✅ 編輯所有使用者的配方
- ✅ 刪除任何配方或實驗記錄
- ✅ 檢視所有配方 (包含私人配方)
- ✅ 恢復已刪除的項目
- ✅ 檢視系統統計和日誌
- ✅ 停用/啟用使用者帳號

---

## 👥 使用者管理

### 建立新使用者

#### 步驟
1. 登入管理員帳號
2. 點擊「管理」→「使用者管理」
3. 點擊「建立新使用者」按鈕
4. 填寫使用者資訊:
   - **使用者名稱**: 唯一識別碼 (3-50 字元)
   - **密碼**: 初始密碼 (至少 8 字元,含英文和數字)
   - **角色**: 
     - `student`: 一般使用者
     - `admin`: 管理員
   - **Email**: 使用者 Email (可選)
   - **全名**: 使用者真實姓名 (可選)
5. 點擊「建立」

#### 密碼要求
- 最少 8 個字元
- 必須包含英文字母
- 必須包含數字
- 範例: `Student123`

#### 建議做法
- 為新使用者設定臨時密碼
- 通知使用者首次登入後變更密碼
- 使用學號或工號作為使用者名稱

### 檢視使用者列表
1. 點擊「管理」→「使用者管理」
2. 查看所有使用者資訊:
   - 使用者名稱
   - 角色
   - Email
   - 帳號狀態
   - 最後登入時間
   - 建立日期

### 編輯使用者資訊
1. 在使用者列表中找到目標使用者
2. 點擊「編輯」按鈕
3. 可修改:
   - Email
   - 全名
   - 角色 (謹慎修改)
4. 點擊「儲存」

### 重設使用者密碼
1. 找到目標使用者
2. 點擊「重設密碼」
3. 輸入新密碼
4. 點擊「確認」
5. 通知使用者新密碼

### 停用/啟用使用者
1. 找到目標使用者
2. 點擊「停用」或「啟用」按鈕
3. 確認操作

**效果**:
- **停用**: 使用者無法登入,現有 session 會被清除
- **啟用**: 恢復使用者的登入權限

### 刪除使用者 (謹慎使用)
⚠️ **警告**: 刪除使用者會影響相關配方和實驗記錄

1. 找到目標使用者
2. 點擊「刪除」
3. 系統會顯示警告訊息
4. 確認刪除操作

**建議**: 通常使用「停用」而非刪除

---

## 📊 系統監控

### 檢視系統統計
1. 點擊「管理」→「儀表板」
2. 查看統計資訊:
   - **活躍使用者數**
   - **配方總數**
   - **實驗記錄總數**
   - **公開配方數**
   - **儲存空間使用量**
   - **最近登入記錄**

### 檢視操作日誌
1. 點擊「管理」→「操作日誌」
2. 可查看:
   - 使用者登入/登出記錄
   - 配方建立/編輯/刪除記錄
   - 實驗記錄操作
   - 檔案上傳記錄
   - 系統錯誤記錄

### 篩選日誌
- **依使用者**: 查看特定使用者的操作
- **依操作類型**: login, create, update, delete
- **依日期範圍**: 指定時間範圍
- **依實體類型**: user, formula, experiment

### 匯出日誌
1. 設定篩選條件
2. 點擊「匯出」
3. 選擇格式 (CSV/Excel)
4. 下載檔案

---

## 💾 資料備份與還原

### 自動備份設定

#### 資料庫每日備份
已在系統中設定自動備份任務:

```bash
# 編輯 crontab
sudo crontab -e

# 新增每日凌晨 2 點備份
0 2 * * * /var/www/chemistry-app/scripts/backup-database.sh
```

備份檔案位置: `/var/backups/chemistry-app/daily/`

#### 完整系統每週備份
```bash
# 每週日凌晨 3 點完整備份
0 3 * * 0 /var/www/chemistry-app/scripts/backup-full.sh
```

備份檔案位置: `/var/backups/chemistry-app/weekly/`

### 手動備份

#### 備份資料庫
```bash
# 切換到 postgres 使用者
sudo -u postgres pg_dump chemistry_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 壓縮備份檔案
gzip backup_*.sql
```

#### 備份上傳檔案
```bash
# 備份 uploads 目錄
sudo tar -czf uploads_backup_$(date +%Y%m%d).tar.gz \
  /var/www/chemistry-app/uploads
```

#### 完整系統備份
```bash
# 備份整個應用程式目錄
sudo tar -czf chemistry_app_full_$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='uploads' \
  /var/www/chemistry-app

# 單獨備份 uploads
sudo tar -czf chemistry_app_uploads_$(date +%Y%m%d).tar.gz \
  /var/www/chemistry-app/uploads
```

### 資料還原

#### 還原資料庫
```bash
# 停止應用程式
sudo systemctl stop chemistry-app

# 還原資料庫
sudo -u postgres psql chemistry_db < backup.sql

# 啟動應用程式
sudo systemctl start chemistry-app
```

#### 還原上傳檔案
```bash
# 解壓縮備份檔案
sudo tar -xzf uploads_backup.tar.gz -C /

# 設定權限
sudo chown -R www-data:www-data /var/www/chemistry-app/uploads
```

### 備份保留策略
建議的備份保留策略:
- **每日備份**: 保留 30 天
- **每週備份**: 保留 12 週
- **每月備份**: 保留 12 個月

#### 自動清理舊備份
```bash
# 刪除 30 天前的每日備份
find /var/backups/chemistry-app/daily/ -name "*.sql.gz" -mtime +30 -delete

# 刪除 90 天前的每週備份
find /var/backups/chemistry-app/weekly/ -name "*.tar.gz" -mtime +90 -delete
```

---

## 🗑️ 已刪除項目管理

### 軟刪除機制
系統採用軟刪除機制:
- 刪除的項目不會立即從資料庫移除
- 僅標記為 `is_deleted = true`
- 記錄刪除時間 `deleted_at`
- 保留完整歷史資料

### 檢視已刪除項目
1. 點擊「管理」→「已刪除項目」
2. 可查看:
   - 已刪除的配方
   - 已刪除的實驗記錄
   - 已刪除的附件

### 恢復已刪除項目
1. 在已刪除項目列表中找到目標項目
2. 點擊「恢復」按鈕
3. 確認恢復操作
4. 項目會恢復到原本的狀態

### 永久刪除項目
⚠️ **警告**: 此操作無法復原

1. 在已刪除項目列表中
2. 點擊「永久刪除」按鈕
3. 系統會顯示警告訊息
4. 輸入確認文字
5. 確認刪除

**建議**:
- 定期檢視已刪除項目
- 保留至少 3 個月
- 永久刪除前先備份

---

## 🔒 安全性管理

### 密碼安全

#### 密碼政策
系統已實施以下密碼政策:
- 最少 8 個字元
- 必須包含英文字母和數字
- 使用 bcrypt 雜湊 (10 rounds)
- 登入失敗 5 次鎖定 10 分鐘

#### 強制密碼變更
如需要求使用者變更密碼:
1. 找到目標使用者
2. 點擊「重設密碼」
3. 設定臨時密碼
4. 通知使用者變更密碼

### 帳號鎖定管理

#### 檢視被鎖定的帳號
```sql
-- 在資料庫中查詢
SELECT username, locked_until, failed_login_attempts
FROM users
WHERE locked_until > NOW();
```

#### 解除帳號鎖定
1. 找到被鎖定的使用者
2. 點擊「解除鎖定」
3. 重設失敗登入次數

或使用 SQL:
```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE username = 'target_username';
```

### Session 管理

#### Session 設定
在 `.env` 檔案中:
```env
SESSION_TIMEOUT=1800000  # 30 分鐘 (毫秒)
SESSION_SECRET=your_random_secret_key
```

#### 清除所有 Session
```sql
-- 清空 session 表
TRUNCATE TABLE session;
```

### 檔案上傳安全

#### 檔案類型限制
系統只允許以下類型:
- 圖片: JPG, PNG, GIF, WEBP
- 數據: CSV, XLSX, TXT
- 文件: PDF

#### 檔案大小限制
- 圖片: 10 MB
- 數據檔案: 50 MB
- 每次實驗: 最多 20 個檔案

#### 檢查可疑檔案
```bash
# 搜尋可疑的可執行檔案
sudo find /var/www/chemistry-app/uploads -type f \
  \( -name "*.php" -o -name "*.sh" -o -name "*.exe" \)
```

### IP 存取控制 (選配)

#### 限制特定 IP
在 Nginx 配置中:
```nginx
# 允許特定 IP
allow 192.168.1.0/24;
allow 10.0.0.0/8;

# 拒絕其他 IP
deny all;
```

---

## 🔧 系統維護

### 定期維護任務

#### 每日
- ✅ 檢查系統狀態
- ✅ 查看錯誤日誌
- ✅ 監控磁碟空間

#### 每週
- ✅ 檢視系統統計
- ✅ 檢查備份檔案
- ✅ 檢視操作日誌

#### 每月
- ✅ 資料庫效能優化
- ✅ 清理舊日誌檔案
- ✅ 更新系統套件
- ✅ 檢視已刪除項目

### 檢查系統狀態
```bash
# 檢查服務狀態
sudo systemctl status chemistry-app
sudo systemctl status postgresql
sudo systemctl status nginx

# 檢查連接埠
sudo netstat -tulpn | grep -E '(3000|5432|80)'

# 檢查磁碟空間
df -h

# 檢查記憶體使用
free -h
```

### 檢視日誌
```bash
# 應用程式日誌
sudo journalctl -u chemistry-app -n 100 -f

# Nginx 訪問日誌
sudo tail -f /var/log/nginx/chemistry-app-access.log

# Nginx 錯誤日誌
sudo tail -f /var/log/nginx/chemistry-app-error.log

# PostgreSQL 日誌
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

### 資料庫維護

#### 清理資料庫
```sql
-- 清理操作日誌 (保留 90 天)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- 清理過期的 session
DELETE FROM session WHERE expire < NOW();

-- 分析資料表
ANALYZE;

-- 清理垃圾資料
VACUUM;
```

#### 重建索引
```sql
-- 重建所有索引
REINDEX DATABASE chemistry_db;
```

### 效能優化

#### 監控慢查詢
```sql
-- 啟用慢查詢日誌
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 秒
SELECT pg_reload_conf();
```

#### 檢視資料庫大小
```sql
SELECT pg_size_pretty(pg_database_size('chemistry_db'));
```

#### 檢視表格大小
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 更新系統

#### 更新應用程式
```bash
cd /var/www/chemistry-app

# 拉取最新代碼
sudo git pull origin main

# 安裝依賴
sudo npm install --production

# 重啟服務
sudo systemctl restart chemistry-app
```

#### 更新系統套件
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get upgrade -y

# 重啟相關服務
sudo systemctl restart postgresql
sudo systemctl restart nginx
```

---

## 🚨 緊急情況處理

### 系統無法訪問
1. 檢查服務狀態
2. 檢查日誌檔案
3. 檢查防火牆設定
4. 檢查 Nginx 配置
5. 重啟相關服務

### 資料庫損壞
1. 停止應用程式
2. 備份當前資料庫
3. 從最近的備份還原
4. 檢查資料完整性
5. 重啟應用程式

### 磁碟空間不足
1. 檢查磁碟使用情況
2. 清理舊日誌
3. 清理舊備份
4. 壓縮上傳檔案
5. 考慮擴充儲存空間

---

## 📞 技術支援

### 聯絡資訊
- GitHub Issues: https://github.com/Ceramic5612/Chemical-HTML/issues
- 系統文件: `/docs`

### 報告問題時請提供
- 系統版本
- 錯誤訊息
- 日誌檔案
- 重現步驟
