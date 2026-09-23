import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import UploadPanel from '../components/UploadPanel';
import ResultViewer from '../components/ResultViewer';
import KpiStrip from '../components/KpiStrip';
import ViolationList from '../components/ViolationList';
import { uploadAndAnalyzeVideo } from '../services/api';

export default function AnalyzePage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    async function handleAnalyze(file) {
        setIsProcessing(true);
        setError(null);
        setResult(null);
        try {
            const data = await uploadAndAnalyzeVideo(file);
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Có lỗi hệ thống xảy ra trong quá trình phân tích video.');
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        /* Giảm khoảng cách (space-y-6 -> space-y-4) để giao diện chặt chẽ hơn, giống phần mềm Desktop */
        <div className="space-y-4">
            
            {/* Tấm Panel Upload đã được thiết kế chuẩn Form */}
            <UploadPanel onAnalyze={handleAnalyze} isProcessing={isProcessing} />

            {/* Thông báo trạng thái đang xử lý (Mô phỏng Progress Dialog) */}
            {isProcessing && (
                <div className="flex items-center gap-3 rounded border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
                    <span className="font-semibold">
                        Hệ thống đang thực thi phân tích AI. Quá trình này có thể mất 1-3 phút tùy thuộc vào độ dài video...
                    </span>
                </div>
            )}

            {/* Hộp thoại thông báo lỗi (Mô phỏng Error MessageBox) */}
            {error && (
                <div className="flex items-center gap-3 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Khu vực Hiển thị Kết quả */}
            {result && (
                <div className="space-y-4">
                    {/* Thanh KPI Thống kê */}
                    <KpiStrip stats={result.stats} performance={result.performance} />
                    
                    {/* Bố cục Grid: Video chiếm 2 phần, Danh sách vi phạm chiếm 1 phần */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <ResultViewer videoUrl={result.videoUrl} />
                        </div>
                        <div className="xl:col-span-1">
                            <ViolationList events={result.stats.violation_events || []} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}