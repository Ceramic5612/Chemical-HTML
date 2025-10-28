// 驗證中介軟體

// 檢查是否已登入
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '請先登入' });
    }
    next();
};

// 檢查是否為管理員
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '請先登入' });
    }
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: '權限不足' });
    }
    next();
};

// 檢查資源擁有權或管理員
const requireOwnerOrAdmin = (resourceUserId) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: '請先登入' });
        }
        if (req.session.role === 'admin' || req.session.userId === resourceUserId) {
            next();
        } else {
            res.status(403).json({ error: '無權訪問此資源' });
        }
    };
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireOwnerOrAdmin
};
