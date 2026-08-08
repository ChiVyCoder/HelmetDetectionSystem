import { Camera } from 'lucide-react';

export default function ResultViewer({ videoUrl }) {
    if (!videoUrl) return null;

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3 text-slate-300">
                <Camera className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Kết quả phân tích</span>
            </div>
            <div className="bg-slate-950">
                {/* videoUrl giờ là URL Supabase Storage đầy đủ - dùng trực tiếp,
                    không cần ghép thêm địa chỉ AI Service như luồng cũ nữa */}
                <video controls src={videoUrl} className="w-full" />
            </div>
        </div>
    );
}

