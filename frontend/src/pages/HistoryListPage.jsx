import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileVideo, ChevronRight, History as HistoryIcon, AlertCircle, Loader2 } from 'lucide-react';
import { getAnalysisHistory } from '../services/api';

// Bổ sung second (giây) vào thời gian để giống log hệ thống
function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function ViolationRateBadge({ value }) {
    if (value == null) return <span className="font-mono text-xs text-gray-500">—</span>;
    
    // Đổi tone màu sang hệ Light Theme chuẩn (nhạt ở nền, đậm ở chữ và viền)
    let tone = '';
    if (value >= 50) {
        tone = 'border-red-300 bg-red-50 text-red-700'; // Đỏ: Báo động
    } else if (value >= 20) {
        tone = 'border-yellow-300 bg-yellow-50 text-yellow-700'; // Vàng: Cảnh báo
    } else {
        tone = 'border-green-300 bg-green-50 text-green-700'; // Xanh: An toàn
    }

    return (
        /* Dùng rounded (bo góc vuông vức) thay vì rounded-full */
        <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-xs font-bold shadow-sm ${tone}`}>
            {value}% vi phạm
        </span>
    );
}

export default function HistoryListPage() {
    const [items, setItems] = useState(null); // null = đang tải
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const data = await getAnalysisHistory();
                if (!cancelled) setItems(data);
            } catch (err) {
                if (!cancelled) setError('Không tải được cơ sở dữ liệu lịch sử. Vui lòng kiểm tra kết nối máy chủ.');
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        /* Thu hẹp khoảng cách tổng thể (space-y-4) */
        <div className="space-y-4">
            
            {/* Header: Có gạch chân mờ để phân tách rõ ràng với khu vực Data */}
            <div className="flex items-center gap-2 border-b border-gray-300 pb-2 text-gray-800">
                <HistoryIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">Nhật ký Phân tích Dữ liệu</h2>
            </div>

            {/* Error MessageBox */}
            {error && (
                <div className="flex items-center gap-3 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Loading Status */}
            {items == null && !error && (
                <div className="flex items-center gap-3 rounded border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0 text-blue-600" />
                    <span className="font-semibold">Đang truy vấn dữ liệu lịch sử...</span>
                </div>
            )}

            {/* Empty State */}
            {items && items.length === 0 && (
                <div className="rounded border border-dashed border-gray-400 bg-gray-50 px-5 py-12 text-center text-sm italic text-gray-500">
                    Chưa có tập tin video nào được phân tích trên hệ thống.
                </div>
            )}

            {/* Data ListView */}
            {items && items.length > 0 && (
                <div className="overflow-hidden rounded border border-gray-300 bg-white shadow-sm">
                    {/* Dùng đường chia ngang màu xám nhạt thay vì xám đen */}
                    <div className="divide-y divide-gray-200">
                        {items.map((item) => (
                            <Link
                                key={item.id}
                                to={`/history/${item.id}`}
                                /* group: Để bắt sự kiện hover cho các thành phần con bên trong */
                                /* Hiệu ứng Selection Highlights của Windows: Nền xanh nhạt */
                                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-blue-50"
                            >
                                {/* Khung Icon File */}
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-100 text-blue-600 transition-colors group-hover:border-blue-300 group-hover:bg-white">
                                    <FileVideo className="h-5 w-5" />
                                </div>

                                {/* Thông tin chi tiết */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                        {item.original_name || 'video_unknown.mp4'}
                                    </p>
                                    <p className="mt-1 font-mono text-xs text-gray-500">
                                        {formatDateTime(item.processed_at)}
                                    </p>
                                </div>

                                <ViolationRateBadge value={item.violation_rate_percent} />

                                {/* Icon mũi tên chuyển màu xanh khi Hover */}
                                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}