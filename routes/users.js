const express = require('express');
const router = express.Router();
const { query, getOne } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// 取得使用者資訊
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await getOne(
            `SELECT id, username, role, email, full_name, created_at, last_login
             FROM users WHERE id = $1`,
            [req.session.userId]
        );

        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: '取得資料失敗' });
    }
});

module.exports = router;
