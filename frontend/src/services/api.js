import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export async function uploadAndAnalyzeVideo(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('video', file);

    const response = await axios.post(`${BACKEND_URL}/api/video/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
        timeout: 10 * 60 * 1000,
    });

    return response.data;
}

export async function getAnalysisHistory() {
    const response = await axios.get(`${BACKEND_URL}/api/video/history`);
    return response.data;
}

export async function getAnalysisById(id) {
    const response = await axios.get(`${BACKEND_URL}/api/video/history/${id}`);
    return response.data;
}

export async function getHealthStatus() {
    const response = await axios.get(`${BACKEND_URL}/api/video/health`);
    return response.data;
}

// Lưu ý: KHÔNG còn hàm resolveVideoUrl nữa. Từ khi tích hợp Supabase Storage,
// Backend luôn trả về videoUrl là URL Supabase ĐẦY ĐỦ (dùng được trực tiếp),
// không còn là đường dẫn tương đối cần ghép thêm AI_SERVICE_URL như trước.
