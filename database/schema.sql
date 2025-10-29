-- 化學品配方管理系統 - 資料庫建置腳本
-- PostgreSQL 13+

-- 刪除現有資料表 (如果存在)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS experiment_attachments CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS formula_ingredients CASCADE;
DROP TABLE IF EXISTS formulas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 刪除既有類型
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS file_type CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;

-- 建立列舉類型
CREATE TYPE user_role AS ENUM ('admin', 'student');
CREATE TYPE file_type AS ENUM ('image', 'data', 'document');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'restore');

-- ============================================
-- 1. 使用者表 (users)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    email VARCHAR(255),
    full_name VARCHAR(100),
    must_change_password BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 使用者表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- 2. 配方表 (formulas)
-- ============================================
CREATE TABLE formulas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_volume DECIMAL(10, 2) NOT NULL, -- ml
    is_public BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    tags TEXT[], -- 標籤陣列
    category VARCHAR(100), -- 類別
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配方表索引
CREATE INDEX idx_formulas_user_id ON formulas(user_id);
CREATE INDEX idx_formulas_is_public ON formulas(is_public);
CREATE INDEX idx_formulas_is_deleted ON formulas(is_deleted);
CREATE INDEX idx_formulas_created_at ON formulas(created_at);
CREATE INDEX idx_formulas_category ON formulas(category);
CREATE INDEX idx_formulas_tags ON formulas USING GIN(tags); -- GIN 索引用於陣列搜尋

-- ============================================
-- 3. 配方成分表 (formula_ingredients)
-- ============================================
CREATE TABLE formula_ingredients (
    id SERIAL PRIMARY KEY,
    formula_id INTEGER NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    chemical_name VARCHAR(255) NOT NULL,
    target_concentration DECIMAL(10, 4) NOT NULL, -- M (莫耳濃度)
    raw_concentration DECIMAL(10, 4) NOT NULL, -- % (原料濃度)
    molecular_weight DECIMAL(10, 4) NOT NULL, -- g/mol
    calculated_mass DECIMAL(10, 4) NOT NULL, -- g (計算出的質量)
    sequence_order INTEGER NOT NULL, -- 順序
    notes TEXT
);

-- 配方成分表索引
CREATE INDEX idx_formula_ingredients_formula_id ON formula_ingredients(formula_id);
CREATE INDEX idx_formula_ingredients_chemical_name ON formula_ingredients(chemical_name);

-- ============================================
-- 4. 實驗記錄表 (experiments)
-- ============================================
CREATE TABLE experiments (
    id SERIAL PRIMARY KEY,
    formula_id INTEGER NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    experiment_date TIMESTAMP NOT NULL,
    title VARCHAR(255) NOT NULL,
    environment JSONB, -- 實驗環境 (溫度、濕度等彈性欄位)
    results TEXT, -- 實驗結果
    observations TEXT, -- 觀察記錄
    conclusion TEXT, -- 實驗結論
    success_level INTEGER CHECK (success_level >= 1 AND success_level <= 5), -- 1-5 星
    numerical_data JSONB, -- 數值資料
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 實驗記錄表索引
CREATE INDEX idx_experiments_formula_id ON experiments(formula_id);
CREATE INDEX idx_experiments_user_id ON experiments(user_id);
CREATE INDEX idx_experiments_experiment_date ON experiments(experiment_date);
CREATE INDEX idx_experiments_is_deleted ON experiments(is_deleted);
CREATE INDEX idx_experiments_user_date ON experiments(user_id, experiment_date);
CREATE INDEX idx_experiments_environment ON experiments USING GIN(environment); -- GIN 索引用於 JSONB

-- ============================================
-- 5. 實驗附件表 (experiment_attachments)
-- ============================================
CREATE TABLE experiment_attachments (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    file_original_name VARCHAR(255) NOT NULL,
    file_stored_name VARCHAR(255) NOT NULL, -- UUID 格式
    file_path TEXT NOT NULL,
    file_type file_type NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT NOT NULL, -- bytes
    thumbnail_path TEXT, -- 縮圖路徑
    description TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 實驗附件表索引
CREATE INDEX idx_experiment_attachments_experiment_id ON experiment_attachments(experiment_id);
CREATE INDEX idx_experiment_attachments_file_type ON experiment_attachments(file_type);
CREATE INDEX idx_experiment_attachments_is_deleted ON experiment_attachments(is_deleted);

-- ============================================
-- 6. 操作日誌表 (audit_logs)
-- ============================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50), -- formula, experiment, user, attachment
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45), -- 支援 IPv6
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日誌表索引
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- 7. 插入預設管理員帳號
-- ============================================
-- 密碼: admin5612
-- bcrypt hash (rounds=10)
INSERT INTO users (username, password_hash, role, full_name, email, is_active, must_change_password)
VALUES (
    'M1423013',
    '$2a$10$8ZqLQxKxF4qE4Y8F4E4E4eXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX', -- 需要在初始化腳本中生成
    'admin',
    '系統管理員',
    'admin@chemistry.local',
    true,
    true
);

-- ============================================
-- 8. 建立更新時間自動觸發器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 配方表更新觸發器
CREATE TRIGGER update_formulas_updated_at
    BEFORE UPDATE ON formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 實驗表更新觸發器
CREATE TRIGGER update_experiments_updated_at
    BEFORE UPDATE ON experiments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. 建立視圖 - 公開配方列表
-- ============================================
CREATE VIEW public_formulas_view AS
SELECT 
    f.id,
    f.name,
    f.description,
    f.total_volume,
    f.tags,
    f.category,
    f.created_at,
    u.username AS creator,
    u.full_name AS creator_name,
    COUNT(DISTINCT e.id) AS experiment_count
FROM formulas f
JOIN users u ON f.user_id = u.id
LEFT JOIN experiments e ON f.id = e.formula_id AND e.is_deleted = false
WHERE f.is_public = true AND f.is_deleted = false
GROUP BY f.id, u.username, u.full_name;

-- ============================================
-- 10. 建立視圖 - 我的配方列表
-- ============================================
CREATE VIEW my_formulas_view AS
SELECT 
    f.id,
    f.name,
    f.description,
    f.total_volume,
    f.is_public,
    f.tags,
    f.category,
    f.created_at,
    f.user_id,
    COUNT(DISTINCT e.id) AS experiment_count
FROM formulas f
LEFT JOIN experiments e ON f.id = e.formula_id AND e.is_deleted = false
WHERE f.is_deleted = false
GROUP BY f.id;

-- ============================================
-- 11. 效能統計
-- ============================================
COMMENT ON TABLE users IS '使用者資料表';
COMMENT ON TABLE formulas IS '配方資料表';
COMMENT ON TABLE formula_ingredients IS '配方成分資料表';
COMMENT ON TABLE experiments IS '實驗記錄資料表';
COMMENT ON TABLE experiment_attachments IS '實驗附件資料表';
COMMENT ON TABLE audit_logs IS '操作日誌資料表';

-- 完成訊息
SELECT 'Database schema created successfully!' AS status;
