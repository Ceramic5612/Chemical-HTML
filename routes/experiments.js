const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query, getMany } = require('../config/database');

// 僅占位，完整實驗路由在 experiments.js
module.exports = router;
