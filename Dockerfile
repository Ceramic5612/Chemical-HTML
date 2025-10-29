# 化學品配方管理系統 - Docker 映像檔
FROM node:18-alpine

# 安裝系統依賴（sharp 需要）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝 Node 依賴
RUN npm ci --only=production

# 複製應用程式檔案
COPY . .

# 建立上傳目錄
RUN mkdir -p /app/uploads/experiments

# 設定權限
RUN chown -R node:node /app

# 切換到非 root 使用者
USER node

# 暴露埠
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用程式
CMD ["node", "server.js"]
