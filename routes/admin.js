const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, getOne, getMany } = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ============================================
// 取得所有使用者 (僅管理員)
// ============================================
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await getMany(
            `SELECT id, username, role, email, full_name, is_active, created_at, last_login
             FROM users
             ORDER BY created_at DESC`
        );
        
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: '取得使用者列表失敗' });
    }
});

// ============================================
// 建立使用者 (僅管理員)
// ============================================
router.post('/users',
    requireAdmin,
    [
        body('username').trim().isLength({ min: 3, max: 50 }).withMessage('使用者名稱長度需在 3-50 字元'),
        body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('密碼需至少 8 字元且包含英文和數字'),
        body('role').isIn(['admin', 'student']).withMessage('角色必須是 admin 或 student'),
        body('email').optional().isEmail().withMessage('Email 格式錯誤')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { username, password, role, email, fullName } = req.body;

            // 檢查使用者名稱是否已存在
            const existingUser = await getOne(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );

            if (existingUser) {
                return res.status(409).json({ error: '使用者名稱已存在' });
            }

            // 雜湊密碼
            const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
            const passwordHash = await bcrypt.hash(password, rounds);

            // 建立使用者
            const result = await query(
                `INSERT INTO users (username, password_hash, role, email, full_name)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [username, passwordHash, role, email || null, fullName || null]
            );

            // 記錄操作
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
                 VALUES ($1, 'create', 'user', $2, $3)`,
                [req.session.userId, result.rows[0].id, req.ip]
            );

            res.status(201).json({
                message: '使用者建立成功',
                userId: result.rows[0].id
            });

        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: '使用者建立失敗' });
        }
    }
);

// ============================================
// 停用/啟用使用者
// ============================================
router.patch('/users/:id/toggle-active', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await getOne('SELECT * FROM users WHERE id = $1', [userId]);
        if (!user) {
            return res.status(404).json({ error: '使用者不存在' });
        }

        const newStatus = !user.is_active;
        await query(
            'UPDATE users SET is_active = $1 WHERE id = $2',
            [newStatus, userId]
        );

        // 記錄操作
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, new_value)
             VALUES ($1, 'update', 'user', $2, $3, $4)`,
            [req.session.userId, userId, req.ip, JSON.stringify({ is_active: newStatus })]
        );

        res.json({ message: `使用者已${newStatus ? '啟用' : '停用'}` });

    } catch (error) {
        console.error('Toggle user active error:', error);
        res.status(500).json({ error: '操作失敗' });
    }
});

// ============================================
// 取得已刪除項目
// ============================================
router.get('/deleted-items', requireAdmin, async (req, res) => {
    try {
        const { type } = req.query;

        let items = [];

        if (!type || type === 'formulas') {
            const formulas = await getMany(
                `SELECT f.id, f.name, f.deleted_at, u.username as deleted_by
                 FROM formulas f
                 JOIN users u ON f.user_id = u.id
                 WHERE f.is_deleted = true
                 ORDER BY f.deleted_at DESC`
            );
            items.push({ type: 'formulas', items: formulas });
        }

        if (!type || type === 'experiments') {
            const experiments = await getMany(
                `SELECT e.id, e.title, e.deleted_at, u.username as deleted_by
                 FROM experiments e
                 JOIN users u ON e.user_id = u.id
                 WHERE e.is_deleted = true
                 ORDER BY e.deleted_at DESC`
            );
            items.push({ type: 'experiments', items: experiments });
        }

        res.json({ deletedItems: items });

    } catch (error) {
        console.error('Get deleted items error:', error);
        res.status(500).json({ error: '取得已刪除項目失敗' });
    }
});

// ============================================
// 恢復已刪除項目
// ============================================
router.post('/restore/:type/:id', requireAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;
        let tableName;

        if (type === 'formula') tableName = 'formulas';
        else if (type === 'experiment') tableName = 'experiments';
        else return res.status(400).json({ error: '無效的類型' });

        await query(
            `UPDATE ${tableName} SET is_deleted = false, deleted_at = NULL WHERE id = $1`,
            [id]
        );

        // 記錄操作
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
             VALUES ($1, 'restore', $2, $3, $4)`,
            [req.session.userId, type, id, req.ip]
        );

        res.json({ message: '項目已恢復' });

    } catch (error) {
        console.error('Restore item error:', error);
        res.status(500).json({ error: '恢復失敗' });
    }
});

// ============================================
// 取得系統統計
// ============================================
router.get('/statistics', requireAdmin, async (req, res) => {
    try {
        const userCount = await getOne('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        const formulaCount = await getOne('SELECT COUNT(*) as count FROM formulas WHERE is_deleted = false');
        const experimentCount = await getOne('SELECT COUNT(*) as count FROM experiments WHERE is_deleted = false');
        const publicFormulaCount = await getOne('SELECT COUNT(*) as count FROM formulas WHERE is_public = true AND is_deleted = false');

        res.json({
            users: parseInt(userCount.count),
            formulas: parseInt(formulaCount.count),
            experiments: parseInt(experimentCount.count),
            publicFormulas: parseInt(publicFormulaCount.count)
        });

    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: '取得統計失敗' });
    }
});

module.exports = router;
