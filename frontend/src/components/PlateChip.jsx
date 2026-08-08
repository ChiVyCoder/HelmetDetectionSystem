export default function PlateChip({ text, imageUrl }) {
    // Có ảnh crop thật (model đã tìm thấy vị trí biển số, dù OCR đọc được hay không)
    // -> hiển thị TRỰC TIẾP ảnh gốc, không bắt người dùng bấm thêm link mới xem được.
    // Text OCR (nếu có) hiện như phụ đề bên dưới ảnh, giúp đối chiếu nhanh 1 lần nhìn.
    if (imageUrl) {
        return (
            <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Nhấn để xem ảnh cỡ lớn"
                className="flex h-12 w-28 shrink-0 flex-col overflow-hidden rounded-md border-2 border-slate-900 bg-black shadow-inner transition-opacity hover:opacity-90"
            >
                <img src={imageUrl} alt="Ảnh biển số vi phạm" className="h-8 w-full object-contain" />
                <div className={`flex h-4 items-center justify-center ${text ? 'bg-white' : 'bg-slate-900'}`}>
                    <span
                        className={`font-mono text-[10px] font-semibold tracking-wide ${
                            text ? 'text-slate-900' : 'italic text-slate-500'
                        }`}
                    >
                        {text || 'Chưa đọc được'}
                    </span>
                </div>
            </a>
        );
    }

    // Không có ảnh - model chưa từng tìm thấy vị trí biển số nào trong khung xe này
    return (
        <div className="flex h-12 w-28 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-slate-700 bg-slate-900">
            <span className="text-xs italic text-slate-500">Chưa đọc được</span>
        </div>
    );
}