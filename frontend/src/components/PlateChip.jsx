import { CameraOff } from 'lucide-react';

export default function PlateChip({ text, imageUrl }) {
    if (imageUrl) {
        return (
            <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Nhấn để xem ảnh cỡ lớn"
                className="flex h-14 w-32 shrink-0 flex-col overflow-hidden rounded border border-gray-400 bg-gray-200 shadow-sm transition-opacity hover:opacity-80"
            >
                <img 
                    src={imageUrl} 
                    alt="Ảnh biển số vi phạm" 
                    className="h-9 w-full object-contain p-0.5" 
                />
                
                <div className={`flex flex-1 items-center justify-center border-t border-gray-300 ${text ? 'bg-white' : 'bg-gray-100'}`}>
                    <span
                        className={`font-mono text-[11px] ${
                            text 
                                ? 'font-bold uppercase tracking-widest text-gray-900' // Font đậm, giãn chữ giống biển số thật
                                : 'italic text-gray-500' // In nghiêng, mờ nếu không có text
                        }`}
                    >
                        {text || 'Chưa đọc được'}
                    </span>
                </div>
            </a>
        );
    }

    // Không có ảnh - Trạng thái trống (Empty State)
    return (
        /* Giả lập một vùng Control bị vô hiệu hóa (Disabled) hoặc chưa có dữ liệu */
        <div className="flex h-14 w-32 shrink-0 flex-col items-center justify-center gap-1 rounded border border-dashed border-gray-400 bg-gray-50">
            <CameraOff className="h-4 w-4 text-gray-400" />
            <span className="text-[10px] italic text-gray-500">Không có ảnh</span>
        </div>
    );
}