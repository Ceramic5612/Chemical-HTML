-- 測試資料插入腳本
-- 用於開發和測試環境

-- 插入測試使用者 (密碼都是 test1234)
INSERT INTO users (username, password_hash, role, full_name, email) VALUES
('student1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '測試學生一', 'student1@test.com'),
('student2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '測試學生二', 'student2@test.com'),
('teacher1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', '測試教師', 'teacher@test.com');

-- 插入測試配方
INSERT INTO formulas (name, description, user_id, total_volume, is_public, tags, category) VALUES
('KOH 電解液', '用於電化學實驗的氫氧化鉀電解液', 2, 500.00, true, ARRAY['電解液', '鹼性'], '電解液'),
('緩衝溶液 pH 7.4', '磷酸鹽緩衝溶液，用於生物實驗', 2, 1000.00, true, ARRAY['緩衝液', '生物'], '緩衝液'),
('有機溶劑混合液', '實驗室常用有機溶劑', 3, 250.00, false, ARRAY['有機溶劑'], '溶劑');

-- 插入配方成分
-- 配方 1: KOH 電解液
INSERT INTO formula_ingredients (formula_id, chemical_name, target_concentration, raw_concentration, molecular_weight, calculated_mass, sequence_order) VALUES
(1, 'KOH', 0.5000, 85.00, 56.11, 16.53, 1),
(1, '碳酸鉀', 0.0500, 99.00, 138.21, 3.49, 2),
(1, '醋酸辛酯', 0.0100, 100.00, 219.50, 1.10, 3);

-- 配方 2: 緩衝溶液
INSERT INTO formula_ingredients (formula_id, chemical_name, target_concentration, raw_concentration, molecular_weight, calculated_mass, sequence_order) VALUES
(2, 'Na2HPO4', 0.1000, 99.00, 141.96, 14.34, 1),
(2, 'NaH2PO4', 0.0500, 99.00, 119.98, 6.06, 2);

-- 配方 3: 有機溶劑
INSERT INTO formula_ingredients (formula_id, chemical_name, target_concentration, raw_concentration, molecular_weight, calculated_mass, sequence_order) VALUES
(3, '乙醇', 0.5000, 95.00, 46.07, 6.06, 1),
(3, '丙酮', 0.3000, 99.50, 58.08, 4.37, 2);

-- 插入測試實驗記錄
INSERT INTO experiments (formula_id, user_id, experiment_date, title, environment, results, observations, conclusion, success_level) VALUES
(1, 2, '2025-01-15 10:30:00', '電解液性能測試', 
 '{"temperature": 25, "humidity": 60, "pressure": 1013}'::jsonb,
 '電導率: 85.3 mS/cm, pH: 13.8',
 '溶液澄清透明，無沉澱',
 '配方符合預期，電導率達標',
 5),
(1, 2, '2025-01-20 14:00:00', '長期穩定性測試',
 '{"temperature": 25, "humidity": 55}'::jsonb,
 '放置7天後電導率: 84.1 mS/cm',
 '略有下降但仍在可接受範圍',
 '穩定性良好',
 4);

-- 插入操作日誌
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES
(1, 'login', 'user', 1, '127.0.0.1'),
(2, 'create', 'formula', 1, '127.0.0.1'),
(2, 'create', 'experiment', 1, '127.0.0.1');

SELECT 'Test data inserted successfully!' AS status;
