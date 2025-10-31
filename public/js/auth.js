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

            // 首次登入強制變更密碼
            if (data.user.mustChangePassword) {
                // 使用 SweetAlert2 顯示漂亮的必改密碼對話框
                if (window.Swal) {
                    Swal.fire({
                        title: '首次登入需變更密碼',
                        text: '請輸入新密碼（至少 8 碼，需含英文與數字）',
                        input: 'password',
                        inputAttributes: {
                            minlength: 8,
                            autocapitalize: 'off',
                            autocorrect: 'off'
                        },
                        inputValidator: (value) => {
                            if (!value) return '請輸入新密碼';
                            if (value.length < 8) return '至少 8 碼';
                            if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return '需包含英文字母與數字';
                        },
                        confirmButtonText: '變更密碼',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        showCancelButton: false
                    }).then((result) => {
                        if (result.isConfirmed && result.value) {
                            changePassword('admin5612', result.value).then((ok) => {
                                if (ok) {
                                    showDashboard();
                                } else {
                                    showNotification('請稍後於個人設定頁面變更密碼', 'error');
                                    showDashboard();
                                }
                            });
                        }
                    });
                } else {
                    // 備援方案
                    const newPwd = prompt('系統要求您首次登入必須更改密碼，請輸入新密碼 (至少 8 碼且含英文與數字)：');
                    if (newPwd) {
                        changePassword('admin5612', newPwd).then((ok) => {
                            if (ok) {
                                showDashboard();
                            } else {
                                showNotification('請稍後於個人設定頁面變更密碼', 'error');
                                showDashboard();
                            }
                        });
                    } else {
                        showNotification('未變更密碼，請於右上角個人設定儘速變更', 'warning');
                        showDashboard();
                    }
                }
            } else {
                showDashboard();
            }
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
