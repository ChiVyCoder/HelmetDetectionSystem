const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('../config/config');

/**
 * Gửi file video sang AI Service (Python/FastAPI) để xử lý detection.
 * Trả về { video_url, stats } từ AI Service.
 */
async function analyzeVideoWithAI(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(
        `${config.AI_SERVICE_URL}/analyze_video`,
        form,
        {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 10 * 60 * 1000, // 10 phút - video xử lý có thể mất vài phút
        }
    );

    return response.data;
}

/**
 * Kiểm tra AI Service còn hoạt động không (dùng cho health check / debug).
 */
async function checkAIServiceHealth() {
    try {
        const response = await axios.get(`${config.AI_SERVICE_URL}/health`, { timeout: 5000 });
        return response.data;
    } catch (error) {
        return { status: 'unreachable', error: error.message };
    }
}

module.exports = { analyzeVideoWithAI, checkAIServiceHealth };
