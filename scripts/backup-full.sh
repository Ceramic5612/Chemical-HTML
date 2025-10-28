#!/bin/bash
# 完整系統備份腳本

BACKUP_DIR="/var/backups/chemistry-app/weekly"
APP_DIR="/var/www/chemistry-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 備份資料庫
sudo -u postgres pg_dump chemistry_db | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# 備份應用程式 (排除 node_modules 和 uploads)
tar -czf $BACKUP_DIR/app_$TIMESTAMP.tar.gz \
  --exclude='node_modules' \
  --exclude='uploads' \
  $APP_DIR

# 備份上傳檔案
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz \
  $APP_DIR/uploads

# 刪除 90 天前的備份
find $BACKUP_DIR -name "*.gz" -mtime +90 -delete

echo "完整備份完成於 $BACKUP_DIR"
