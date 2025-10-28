// 認證相關功能

// 登入表單提交
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// 處理登入
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            app.currentUser = data.user;
            showNotification('登入成功', 'success');
            showDashboard();
        } else {
            errorDiv.textContent = data.error || '登入失敗';
            errorDiv.style.display = 'block';
        }
        
    } catch (error) {
        console.error('登入錯誤:', error);
        errorDiv.textContent = '連線失敗，請稍後再試';
        errorDiv.style.display = 'block';
    }
}

// 變更密碼
async function changePassword(oldPassword, newPassword) {
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ oldPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('密碼變更成功', 'success');
            return true;
        } else {
            showNotification(data.error || '密碼變更失敗', 'error');
            return false;
        }
        
    } catch (error) {
        console.error('變更密碼錯誤:', error);
        showNotification('連線失敗，請稍後再試', 'error');
        return false;
    }
}
