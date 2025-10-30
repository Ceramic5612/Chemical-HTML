module.exports = {
  apps: [{
    name: 'chemistry-app',
    script: './server.js',
    
    // 叢集模式 - 使用所有 CPU 核心
    instances: 'max',
    exec_mode: 'cluster',
    
    // 環境變數
    env: {
      NODE_ENV: 'production'
    },
    
    // 日誌設定
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 自動重啟設定
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // 不監看檔案變更（生產環境）
    watch: false,
    
    // 優雅重啟
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // 進階設定
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100,
    
    // Cron 重啟（可選，每天凌晨 4 點重啟）
    // cron_restart: '0 4 * * *',
  }]
};
