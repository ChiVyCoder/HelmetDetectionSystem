require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5000,
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    MAX_UPLOAD_SIZE_MB: 100,
    UPLOAD_DIR: 'uploads',
};
