import { Film } from 'lucide-react';

export default function ResultViewer({ videoUrl }) {
    if (!videoUrl) return null;

    return (
        /* Khung ngoài giả lập GroupBox / Panel trong Windows Form */
        <div className="overflow-hidden rounded border border-gray-300 bg-white shadow-sm">
            
            {/* Thanh tiêu đề (Title Bar) của Panel: Nền xám nhạt, viền dưới rõ ràng */}
            <div className="flex items-center gap-2 border-b border-gray-300 bg-gray-100 px-4 py-2">
                <Film className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-gray-800">Kết quả phân tích Video</span>
            </div>
            
            {/* Vùng phát Video (Media Control) */}
            {/* Trong các phần mềm Desktop, vùng chiếu video luôn có nền đen để làm nổi bật khung hình */}
            <div className="bg-black flex justify-center">
                {/* videoUrl giờ là URL Supabase Storage đầy đủ - dùng trực tiếp,
                    không cần ghép thêm địa chỉ AI Service như luồng cũ nữa */}
                <video 
                    controls 
                    src={videoUrl} 
                    className="w-full max-h-[500px] object-contain" 
                />
            </div>
            
            {/* Thanh trạng thái nhỏ (Status Bar) mô phỏng ở dưới đáy (Tùy chọn thêm cho ngầu) */}
            <div className="border-t border-gray-300 bg-gray-50 px-3 py-1 flex justify-end">
                <span className="text-[10px] text-gray-500 font-mono">Trạng thái: Đã tải xong</span>
            </div>
        </div>
    );
}