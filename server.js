const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
require('dotenv').config();

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 中介軟體設定
// ============================================

// 安全性標頭
app.use(helmet({
    contentSecurityPolicy: false, // 允許內聯樣式和腳本
}));

// CORS 設定
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// 請求速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分鐘
    max: 100, // 限制 100 個請求
    message: '請求過於頻繁，請稍後再試'
});
app.use('/api/', limiter);

// 登入速率限制
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: '登入嘗試次數過多，請 15 分鐘後再試'
});

// Body 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session 設定
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 1800000, // 30 分鐘
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax'
    }
}));

// 靜態檔案服務
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 確保上傳目錄存在
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// 路由設定
// ============================================

// 健康檢查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 在生產環境開啟 CSRF 防護，提供 token 取得端點
let csrfProtection = (req, res, next) => next();
if ((process.env.NODE_ENV || 'development') === 'production') {
    csrfProtection = csrf({ cookie: true });
    app.use('/api', csrfProtection);
    app.get('/api/csrf-token', (req, res) => {
        res.json({ csrfToken: req.csrfToken() });
    });
}

// API 路由
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/formulas', require('./routes/formulas'));
app.use('/api/experiments', require('./routes/experiments'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/admin', require('./routes/admin'));

// 前端路由 (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// 錯誤處理
// ============================================

// 404 處理
app.use((req, res) => {
    res.status(404).json({ error: '請求的資源不存在' });
});

// 全域錯誤處理
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // 不洩漏詳細錯誤訊息到客戶端
    const message = process.env.NODE_ENV === 'production' 
        ? '伺服器錯誤，請稍後再試' 
        : err.message;
    
    res.status(err.status || 500).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ============================================
// 啟動伺服器
// ============================================

app.listen(PORT, () => {
    console.log(`
    ============================================
    🧪 化學品配方管理系統
    ============================================
    伺服器運行於: http://localhost:${PORT}
    環境: ${process.env.NODE_ENV || 'development'}
    ============================================
    `);
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信號，正在關閉伺服器...');
    pool.end(() => {
        console.log('資料庫連線池已關閉');
        process.exit(0);
    });
});

module.exports = app;
