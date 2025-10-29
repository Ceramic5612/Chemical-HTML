# Docker 部署指南

## 快速開始

### 1. 設定環境變數

```bash
# 複製環境變數範本
cp .env.docker .env

# 編輯 .env 檔案，至少要修改：
# - DB_PASSWORD: 資料庫密碼
# - SESSION_SECRET: Session 密鑰（建議用 openssl rand -base64 32 生成）
nano .env
```

### 2. 啟動服務

```bash
# 啟動所有服務（PostgreSQL + App + Nginx）
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 3. 初始化資料庫

資料庫會在第一次啟動時自動建立 schema。若需要插入測試資料：

```bash
# 進入應用容器
docker-compose exec app sh

# 執行測試資料插入
node scripts/init-database.js --with-test-data

# 退出容器
exit
```

### 4. 訪問系統

- **應用程式**: http://localhost
- **直接訪問 Node 服務**: http://localhost:3000
- **健康檢查**: http://localhost/api/health

預設管理員帳號：
- 使用者名稱: `M1423013`
- 密碼: `admin5612`

**⚠️ 請在首次登入後立即變更密碼！**

## 管理指令

### 服務管理

```bash
# 啟動所有服務
docker-compose up -d

# 停止所有服務
docker-compose down

# 重啟服務
docker-compose restart

# 停止並刪除所有資料（包含 volumes）
docker-compose down -v

# 重新建立映像檔
docker-compose build --no-cache
```

### 日誌查看

```bash
# 所有服務日誌
docker-compose logs -f

# 特定服務日誌
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f nginx

# 查看最近 100 行
docker-compose logs --tail=100 app
```

### 資料備份

```bash
# 備份 PostgreSQL 資料庫
docker-compose exec postgres pg_dump -U chemistry_user chemistry_db > backup_$(date +%Y%m%d).sql

# 備份上傳檔案
docker run --rm -v chemistry_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data

# 備份完整資料（資料庫 + 上傳檔案）
./scripts/backup-full.sh
```

### 資料還原

```bash
# 還原資料庫
cat backup.sql | docker-compose exec -T postgres psql -U chemistry_user chemistry_db

# 還原上傳檔案
docker run --rm -v chemistry_uploads_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/uploads.tar.gz --strip 1"
```

## 環境變數說明

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `DB_NAME` | chemistry_db | 資料庫名稱 |
| `DB_USER` | chemistry_user | 資料庫使用者 |
| `DB_PASSWORD` | *必填* | 資料庫密碼 |
| `SESSION_SECRET` | *必填* | Session 加密密鑰 |
| `NODE_ENV` | production | 執行環境 |
| `PORT` | 3000 | 應用程式埠 |

## Volume 說明

- `postgres_data`: PostgreSQL 資料儲存
- `uploads_data`: 使用者上傳檔案
- `nginx_logs`: Nginx 存取與錯誤日誌

## 網路架構

```
[瀏覽器] 
    ↓ (port 80)
[Nginx 反向代理]
    ↓ (port 3000)
[Node.js App]
    ↓ (port 5432)
[PostgreSQL DB]
```

## 健康檢查

所有服務都設定了健康檢查：

- **PostgreSQL**: 檢查 `pg_isready`
- **App**: 檢查 `/api/health` 端點
- **Nginx**: 預設健康檢查

查看健康狀態：

```bash
docker-compose ps
```

## 生產環境建議

1. **修改預設密碼**
   - 資料庫密碼
   - Session 密鑰
   - 管理員帳號密碼

2. **啟用 HTTPS**
   - 修改 `config/nginx-docker.conf` 加入 SSL 設定
   - 使用 Let's Encrypt 取得憑證

3. **資源限制**
   - 在 `docker-compose.yml` 加入 memory/cpu limits

4. **定期備份**
   - 設定 cron job 自動備份資料庫與上傳檔案

5. **監控與日誌**
   - 整合 Prometheus/Grafana
   - 設定日誌輪替（log rotation）

## 疑難排解

### 應用程式無法連接資料庫

```bash
# 檢查 PostgreSQL 是否健康
docker-compose ps postgres

# 查看 PostgreSQL 日誌
docker-compose logs postgres

# 手動測試連線
docker-compose exec app sh
psql -h postgres -U chemistry_user -d chemistry_db
```

### 埠衝突

如果 80/3000/5432 埠被占用，修改 `docker-compose.yml` 中的 ports 對應：

```yaml
ports:
  - "8080:80"  # 改用 8080
```

### 重置所有資料

```bash
# 停止並刪除所有容器、網路、volumes
docker-compose down -v

# 重新啟動
docker-compose up -d
```

## 更新應用程式

```bash
# 拉取最新程式碼
git pull origin main

# 重建映像檔
docker-compose build --no-cache

# 重啟服務
docker-compose up -d

# 若有資料庫變更，執行遷移
docker-compose exec app node scripts/migrate.js
```
