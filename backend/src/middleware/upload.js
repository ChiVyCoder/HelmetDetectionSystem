const multer = require('multer');
const path = require('path');
const config = require('../config/config');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file video (mp4, mov, avi)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
