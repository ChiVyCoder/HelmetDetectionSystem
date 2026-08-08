const fs = require('fs');
const { analyzeVideoWithAI, checkAIServiceHealth } = require('../services/aiService');
const {
    uploadVideoToStorage,
    saveAnalysisRecord,
    getHistory: getHistoryFromDB,
    getAnalysisById, 
    searchByPlate,
} = require('../services/storageService');
const config = require('../config/config');

async function analyzeVideo(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'Không có file video được upload' });
    }

    const filePath = req.file.path;

    try {
        // Bước 1: AI Service xử lý video (không đổi so với trước)
        const aiResult = await analyzeVideoWithAI(filePath);

        // Bước 2: Tải video đã xử lý về từ AI Service, upload lên Supabase Storage
        // để có URL vĩnh viễn (không phụ thuộc AI Service còn chạy hay không)
        const { videoUrl, storagePath } = await uploadVideoToStorage(
            aiResult.video_url,
            config.AI_SERVICE_URL
        );

        // Bước 3: Lưu thống kê + danh sách vi phạm vào Supabase Database
        const { analysis, violationEvents } = await saveAnalysisRecord({
            originalName: req.file.originalname,
            videoUrl,
            storagePath,
            stats: aiResult.stats,
        });

        return res.json({
            id: analysis.id,
            originalName: analysis.original_name,
            processedAt: analysis.processed_at,
            videoUrl: analysis.video_url,
            stats: {
                ...aiResult.stats,
                violation_events: violationEvents.map((e) => ({
                    track_id: e.track_id,
                    timestamp_sec: e.timestamp_sec,
                    confidence: e.confidence,
                    plate_text: e.plate_text,
                    plate_confidence: e.plate_confidence,
                    box: e.box,
                    plate_image_url: e.plate_image_url,   // ← URL thật, đã upload xong
                })),
            },
});
    } catch (error) {
        console.error('Lỗi xử lý video:', error.message);
        return res.status(502).json({
            error: 'Xử lý video thất bại (AI Service hoặc lưu trữ gặp lỗi).',
            detail: error.message,
        });
    } finally {
        fs.unlink(filePath, () => {});
    }
}

async function getHistory(req, res) {
    try {
        const history = await getHistoryFromDB();
        res.json(history);
    } catch (error) {
        console.error('Lỗi lấy lịch sử:', error.message);
        res.status(500).json({ error: 'Không lấy được lịch sử', detail: error.message });
    }
}

async function getAnalysisDetail(req, res) {
    try {
        const analysis = await getAnalysisById(req.params.id);
        if (!analysis) {
            return res.status(404).json({ error: 'Không tìm thấy video này' });
        }
        res.json(analysis);
    } catch (error) {
        console.error('Lỗi lấy chi tiết video:', error.message);
        res.status(500).json({ error: 'Không lấy được chi tiết video', detail: error.message });
    }
}

async function searchPlate(req, res) {
    const { plate } = req.query;
    if (!plate || plate.trim().length === 0) {
        return res.status(400).json({ error: 'Thiếu tham số tìm kiếm: plate' });
    }

    try {
        const results = await searchByPlate(plate.trim());
        res.json(results);
    } catch (error) {
        console.error('Lỗi tìm kiếm biển số:', error.message);
        res.status(500).json({ error: 'Tìm kiếm thất bại', detail: error.message });
    }
}

async function healthCheck(req, res) {
    const aiHealth = await checkAIServiceHealth();
    res.json({
        backend: 'ok',
        ai_service: aiHealth,
    });
}

module.exports = { analyzeVideo, getHistory, getAnalysisDetail, searchPlate, healthCheck };
