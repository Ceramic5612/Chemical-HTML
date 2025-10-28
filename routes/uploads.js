const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');

// 允許的檔案類型
const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    data: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
    document: ['application/pdf']
};

// 檔案大小限制
const MAX_FILE_SIZE_IMAGE = parseInt(process.env.MAX_FILE_SIZE_IMAGE) || 10485760; // 10MB
const MAX_FILE_SIZE_DATA = parseInt(process.env.MAX_FILE_SIZE_DATA) || 52428800; // 50MB

// Multer 設定
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE_DATA
    }
});

// 取得檔案類型
function getFileType(mimeType) {
    if (ALLOWED_TYPES.image.includes(mimeType)) return 'image';
    if (ALLOWED_TYPES.data.includes(mimeType)) return 'data';
    if (ALLOWED_TYPES.document.includes(mimeType)) return 'document';
    return null;
}

// 建立目錄結構
async function createUploadDir(basePath) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const dirPath = path.join(basePath, 'experiments', String(year), month);
    const originalPath = path.join(dirPath, 'original');
    const thumbnailPath = path.join(dirPath, 'thumbnails');
    
    await fs.mkdir(originalPath, { recursive: true });
    await fs.mkdir(thumbnailPath, { recursive: true });
    
    return { originalPath, thumbnailPath, relativePath: path.join('experiments', String(year), month) };
}

// ============================================
// 上傳檔案
// ============================================
router.post('/:experimentId',
    requireAuth,
    upload.array('files', parseInt(process.env.MAX_FILES_PER_EXPERIMENT) || 20),
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: '請選擇檔案' });
            }

            const experimentId = req.params.experimentId;
            const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
            const uploadedFiles = [];

            for (const file of req.files) {
                const fileType = getFileType(file.mimetype);
                
                if (!fileType) {
                    console.log(`檔案類型不支援: ${file.mimetype}`);
                    continue;
                }

                // 檢查檔案大小
                if (fileType === 'image' && file.size > MAX_FILE_SIZE_IMAGE) {
                    console.log(`圖片檔案過大: ${file.size} bytes`);
                    continue;
                }

                // 建立目錄
                const { originalPath, thumbnailPath, relativePath } = await createUploadDir(uploadPath);

                // 生成檔名
                const timestamp = Date.now();
                const uuid = uuidv4();
                const ext = path.extname(file.originalname);
                const storedName = `${uuid}_${timestamp}${ext}`;
                const filePath = path.join(originalPath, storedName);
                const relativeFilePath = path.join(relativePath, 'original', storedName);

                // 儲存檔案
                if (fileType === 'image') {
                    // 圖片壓縮
                    await sharp(file.buffer)
                        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toFile(filePath);

                    // 生成縮圖
                    const thumbnailName = `${uuid}_${timestamp}_thumb${ext}`;
                    const thumbnailFullPath = path.join(thumbnailPath, thumbnailName);
                    const relativeThumbnailPath = path.join(relativePath, 'thumbnails', thumbnailName);

                    await sharp(file.buffer)
                        .resize(300, 300, { fit: 'cover' })
                        .jpeg({ quality: 80 })
                        .toFile(thumbnailFullPath);

                    // 插入資料庫
                    const result = await query(
                        `INSERT INTO experiment_attachments 
                         (experiment_id, file_original_name, file_stored_name, file_path, 
                          file_type, mime_type, file_size, thumbnail_path, description)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                         RETURNING id`,
                        [experimentId, file.originalname, storedName, relativeFilePath,
                         fileType, file.mimetype, file.size, relativeThumbnailPath, req.body.description || null]
                    );

                    uploadedFiles.push({
                        id: result.rows[0].id,
                        originalName: file.originalname,
                        storedName,
                        path: relativeFilePath,
                        thumbnailPath: relativeThumbnailPath,
                        type: fileType
                    });
                } else {
                    // 非圖片檔案直接儲存
                    await fs.writeFile(filePath, file.buffer);

                    const result = await query(
                        `INSERT INTO experiment_attachments 
                         (experiment_id, file_original_name, file_stored_name, file_path, 
                          file_type, mime_type, file_size, description)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         RETURNING id`,
                        [experimentId, file.originalname, storedName, relativeFilePath,
                         fileType, file.mimetype, file.size, req.body.description || null]
                    );

                    uploadedFiles.push({
                        id: result.rows[0].id,
                        originalName: file.originalname,
                        storedName,
                        path: relativeFilePath,
                        type: fileType
                    });
                }
            }

            res.json({
                message: `成功上傳 ${uploadedFiles.length} 個檔案`,
                files: uploadedFiles
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: '檔案上傳失敗' });
        }
    }
);

module.exports = router;
