const express = require('express');
const router = express.Router();
const { body, query: queryValidator, validationResult } = require('express-validator');
const { query, getOne, getMany, transaction } = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ============================================
// 建立配方
// ============================================
router.post('/',
    requireAuth,
    [
        body('name').trim().notEmpty().withMessage('配方名稱不能為空'),
        body('totalVolume').isFloat({ min: 0 }).withMessage('總體積必須大於 0'),
        body('ingredients').isArray({ min: 1 }).withMessage('至少需要一個化學品'),
        body('ingredients.*.chemicalName').trim().notEmpty(),
        body('ingredients.*.targetConcentration').isFloat({ min: 0 }),
        body('ingredients.*.rawConcentration').isFloat({ min: 0, max: 100 }),
        body('ingredients.*.molecularWeight').isFloat({ min: 0 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, description, totalVolume, ingredients, isPublic, tags, category } = req.body;
            const userId = req.session.userId;

            const result = await transaction(async (client) => {
                // 插入配方
                const formulaResult = await client.query(
                    `INSERT INTO formulas (name, description, user_id, total_volume, is_public, tags, category)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [name, description || null, userId, totalVolume, isPublic || false, tags || [], category || null]
                );

                const formulaId = formulaResult.rows[0].id;

                // 插入配方成分
                for (let i = 0; i < ingredients.length; i++) {
                    const ing = ingredients[i];
                    
                    // 計算所需質量: (目標濃度 × 體積(L) × 分子量) / 原料濃度(%)
                    const volumeInLiters = totalVolume / 1000;
                    const calculatedMass = (ing.targetConcentration * volumeInLiters * ing.molecularWeight) / (ing.rawConcentration / 100);

                    await client.query(
                        `INSERT INTO formula_ingredients 
                         (formula_id, chemical_name, target_concentration, raw_concentration, 
                          molecular_weight, calculated_mass, sequence_order, notes)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [formulaId, ing.chemicalName, ing.targetConcentration, ing.rawConcentration,
                         ing.molecularWeight, calculatedMass, i + 1, ing.notes || null]
                    );
                }

                // 記錄操作日誌
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
                     VALUES ($1, 'create', 'formula', $2, $3)`,
                    [userId, formulaId, req.ip]
                );

                return formulaId;
            });

            res.status(201).json({
                message: '配方建立成功',
                formulaId: result
            });

        } catch (error) {
            console.error('Create formula error:', error);
            res.status(500).json({ error: '配方建立失敗' });
        }
    }
);

// ============================================
// 取得配方列表 (分頁)
// ============================================
router.get('/',
    requireAuth,
    [
        queryValidator('page').optional().isInt({ min: 1 }),
        queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
        queryValidator('search').optional().trim(),
        queryValidator('tags').optional(),
        queryValidator('category').optional().trim(),
        queryValidator('publicOnly').optional().isBoolean(),
        queryValidator('creator').optional().trim(),
        queryValidator('startDate').optional().isISO8601(),
        queryValidator('endDate').optional().isISO8601(),
        queryValidator('chemical').optional().trim()
    ],
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';
            const tags = req.query.tags ? req.query.tags.split(',') : null;
            const category = req.query.category || null;
            const publicOnly = req.query.publicOnly === 'true';
            const creator = req.query.creator || null;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const chemical = req.query.chemical || null;
            const userId = req.session.userId;
            const isAdmin = req.session.role === 'admin';

            // 建立查詢條件
            let whereConditions = ['f.is_deleted = false'];
            let params = [];
            let paramIndex = 1;

            // 權限過濾
            if (publicOnly) {
                whereConditions.push('f.is_public = true');
            } else if (!isAdmin) {
                whereConditions.push(`(f.user_id = $${paramIndex} OR f.is_public = true)`);
                params.push(userId);
                paramIndex++;
            }

            // 搜尋過濾 (名稱/描述)
            if (search) {
                whereConditions.push(`(f.name ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            // 標籤過濾
            if (tags && tags.length > 0) {
                whereConditions.push(`f.tags && $${paramIndex}`);
                params.push(tags);
                paramIndex++;
            }

            // 類別過濾
            if (category) {
                whereConditions.push(`f.category = $${paramIndex}`);
                params.push(category);
                paramIndex++;
            }

            // 建立者過濾 (username)
            if (creator) {
                whereConditions.push(`u.username = $${paramIndex}`);
                params.push(creator);
                paramIndex++;
            }

            // 日期範圍 (created_at)
            if (startDate) {
                whereConditions.push(`f.created_at >= $${paramIndex}`);
                params.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                whereConditions.push(`f.created_at <= $${paramIndex}`);
                params.push(endDate);
                paramIndex++;
            }

            // 依化學品名稱過濾
            let chemicalJoin = '';
            if (chemical) {
                chemicalJoin = 'LEFT JOIN formula_ingredients fi ON fi.formula_id = f.id';
                whereConditions.push(`fi.chemical_name ILIKE $${paramIndex}`);
                params.push(`%${chemical}%`);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // 取得總數
            const countResult = await getOne(
                `SELECT COUNT(*) as total FROM formulas f WHERE ${whereClause}`,
                params
            );

            // 取得資料
            const formulas = await getMany(
                `SELECT 
                    f.id, f.name, f.description, f.total_volume, f.is_public,
                    f.tags, f.category, f.created_at, f.updated_at,
                    u.username as creator, u.full_name as creator_name,
                    COUNT(DISTINCT e.id) as experiment_count
                 FROM formulas f
                 JOIN users u ON f.user_id = u.id
                 ${chemicalJoin}
                 LEFT JOIN experiments e ON f.id = e.formula_id AND e.is_deleted = false
                 WHERE ${whereClause}
                 GROUP BY f.id, u.username, u.full_name
                 ORDER BY f.created_at DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...params, limit, offset]
            );

            res.json({
                formulas,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.total),
                    totalPages: Math.ceil(countResult.total / limit)
                }
            });

        } catch (error) {
            console.error('Get formulas error:', error);
            res.status(500).json({ error: '取得配方列表失敗' });
        }
    }
);

// ============================================
// 取得配方詳情
// ============================================
router.get('/:id',
    requireAuth,
    async (req, res) => {
        try {
            const formulaId = req.params.id;
            const userId = req.session.userId;
            const isAdmin = req.session.role === 'admin';

            // 取得配方基本資訊
            const formula = await getOne(
                `SELECT f.*, u.username as creator, u.full_name as creator_name
                 FROM formulas f
                 JOIN users u ON f.user_id = u.id
                 WHERE f.id = $1 AND f.is_deleted = false`,
                [formulaId]
            );

            if (!formula) {
                return res.status(404).json({ error: '配方不存在' });
            }

            // 權限檢查
            if (!formula.is_public && formula.user_id !== userId && !isAdmin) {
                return res.status(403).json({ error: '無權訪問此配方' });
            }

            // 取得配方成分
            const ingredients = await getMany(
                `SELECT * FROM formula_ingredients 
                 WHERE formula_id = $1 
                 ORDER BY sequence_order`,
                [formulaId]
            );

            // 取得實驗記錄數量
            const experimentCount = await getOne(
                'SELECT COUNT(*) as count FROM experiments WHERE formula_id = $1 AND is_deleted = false',
                [formulaId]
            );

            res.json({
                ...formula,
                ingredients,
                experiment_count: parseInt(experimentCount.count)
            });

        } catch (error) {
            console.error('Get formula detail error:', error);
            res.status(500).json({ error: '取得配方詳情失敗' });
        }
    }
);

// ============================================
// 更新配方
// ============================================
router.put('/:id',
    requireAuth,
    async (req, res) => {
        try {
            const formulaId = req.params.id;
            const userId = req.session.userId;
            const isAdmin = req.session.role === 'admin';

            // 檢查配方是否存在及權限
            const formula = await getOne(
                'SELECT * FROM formulas WHERE id = $1 AND is_deleted = false',
                [formulaId]
            );

            if (!formula) {
                return res.status(404).json({ error: '配方不存在' });
            }

            if (formula.user_id !== userId && !isAdmin) {
                return res.status(403).json({ error: '無權編輯此配方' });
            }

            const { name, description, isPublic, tags, category } = req.body;

            await query(
                `UPDATE formulas 
                 SET name = $1, description = $2, is_public = $3, tags = $4, category = $5
                 WHERE id = $6`,
                [name, description, isPublic, tags || [], category, formulaId]
            );

            // 記錄操作日誌
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
                 VALUES ($1, 'update', 'formula', $2, $3)`,
                [userId, formulaId, req.ip]
            );

            res.json({ message: '配方更新成功' });

        } catch (error) {
            console.error('Update formula error:', error);
            res.status(500).json({ error: '配方更新失敗' });
        }
    }
);

// ============================================
// 刪除配方 (軟刪除)
// ============================================
router.delete('/:id',
    requireAuth,
    async (req, res) => {
        try {
            const formulaId = req.params.id;
            const userId = req.session.userId;
            const isAdmin = req.session.role === 'admin';

            const formula = await getOne(
                'SELECT * FROM formulas WHERE id = $1 AND is_deleted = false',
                [formulaId]
            );

            if (!formula) {
                return res.status(404).json({ error: '配方不存在' });
            }

            if (formula.user_id !== userId && !isAdmin) {
                return res.status(403).json({ error: '無權刪除此配方' });
            }

            // 軟刪除
            await query(
                'UPDATE formulas SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
                [formulaId]
            );

            // 記錄操作日誌
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
                 VALUES ($1, 'delete', 'formula', $2, $3)`,
                [userId, formulaId, req.ip]
            );

            res.json({ message: '配方已刪除' });

        } catch (error) {
            console.error('Delete formula error:', error);
            res.status(500).json({ error: '配方刪除失敗' });
        }
    }
);

module.exports = router;
