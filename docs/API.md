# API 文件

## 基礎資訊

**Base URL**: `/api`

**認證方式**: Session-based (Cookie)

**Content-Type**: `application/json`

---

## 認證 API

### 登入
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "M1423013",
  "password": "admin5612"
}
```

**成功回應 (200)**:
```json
{
  "message": "登入成功",
  "user": {
    "id": 1,
    "username": "M1423013",
    "role": "admin",
    "fullName": "系統管理員",
    "email": "admin@chemistry.local"
  }
}
```

### 登出
```http
POST /api/auth/logout
```

### 檢查登入狀態
```http
GET /api/auth/status
```

### 變更密碼
```http
POST /api/auth/change-password
Content-Type: application/json

{
  "oldPassword": "old_password",
  "newPassword": "new_password"
}
```

---

## 配方 API

### 取得配方列表
```http
GET /api/formulas?page=1&limit=20&search=KOH&publicOnly=false
```

**Query 參數**:
- `page`: 頁碼 (預設: 1)
- `limit`: 每頁筆數 (預設: 20, 最大: 100)
- `search`: 搜尋關鍵字
- `tags`: 標籤篩選 (逗號分隔)
- `category`: 類別篩選
- `publicOnly`: 僅公開配方 (true/false)

**成功回應 (200)**:
```json
{
  "formulas": [
    {
      "id": 1,
      "name": "KOH 電解液",
      "description": "用於電化學實驗",
      "total_volume": 500.00,
      "is_public": true,
      "tags": ["電解液", "鹼性"],
      "category": "電解液",
      "created_at": "2025-01-15T10:00:00Z",
      "creator": "M1423013",
      "experiment_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 取得配方詳情
```http
GET /api/formulas/:id
```

**成功回應 (200)**:
```json
{
  "id": 1,
  "name": "KOH 電解液",
  "description": "用於電化學實驗",
  "total_volume": 500.00,
  "is_public": true,
  "tags": ["電解液", "鹼性"],
  "category": "電解液",
  "created_at": "2025-01-15T10:00:00Z",
  "creator": "M1423013",
  "creator_name": "系統管理員",
  "ingredients": [
    {
      "id": 1,
      "chemical_name": "KOH",
      "target_concentration": 0.5000,
      "raw_concentration": 85.00,
      "molecular_weight": 56.11,
      "calculated_mass": 16.5300,
      "sequence_order": 1,
      "notes": null
    }
  ],
  "experiment_count": 5
}
```

### 建立配方
```http
POST /api/formulas
Content-Type: application/json

{
  "name": "KOH 電解液",
  "description": "用於電化學實驗",
  "totalVolume": 500,
  "isPublic": false,
  "tags": ["電解液", "鹼性"],
  "category": "電解液",
  "ingredients": [
    {
      "chemicalName": "KOH",
      "targetConcentration": 0.5,
      "rawConcentration": 85,
      "molecularWeight": 56.11,
      "notes": ""
    }
  ]
}
```

**成功回應 (201)**:
```json
{
  "message": "配方建立成功",
  "formulaId": 1
}
```

### 更新配方
```http
PUT /api/formulas/:id
Content-Type: application/json

{
  "name": "KOH 電解液 (更新)",
  "description": "更新的描述",
  "isPublic": true,
  "tags": ["電解液", "鹼性", "高純度"],
  "category": "電解液"
}
```

### 刪除配方 (軟刪除)
```http
DELETE /api/formulas/:id
```

---

## 實驗記錄 API

### 建立實驗記錄
```http
POST /api/experiments
Content-Type: application/json

{
  "formulaId": 1,
  "experimentDate": "2025-01-20T14:00:00Z",
  "title": "電導率測試",
  "environment": {
    "temperature": 25,
    "humidity": 60,
    "pressure": 1013
  },
  "results": "電導率: 85.3 mS/cm",
  "observations": "溶液澄清透明",
  "conclusion": "符合預期",
  "successLevel": 5
}
```

### 取得實驗記錄列表
```http
GET /api/experiments?formulaId=1
```

### 取得實驗記錄詳情
```http
GET /api/experiments/:id
```

---

## 檔案上傳 API

### 上傳實驗附件
```http
POST /api/uploads/:experimentId
Content-Type: multipart/form-data

files: [File, File, ...]
description: "檔案描述"
```

**成功回應 (200)**:
```json
{
  "message": "成功上傳 3 個檔案",
  "files": [
    {
      "id": 1,
      "originalName": "experiment_photo.jpg",
      "storedName": "a1b2c3d4_1706446800000.jpg",
      "path": "experiments/2025/01/original/a1b2c3d4_1706446800000.jpg",
      "thumbnailPath": "experiments/2025/01/thumbnails/a1b2c3d4_1706446800000_thumb.jpg",
      "type": "image"
    }
  ]
}
```

---

## 管理員 API

### 取得所有使用者
```http
GET /api/admin/users
```

**權限**: 僅管理員

### 建立使用者
```http
POST /api/admin/users
Content-Type: application/json

{
  "username": "student1",
  "password": "Student123",
  "role": "student",
  "email": "student1@example.com",
  "fullName": "測試學生"
}
```

**權限**: 僅管理員

### 停用/啟用使用者
```http
PATCH /api/admin/users/:id/toggle-active
```

**權限**: 僅管理員

### 取得已刪除項目
```http
GET /api/admin/deleted-items?type=formulas
```

**權限**: 僅管理員

### 恢復已刪除項目
```http
POST /api/admin/restore/:type/:id
```

**權限**: 僅管理員

### 取得系統統計
```http
GET /api/admin/statistics
```

**權限**: 僅管理員

**成功回應 (200)**:
```json
{
  "users": 25,
  "formulas": 150,
  "experiments": 320,
  "publicFormulas": 45
}
```

---

## 使用者 API

### 取得個人資料
```http
GET /api/users/profile
```

---

## 錯誤回應

### 401 Unauthorized
```json
{
  "error": "請先登入"
}
```

### 403 Forbidden
```json
{
  "error": "權限不足"
}
```

### 404 Not Found
```json
{
  "error": "資源不存在"
}
```

### 400 Bad Request
```json
{
  "error": "請求參數錯誤",
  "errors": [
    {
      "field": "username",
      "message": "使用者名稱不能為空"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "error": "伺服器錯誤,請稍後再試"
}
```

---

## 速率限制

- **一般 API**: 100 請求 / 15 分鐘
- **登入 API**: 5 請求 / 15 分鐘

超過限制會返回 `429 Too Many Requests`

---

## 檔案上傳限制

- **圖片**: 最大 10 MB
- **數據檔案**: 最大 50 MB
- **每次實驗**: 最多 20 個檔案

支援的檔案類型:
- 圖片: JPG, PNG, GIF, WEBP
- 數據: CSV, XLSX, TXT
- 文件: PDF
