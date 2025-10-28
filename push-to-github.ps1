# 推送到 GitHub 的 PowerShell 腳本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "化學品配方管理系統 - Git 推送腳本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 切換到專案目錄
$projectPath = "c:\Users\Natsu\Desktop\化學品紀錄系統"
Set-Location $projectPath

Write-Host "專案目錄: $projectPath" -ForegroundColor Yellow

# 檢查 Git 是否已安裝
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "錯誤: 未安裝 Git,請先安裝 Git for Windows" -ForegroundColor Red
    Write-Host "下載地址: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# 初始化 Git (如果尚未初始化)
if (-not (Test-Path ".git")) {
    Write-Host "初始化 Git 倉庫..." -ForegroundColor Green
    git init
}

# 檢查是否已設定使用者資訊
$userName = git config user.name
$userEmail = git config user.email

if ([string]::IsNullOrEmpty($userName) -or [string]::IsNullOrEmpty($userEmail)) {
    Write-Host ""
    Write-Host "請設定 Git 使用者資訊:" -ForegroundColor Yellow
    $name = Read-Host "請輸入您的名稱"
    $email = Read-Host "請輸入您的 Email"
    
    git config user.name "$name"
    git config user.email "$email"
    
    Write-Host "使用者資訊已設定" -ForegroundColor Green
}

# 移除現有遠端 (如果存在)
git remote remove origin 2>$null

# 添加遠端倉庫
Write-Host ""
Write-Host "添加遠端倉庫..." -ForegroundColor Green
git remote add origin https://github.com/Ceramic5612/Chemical-HTML.git

# 驗證遠端倉庫
Write-Host "遠端倉庫:" -ForegroundColor Yellow
git remote -v

# 添加所有檔案
Write-Host ""
Write-Host "添加檔案到暫存區..." -ForegroundColor Green
git add .

# 顯示狀態
Write-Host ""
Write-Host "Git 狀態:" -ForegroundColor Yellow
git status --short

# 提交
Write-Host ""
Write-Host "提交變更..." -ForegroundColor Green
git commit -m "Initial commit: 完整的化學品配方管理系統

功能特色:
- 完整的資料庫架構設計 (PostgreSQL)
- RESTful API 實作 (Node.js + Express)
- 響應式前端介面 (HTML5 + CSS3 + JavaScript)
- 配方自動計算功能
- 實驗數據管理與檔案上傳
- 使用者權限管理 (管理員/學生)
- 軟刪除機制保留完整歷史
- 一鍵安裝腳本 (Ubuntu/Debian)
- 完整的使用者和管理員手冊
- 自動備份腳本
- Nginx 配置範例
- systemd 服務配置

技術架構:
- 後端: Node.js 16+, Express, PostgreSQL
- 前端: 原生 JavaScript, 無框架依賴
- 安全: bcrypt 密碼加密, Session 管理, 防 SQL 注入
- 檔案處理: Sharp 圖片壓縮, UUID 命名
- 部署: Nginx 反向代理, systemd 服務管理"

# 設定主分支
Write-Host ""
Write-Host "設定主分支..." -ForegroundColor Green
git branch -M main

# 推送到 GitHub
Write-Host ""
Write-Host "推送到 GitHub..." -ForegroundColor Green
Write-Host "這可能需要幾分鐘..." -ForegroundColor Yellow

try {
    git push -u origin main -f
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "✓ 推送成功!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "請訪問以下網址查看:" -ForegroundColor Yellow
    Write-Host "https://github.com/Ceramic5612/Chemical-HTML" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "一鍵安裝腳本位置:" -ForegroundColor Yellow
    Write-Host "https://raw.githubusercontent.com/Ceramic5612/Chemical-HTML/main/install.sh" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "推送失敗!" -ForegroundColor Red
    Write-Host "錯誤訊息: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因:" -ForegroundColor Yellow
    Write-Host "1. 沒有 GitHub 倉庫的推送權限" -ForegroundColor Yellow
    Write-Host "2. 網路連線問題" -ForegroundColor Yellow
    Write-Host "3. 需要先進行 GitHub 身份驗證" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "請執行以下指令進行身份驗證:" -ForegroundColor Yellow
    Write-Host "git config --global credential.helper wincred" -ForegroundColor Cyan
    exit 1
}
