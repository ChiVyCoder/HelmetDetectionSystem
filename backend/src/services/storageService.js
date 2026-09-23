const axios = require('axios');
const { supabase, VIDEO_BUCKET } = require('../config/supabase');
const config = require('../config/config');

/**
 * Tải file video từ AI Service (đang serve tại /static/xxx.mp4) về dạng buffer,
 * rồi upload lên Supabase Storage. Trả về public URL vĩnh viễn.
 */
async function uploadVideoToStorage(aiServiceVideoUrl, aiServiceBaseUrl) {
    const fullUrl = `${aiServiceBaseUrl}${aiServiceVideoUrl}`;

    const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(response.data);

    const fileName = `result_${Date.now()}.mp4`;
    const storagePath = `processed/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(storagePath, videoBuffer, {
            contentType: 'video/mp4',  
            upsert: false,
        });

    if (uploadError) {
        console.log('Chi tiết lỗi đầy đủ:', uploadError);
        throw new Error(`Upload Supabase Storage thất bại: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);

    return {
        videoUrl: publicUrlData.publicUrl,
        storagePath,
    };
}

async function uploadPlateImageToStorage(plateImagePath, aiServiceBaseUrl) {
    if (!plateImagePath) return null;

    const fullUrl = `${aiServiceBaseUrl}${plateImagePath}`;
    const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    const fileName = plateImagePath.split('/').pop();
    const storagePath = `plates/${fileName}`;

    const { error } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(storagePath, imageBuffer, { contentType: 'image/jpeg', upsert: false });

    if (error) throw new Error(`Upload ảnh biển số thất bại: ${error.message}`);

    const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
}

/**
 * Lưu 1 record phân tích video + toàn bộ violation_events liên quan vào Supabase.
 */
async function saveAnalysisRecord({ originalName, videoUrl, storagePath, stats }) {
    // 1. Lưu bản ghi phân tích tổng quan
    const { data: analysis, error: analysisError } = await supabase
        .from('video_analyses')
        .insert([
            {
                original_name: originalName,
                video_url: videoUrl,
                video_storage_path: storagePath,
                with_helmet_count: stats.with_helmet_count ?? 0,
                without_helmet_count: stats.without_helmet_count ?? 0,
                unique_riders_tracked: stats.unique_riders_tracked ?? 0,
                violation_rate_percent: stats.violation_rate_percent ?? 0,
                // ---- Các trường thời gian & hiệu năng mới ----
                total_frames: stats.total_frames ?? 0,
                video_fps: stats.video_fps ?? 0,
                video_duration_sec: stats.video_duration_sec ?? 0,
                video_duration_formatted: stats.video_duration_formatted ?? '00:00',
                total_processing_time_sec: stats.total_processing_time_sec ?? 0,
                total_processing_time_formatted: stats.total_processing_time_formatted ?? '00:00',
                avg_ms_per_frame: stats.avg_ms_per_frame ?? 0,
                processing_fps: stats.processing_fps ?? 0,
                speed_factor: stats.speed_factor ?? 0,
                processed_at: new Date().toISOString()
            }
        ])
        .select()
        .single();

    if (analysisError) throw analysisError;

    // 2. Lưu danh sách vi phạm (violation_events) nếu có
    let violationEvents = [];
    if (stats.violation_events && stats.violation_events.length > 0) {
        const eventsToInsert = stats.violation_events.map((e) => ({
            analysis_id: analysis.id,
            track_id: e.track_id,
            timestamp_sec: e.timestamp_sec,
            confidence: e.confidence,
            plate_text: e.plate_text,
            plate_confidence: e.plate_confidence,
            box: e.box,
            plate_image_url: e.plate_image_url || null
        }));

        const { data: insertedEvents, error: eventsError } = await supabase
            .from('violation_events')
            .insert(eventsToInsert)
            .select();

        if (eventsError) throw eventsError;
        violationEvents = insertedEvents;
    }

    return { analysis, violationEvents };
}

/**
 * Lấy lịch sử các video đã xử lý, mới nhất trước.
 */
async function getHistory(limit = 20) {
    const { data, error } = await supabase
        .from('video_analyses')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`Lấy lịch sử thất bại: ${error.message}`);
    return data;
}

/**
 * Lấy đầy đủ 1 video đã xử lý (thống kê + toàn bộ violation_events),
 * dùng cho trang chi tiết lịch sử - trả về đúng shape "stats" mà
 * KpiStrip/ViolationList đang dùng ở trang phân tích chính.
 */
async function getAnalysisById(id) {
    const { data: analysis, error: analysisError } = await supabase
        .from('video_analyses')
        .select('*')
        .eq('id', id)
        .single();

    if (analysisError) throw new Error(`Không tìm thấy video: ${analysisError.message}`);

    const { data: events, error: eventsError } = await supabase
        .from('violation_events')
        .select('*')
        .eq('analysis_id', id)
        .order('timestamp_sec', { ascending: true });

    if (eventsError) throw new Error(`Lấy violation_events thất bại: ${eventsError.message}`);

    const result = {
    id: analysis.id,
    originalName: analysis.original_name,
    processedAt: analysis.processed_at,
    videoUrl: analysis.video_url,
    stats: {
        total_frames: analysis.total_frames,
        processing_time_sec: analysis.processing_time_sec,
        avg_ms_per_frame: analysis.avg_ms_per_frame,
        with_helmet_count: analysis.with_helmet_count,
        without_helmet_count: analysis.without_helmet_count,
        unique_riders_tracked: analysis.unique_riders_tracked,
        violation_rate_percent: analysis.violation_rate_percent,
        violation_events: (events || []).map((e) => ({
            track_id: e.track_id,
            timestamp_sec: e.timestamp_sec,
            confidence: e.confidence,
            plate_text: e.plate_text,
            plate_confidence: e.plate_confidence,
            box: e.box,
            plate_image_url: e.plate_image_url,
        })),
    },
};

return result;
}

/**
 * Tìm kiếm vi phạm theo biển số, XUYÊN SUỐT TẤT CẢ video đã xử lý.
 * Trả về kèm thông tin video gốc (join) để biết vi phạm đó thuộc video nào.
 */
async function searchByPlate(plateQuery) {
    const { data, error } = await supabase
        .from('violation_events')
        .select(`
            id, track_id, timestamp_sec, confidence, plate_text, plate_confidence,
            video_analyses ( id, original_name, video_url, processed_at )
        `)
        .ilike('plate_text', `%${plateQuery}%`)
        .order('timestamp_sec', { ascending: false })
        .limit(50);

    if (error) throw new Error(`Tìm kiếm biển số thất bại: ${error.message}`);
    return data;
}

module.exports = { uploadVideoToStorage, saveAnalysisRecord, getHistory, getAnalysisById, searchByPlate, uploadPlateImageToStorage };