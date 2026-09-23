import { AlertTriangle } from 'lucide-react';
import PlateChip from './PlateChip';
import ConfidenceBadge from './ConfidenceBadge';

export default function ViolationList({ events }) {
    return (
        /* Outer Panel: Khung viền xám, nền trắng chuẩn WinForms */
        <div className="flex flex-col overflow-hidden rounded border border-gray-300 bg-white shadow-sm">
            
            {/* Title Bar: Thanh tiêu đề màu xám nhạt */}
            <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2 text-gray-800">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-bold">Danh sách vi phạm</span>
                </div>
                
                {/* Badge đếm số lượng: Nền đỏ nhạt, viền đỏ, chữ đậm */}
                <span className="rounded border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-xs font-bold text-red-700 shadow-sm">
                    {events.length}
                </span>
            </div>

            {/* Trạng thái trống (Empty State) */}
            {events.length === 0 ? (
                <div className="flex min-h-[150px] items-center justify-center bg-gray-50">
                    <p className="text-sm italic text-gray-500">Chưa phát hiện vi phạm nào.</p>
                </div>
            ) : (
                /* Khu vực chứa danh sách: Đổ màu nền xám nhạt (gray-50) để làm nổi bật các thẻ (card) màu trắng bên trong */
                <div className="max-h-[520px] space-y-2 overflow-y-auto bg-gray-50 p-3">
                    {events.map((e, idx) => (
                        <div
                            key={e.track_id ?? idx}
                            /* Item trong ListBox: Nền trắng. Khi hover sẽ đổi sang viền xanh/nền xanh nhạt hệt như hiệu ứng chọn dòng của Windows */
                            className="flex items-center gap-3 rounded border border-gray-300 bg-white p-3 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50"
                        >
                            <div className="min-w-0 flex-1">
                                {/* Dòng mã ID và thời gian */}
                                <div className="flex items-center gap-2 font-mono text-xs">
                                    <span className="font-bold text-gray-900">
                                        #{String(e.track_id ?? idx).padStart(4, '0')}
                                    </span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-gray-600">
                                        {e.timestamp_sec != null ? `Tại ${e.timestamp_sec}s` : '—'}
                                    </span>
                                </div>
                                
                                {/* Các nhãn độ tin cậy (Confidence Badges) */}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <ConfidenceBadge value={e.confidence} label="Nón" />
                                    <ConfidenceBadge value={e.plate_confidence} label="OCR" />
                                </div>
                            </div>
                            
                            {/* Khung hiển thị ảnh biển số */}
                            <PlateChip text={e.plate_text} imageUrl={e.plate_image_url} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}