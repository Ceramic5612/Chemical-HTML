// 主應用程式邏輯

// 全域狀態
const app = {
    currentUser: null,
    currentPage: 'login'
};

// API 基礎 URL
const API_BASE = '/api';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 檢查登入狀態
    await checkAuthStatus();
    
    // 設定事件監聽
    setupEventListeners();
});

// 檢查認證狀態
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.loggedIn) {
            app.currentUser = data.user;
            showDashboard();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('檢查登入狀態失敗:', error);
        showLoginPage();
    }
}

// 設定事件監聽器
function setupEventListeners() {
    // 導航選單
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            navigateTo(page);
        });
    });
    
    // 登出按鈕
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// 頁面導航
function navigateTo(page) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(p => {
        p.style.display = 'none';
    });
    
    // 顯示目標頁面
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
        app.currentPage = page;
        
        // 載入頁面資料
        loadPageData(page);
    }
}

// 載入頁面資料
async function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'formulas':
            await loadMyFormulas();
            break;
        case 'public-formulas':
            await loadPublicFormulas();
            break;
        case 'admin':
            if (app.currentUser.role === 'admin') {
                await loadAdminData();
            }
            break;
    }
}

// 顯示登入頁面
function showLoginPage() {
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('login-page').style.display = 'block';
    
    document.querySelectorAll('.page').forEach(p => {
        if (p.id !== 'login-page') {
            p.style.display = 'none';
        }
    });
}

// 顯示儀表板
function showDashboard() {
    document.getElementById('navbar').style.display = 'block';
    document.getElementById('login-page').style.display = 'none';
    
    // 顯示使用者名稱
    document.getElementById('username-display').textContent = 
        app.currentUser.fullName || app.currentUser.username;
    
    // 顯示管理選單 (如果是管理員)
    if (app.currentUser.role === 'admin') {
        document.getElementById('admin-menu').style.display = 'block';
    }
    
    navigateTo('dashboard');
}

// 載入儀表板資料
async function loadDashboardData() {
    try {
        // 載入統計資料
        const response = await fetch(`${API_BASE}/formulas?limit=5`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        // 更新統計
        document.getElementById('my-formula-count').textContent = data.pagination.total;
        
        // 顯示最近的配方
        displayRecentFormulas(data.formulas);
        
    } catch (error) {
        console.error('載入儀表板資料失敗:', error);
        showNotification('載入資料失敗', 'error');
    }
}

// 顯示最近的配方
function displayRecentFormulas(formulas) {
    const container = document.getElementById('recent-formulas');
    container.innerHTML = '';
    
    if (formulas.length === 0) {
        container.innerHTML = '<p>尚無配方，請<a href="#" data-page="create-formula">建立第一個配方</a></p>';
        return;
    }
    
    formulas.forEach(formula => {
        const card = document.createElement('div');
        card.className = 'formula-card';
        card.innerHTML = `
            <h3>${escapeHtml(formula.name)}</h3>
            <p>${escapeHtml(formula.description || '無描述')}</p>
            <div class="tags">
                ${formula.tags ? formula.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : ''}
            </div>
            <p class="meta">建立於 ${new Date(formula.created_at).toLocaleDateString('zh-TW')}</p>
        `;
        card.addEventListener('click', () => viewFormula(formula.id));
        container.appendChild(card);
    });
}

// 顯示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// HTML 轉義
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 登出
async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        app.currentUser = null;
        showLoginPage();
        showNotification('已登出', 'success');
        
    } catch (error) {
        console.error('登出失敗:', error);
        showNotification('登出失敗', 'error');
    }
}

// 載入我的配方 (佔位)
async function loadMyFormulas() {
    // 實作在 formulas.js
}

// 載入公開配方 (佔位)
async function loadPublicFormulas() {
    // 實作在 formulas.js
}

// 載入管理資料 (佔位)
async function loadAdminData() {
    // 實作在 admin.js
}

// 檢視配方 (佔位)
function viewFormula(id) {
    // 實作在 formulas.js
}
