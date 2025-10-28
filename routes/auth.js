const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, getOne } = require('../config/database');

// 登入驗證規則
const loginValidation = [
    body('username').trim().notEmpty().withMessage('使用者名稱不能為空'),
    body('password').notEmpty().withMessage('密碼不能為空')
];

// ============================================
// 登入
// ============================================
router.post('/login', loginValidation, async (req, res) => {
    try {
        // 驗證輸入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        // 查詢使用者
        const user = await getOne(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (!user) {
            return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
        }

        // 檢查帳號是否啟用
        if (!user.is_active) {
            return res.status(403).json({ error: '帳號已被停用' });
        }

        // 檢查是否被鎖定
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
            return res.status(423).json({ 
                error: `帳號已被鎖定，請 ${remainingTime} 分鐘後再試` 
            });
        }

        // 驗證密碼
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            // 增加失敗次數
            const failedAttempts = user.failed_login_attempts + 1;
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

            if (failedAttempts >= maxAttempts) {
                // 鎖定帳號
                const lockTime = parseInt(process.env.LOCK_TIME) || 600000; // 10 分鐘
                const lockedUntil = new Date(Date.now() + lockTime);
                
                await query(
                    `UPDATE users 
                     SET failed_login_attempts = $1, locked_until = $2 
                     WHERE id = $3`,
                    [failedAttempts, lockedUntil, user.id]
                );

                return res.status(423).json({ 
                    error: `登入失敗次數過多，帳號已被鎖定 ${lockTime / 60000} 分鐘` 
                });
            } else {
                await query(
                    'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
                    [failedAttempts, user.id]
                );

                return res.status(401).json({ 
                    error: `使用者名稱或密碼錯誤 (剩餘 ${maxAttempts - failedAttempts} 次嘗試)` 
                });
            }
        }

        // 登入成功，重置失敗次數
        await query(
            `UPDATE users 
             SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [user.id]
        );

        // 記錄登入日誌
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
             VALUES ($1, 'login', 'user', $2, $3)`,
            [user.id, user.id, ip]
        );

        // 設定 session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        res.json({
            message: '登入成功',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.full_name,
                email: user.email,
                mustChangePassword: !!user.must_change_password
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '登入失敗，請稍後再試' });
    }
});

// ============================================
// 登出
// ============================================
router.post('/logout', (req, res) => {
    if (req.session.userId) {
        const userId = req.session.userId;
        const ip = req.ip || req.connection.remoteAddress;

        // 記錄登出日誌
        query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
             VALUES ($1, 'logout', 'user', $2, $3)`,
            [userId, userId, ip]
        ).catch(err => console.error('Logout log error:', err));

        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: '登出失敗' });
            }
            res.json({ message: '登出成功' });
        });
    } else {
        res.json({ message: '未登入' });
    }
});

// ============================================
// 檢查登入狀態
// ============================================
router.get('/status', (req, res) => {
    if (req.session.userId) {
        res.json({
            loggedIn: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                role: req.session.role
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// ============================================
// 變更密碼
// ============================================
router.post('/change-password', 
    [
        body('oldPassword').notEmpty().withMessage('請輸入舊密碼'),
        body('newPassword')
            .isLength({ min: 8 }).withMessage('密碼至少需要 8 個字元')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('密碼需包含英文字母和數字')
    ],
    async (req, res) => {
        try {
            // 檢查登入狀態
            if (!req.session.userId) {
                return res.status(401).json({ error: '請先登入' });
            }

            // 驗證輸入
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { oldPassword, newPassword } = req.body;

            // 查詢使用者
            const user = await getOne(
                'SELECT * FROM users WHERE id = $1',
                [req.session.userId]
            );

            // 驗證舊密碼
            const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: '舊密碼錯誤' });
            }

            // 雜湊新密碼
            const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
            const newPasswordHash = await bcrypt.hash(newPassword, rounds);

            // 更新密碼並取消強制變更旗標
            await query(
                'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
                [newPasswordHash, req.session.userId]
            );

            // 記錄操作
            const ip = req.ip || req.connection.remoteAddress;
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
                 VALUES ($1, 'update', 'user', $2, $3)`,
                [req.session.userId, req.session.userId, ip]
            );

            res.json({ message: '密碼變更成功' });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: '密碼變更失敗' });
        }
    }
);

module.exports = router;
