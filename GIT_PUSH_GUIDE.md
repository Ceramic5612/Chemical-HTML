# Git 推送指南

## 初始化並推送到 GitHub

### 步驟 1: 初始化 Git 倉庫

```bash
cd c:\Users\Natsu\Desktop\化學品紀錄系統

# 初始化 Git
git init

# 設定使用者資訊 (如果還沒設定)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 步驟 2: 添加遠端倉庫

```bash
# 添加遠端倉庫
git remote add origin https://github.com/Ceramic5612/Chemical-HTML.git

# 驗證遠端倉庫
git remote -v
```

### 步驟 3: 添加所有檔案

```bash
# 添加所有檔案到暫存區
git add .

# 檢查狀態
git status
```

### 步驟 4: 提交變更

```bash
# 提交變更
git commit -m "Initial commit: 完整的化學品配方管理系統

- 建立完整的資料庫架構 (PostgreSQL)
- 實作後端 API (Node.js + Express)
- 建立前端介面 (HTML + CSS + JavaScript)
- 提供一鍵安裝腳本
- 完整的使用者和管理員文件
- 包含備份腳本和 Nginx 配置"
```

### 步驟 5: 推送到 GitHub

```bash
# 推送到主分支
git push -u origin main

# 如果遠端已有內容,可能需要先拉取
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## PowerShell 一鍵執行腳本

以下是 PowerShell 版本的推送腳本:

```powershell
# 切換到專案目錄
cd "c:\Users\Natsu\Desktop\化學品紀錄系統"

# 初始化 Git (如果尚未初始化)
if (-not (Test-Path ".git")) {
    git init
}

# 設定遠端倉庫
git remote remove origin 2>$null
git remote add origin https://github.com/Ceramic5612/Chemical-HTML.git

# 添加所有檔案
git add .

# 提交
git commit -m "Initial commit: 完整的化學品配方管理系統

- 建立完整的資料庫架構 (PostgreSQL)
- 實作後端 API (Node.js + Express)  
- 建立前端介面 (HTML + CSS + JavaScript)
- 提供一鍵安裝腳本
- 完整的使用者和管理員文件
- 包含備份腳本和 Nginx 配置"

# 推送到 GitHub
git branch -M main
git push -u origin main -f

Write-Host "推送完成!" -ForegroundColor Green
```

## 檢查推送結果

推送成功後,訪問以下網址確認:
- https://github.com/Ceramic5612/Chemical-HTML

您應該能看到:
- README.md (專案說明)
- install.sh (一鍵安裝腳本)
- 完整的目錄結構
- 所有文件

## 更新倉庫 (後續使用)

```bash
# 添加變更
git add .

# 提交變更
git commit -m "描述您的變更"

# 推送
git push origin main
```
