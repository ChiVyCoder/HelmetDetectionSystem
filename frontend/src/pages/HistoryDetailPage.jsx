import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileVideo, AlertCircle, Loader2 } from 'lucide-react';
import ResultViewer from '../components/ResultViewer';
import KpiStrip from '../components/KpiStrip';
import ViolationList from '../components/ViolationList';
import { getAnalysisById } from '../services/api';

// Định dạng thời gian theo chuẩn hệ thống
function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit', // Thêm giây để giống log hệ thống hơn
    });
}

export default function HistoryDetailPage() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setAnalysis(null);
            setError(null);
            try {
                const data = await getAnalysisById(id);
                console.log('DEBUG - dữ liệu nhận từ API:', data);
                console.log('DEBUG - violation_events:', data.stats.violation_events);
                if (!cancelled) setAnalysis(data);
            } catch (err) {
                if (!cancelled) setError('Không tìm thấy tệp video này trong cơ sở dữ liệu, hoặc đã bị xóa.');
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        /* Giảm khoảng cách giữa các control để tạo cảm giác phần mềm PC */
        <div className="space-y-4">
            
            {/* Nút Back - Giả lập Navigation Link tiêu chuẩn */}
            <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-blue-700"
            >
                <ArrowLeft className="h-4 w-4" />
                Quay lại Danh sách Lịch sử
            </Link>

            {/* Hộp thoại thông báo lỗi (Error Dialog) */}
            {error && (
                <div className="flex items-center gap-3 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Trạng thái đang tải (Loading State) */}
            {!analysis && !error && (
                <div className="flex items-center gap-3 rounded border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
                    <span className="font-semibold">Đang truy xuất dữ liệu từ máy chủ...</span>
                </div>
            )}

            {/* Khu vực chi tiết dữ liệu (Main Content) */}
            {analysis && (
                <div className="space-y-4">
                    
                    {/* Header thông tin File (File Info Panel) */}
                    <div className="flex items-center gap-3 rounded border border-gray-300 bg-white p-3 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-blue-600">
                            <FileVideo className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {analysis.originalName || 'video_unknown.mp4'}
                            </h2>
                            <p className="font-mono text-xs text-gray-500">
                                Thời điểm phân tích: {formatDateTime(analysis.processedAt)}
                            </p>
                        </div>
                    </div>

                    {/* Dải KPI */}
                    <KpiStrip stats={analysis.stats} />

                    {/* Lưới bố cục (Video Player & ListView) */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <ResultViewer videoUrl={analysis.videoUrl} />
                        </div>
                        <div className="xl:col-span-1">
                            <ViolationList events={analysis.stats.violation_events || []} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}