const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'chemistry_db',
        user: process.env.DB_USER || 'chemistry_user',
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log('開始初始化資料庫...');

        // 讀取並執行 schema.sql
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // 生成管理員密碼雜湊
        const adminPassword = 'admin5612';
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        
        // 替換密碼雜湊佔位符
        schemaSql = schemaSql.replace(
            '$2a$10$8ZqLQxKxF4qE4Y8F4E4E4eXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX',
            passwordHash
        );

        console.log('執行資料庫架構建立...');
        await pool.query(schemaSql);
        console.log('✓ 資料庫架構建立完成');

        // 詢問是否插入測試資料
        const insertTestData = process.argv.includes('--with-test-data');
        
        if (insertTestData) {
            console.log('插入測試資料...');
            const testDataPath = path.join(__dirname, '..', 'database', 'test_data.sql');
            const testDataSql = fs.readFileSync(testDataPath, 'utf8');
            await pool.query(testDataSql);
            console.log('✓ 測試資料插入完成');
        }

        console.log('\n');
        console.log('============================================');
        console.log('✓ 資料庫初始化完成！');
        console.log('============================================');
        console.log('預設管理員帳號：');
        console.log('  使用者名稱: M1423013');
        console.log('  密碼: admin5612');
        console.log('============================================');
        console.log('⚠️  請在首次登入後立即變更密碼！');
        console.log('============================================\n');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('資料庫初始化失敗:', error);
        await pool.end();
        process.exit(1);
    }
}

initializeDatabase();
