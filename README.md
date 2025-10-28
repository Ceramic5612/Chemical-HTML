# 化學品配方管理系統

基於 Web 的化學品配方管理與計算系統，供實驗室學生與教師使用。

## ✨ 主要功能

- 📊 **配方計算與儲存** - 自動計算化學品所需質量，支援標籤分類
- 🧪 **實驗數據管理** - 上傳實驗數據、圖片、CSV/Excel 檔案
- 👥 **權限管理** - 管理員與一般使用者分級管理
- 🔍 **搜尋與篩選** - 依名稱、化學品、標籤、日期搜尋
- 📁 **檔案處理** - 自動壓縮圖片、生成縮圖
- 🔒 **安全機制** - 密碼雜湊、防 SQL 注入、XSS 攻擊防護
- 🗑️ **軟刪除** - 所有資料可恢復，保留完整歷史

## 🚀 快速安裝

### 一鍵安裝 (Ubuntu 20.04+)

```bash
# 下載安裝腳本
wget https://raw.githubusercontent.com/Ceramic5612/Chemical-HTML/main/install.sh

# 執行安裝
sudo bash install.sh
```

### 手動安裝

請參閱 [安裝指南](docs/INSTALLATION.md)

## 📖 文件

- [安裝指南](docs/INSTALLATION.md) - 完整的安裝步驟
- [使用者手冊](docs/USER_MANUAL.md) - 系統使用說明
- [管理員手冊](docs/ADMIN_MANUAL.md) - 管理功能說明
- [API 文件](docs/API.md) - API 端點說明

## 🛠️ 技術架構

- **後端**: Node.js + Express
- **資料庫**: PostgreSQL 13+
- **Web Server**: Nginx
- **前端**: HTML5 + CSS3 + JavaScript (原生)

## 📋 系統需求

- Ubuntu 20.04+ 或其他 Linux 發行版
- Node.js 16+
- PostgreSQL 13+
- Nginx 1.18+

## 🔐 預設管理員帳號

```
帳號: M1423013
密碼: admin5612
```

**⚠️ 重要**: 首次登入後請立即變更密碼！

## 📝 授權

MIT License

## 👥 貢獻

歡迎提交 Issue 和 Pull Request！

## 📧 聯絡

如有問題請建立 Issue。
