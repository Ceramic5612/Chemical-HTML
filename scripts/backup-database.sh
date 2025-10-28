#!/bin/bash
# 資料庫備份腳本

BACKUP_DIR="/var/backups/chemistry-app/daily"
DB_NAME="chemistry_db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/chemistry_db_$TIMESTAMP.sql"

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 執行備份
sudo -u postgres pg_dump $DB_NAME > $BACKUP_FILE

# 壓縮備份檔案
gzip $BACKUP_FILE

# 刪除 30 天前的備份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "備份完成: $BACKUP_FILE.gz"
