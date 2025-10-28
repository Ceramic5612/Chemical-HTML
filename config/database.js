const { Pool } = require('pg');
require('dotenv').config();

// 資料庫連線池配置
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'chemistry_db',
    user: process.env.DB_USER || 'chemistry_user',
    password: process.env.DB_PASSWORD,
    max: 20, // 最大連線數
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// 測試資料庫連線
pool.on('connect', () => {
    console.log('✓ 資料庫連線成功');
});

pool.on('error', (err) => {
    console.error('資料庫連線錯誤:', err);
    process.exit(-1);
});

// 查詢包裝函式
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('query error', { text, error: error.message });
        throw error;
    }
};

// 取得單一資料
const getOne = async (text, params) => {
    const result = await query(text, params);
    return result.rows[0] || null;
};

// 取得多筆資料
const getMany = async (text, params) => {
    const result = await query(text, params);
    return result.rows;
};

// 交易處理
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query,
    getOne,
    getMany,
    transaction
};
