const express = require('express');
const router = express.Router();
const { body, query: queryValidator, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { query, getOne, getMany, transaction } = require('../config/database');

// ============================================
// 建立實驗記錄
// ============================================
router.post('/',
	requireAuth,
	[
		body('formulaId').isInt({ min: 1 }),
		body('experimentDate').isISO8601(),
		body('title').trim().notEmpty(),
		body('environment').optional(),
		body('results').optional(),
		body('observations').optional(),
		body('conclusion').optional(),
		body('successLevel').optional().isInt({ min: 1, max: 5 })
	],
	async (req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const { formulaId, experimentDate, title, environment, results, observations, conclusion, successLevel, numericalData } = req.body;
			const userId = req.session.userId;

			// 權限檢查: 只能為自己可見的配方建立實驗 (私人配方需為擁有者)
			const formula = await getOne('SELECT * FROM formulas WHERE id = $1 AND is_deleted = false', [formulaId]);
			if (!formula) return res.status(404).json({ error: '配方不存在' });
			const isAdmin = req.session.role === 'admin';
			if (!formula.is_public && formula.user_id !== userId && !isAdmin) {
				return res.status(403).json({ error: '無權限在此配方建立實驗' });
			}

			const result = await query(
				`INSERT INTO experiments 
				 (formula_id, user_id, experiment_date, title, environment, results, observations, conclusion, success_level, numerical_data)
				 VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10::jsonb)
				 RETURNING id`,
				[formulaId, userId, experimentDate, title, environment || null, results || null, observations || null, conclusion || null, successLevel || null, numericalData || null]
			);

			res.status(201).json({ message: '實驗記錄建立成功', experimentId: result.rows[0].id });
		} catch (error) {
			console.error('Create experiment error:', error);
			res.status(500).json({ error: '實驗記錄建立失敗' });
		}
	}
);

// ============================================
// 取得實驗記錄列表 (依配方或使用者)
// ============================================
router.get('/',
	requireAuth,
	[
		queryValidator('formulaId').optional().isInt({ min: 1 }),
		queryValidator('page').optional().isInt({ min: 1 }),
		queryValidator('limit').optional().isInt({ min: 1, max: 100 })
	],
	async (req, res) => {
		try {
			const page = parseInt(req.query.page) || 1;
			const limit = parseInt(req.query.limit) || 20;
			const offset = (page - 1) * limit;
			const formulaId = req.query.formulaId ? parseInt(req.query.formulaId) : null;
			const userId = req.session.userId;
			const isAdmin = req.session.role === 'admin';

			let where = ['e.is_deleted = false'];
			let params = [];
			let i = 1;

			if (formulaId) {
				where.push(`e.formula_id = $${i++}`);
				params.push(formulaId);
			}

			// 權限: 非管理員僅可看到自己建立或公開配方的實驗
			if (!isAdmin) {
				where.push(`(
					e.user_id = $${i} OR EXISTS (
						SELECT 1 FROM formulas f
						WHERE f.id = e.formula_id AND (f.is_public = true OR f.user_id = $${i})
					)
				)`);
				params.push(userId);
				i++;
			}

			const whereClause = where.join(' AND ');

			const count = await getOne(`SELECT COUNT(*) AS total FROM experiments e WHERE ${whereClause}`, params);
			const rows = await getMany(
				`SELECT e.*, u.username, u.full_name, f.name as formula_name
				 FROM experiments e
				 JOIN users u ON e.user_id = u.id
				 JOIN formulas f ON e.formula_id = f.id
				 WHERE ${whereClause}
				 ORDER BY e.experiment_date DESC
				 LIMIT $${i} OFFSET $${i + 1}`,
				[...params, limit, offset]
			);

			res.json({
				experiments: rows,
				pagination: {
					page,
					limit,
					total: parseInt(count.total),
					totalPages: Math.ceil(count.total / limit)
				}
			});
		} catch (error) {
			console.error('List experiments error:', error);
			res.status(500).json({ error: '取得實驗記錄失敗' });
		}
	}
);

// ============================================
// 取得實驗記錄詳情
// ============================================
router.get('/:id', requireAuth, async (req, res) => {
	try {
		const id = parseInt(req.params.id);
		const userId = req.session.userId;
		const isAdmin = req.session.role === 'admin';

		const exp = await getOne(
			`SELECT e.*, u.username, u.full_name, f.name as formula_name, f.user_id as formula_owner, f.is_public
			 FROM experiments e
			 JOIN users u ON e.user_id = u.id
			 JOIN formulas f ON e.formula_id = f.id
			 WHERE e.id = $1`,
			[id]
		);
		if (!exp) return res.status(404).json({ error: '實驗記錄不存在' });

		if (!isAdmin && exp.user_id !== userId && !exp.is_public && exp.formula_owner !== userId) {
			return res.status(403).json({ error: '無權查看此實驗記錄' });
		}

		// 取附件
		const attachments = await getMany(
			'SELECT * FROM experiment_attachments WHERE experiment_id = $1 AND is_deleted = false ORDER BY uploaded_at DESC',
			[id]
		);

		res.json({ ...exp, attachments });
	} catch (error) {
		console.error('Get experiment error:', error);
		res.status(500).json({ error: '取得實驗記錄失敗' });
	}
});

// ============================================
// 刪除實驗記錄 (軟刪除)
// ============================================
router.delete('/:id', requireAuth, async (req, res) => {
	try {
		const id = parseInt(req.params.id);
		const userId = req.session.userId;
		const isAdmin = req.session.role === 'admin';

		const exp = await getOne('SELECT * FROM experiments WHERE id = $1', [id]);
		if (!exp) return res.status(404).json({ error: '實驗記錄不存在' });

		if (!isAdmin && exp.user_id !== userId) {
			return res.status(403).json({ error: '無權刪除此實驗記錄' });
		}

		await query('UPDATE experiments SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		res.json({ message: '實驗記錄已刪除' });
	} catch (error) {
		console.error('Delete experiment error:', error);
		res.status(500).json({ error: '刪除失敗' });
	}
});

module.exports = router;
