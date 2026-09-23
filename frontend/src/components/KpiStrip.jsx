import { 
    Users, 
    ShieldCheck, 
    ShieldAlert, 
    Percent, 
    Zap, 
    Film 
} from 'lucide-react';

export default function KpiStrip({ stats = {}, performance = {} }) {
    // Hỗ trợ cả cấu trúc lồng mới (performance) lẫn cấu trúc phẳng cũ (stats gộp)
    const perf = { ...stats, ...performance };

    const items = [
        {
            label: 'Người theo dõi',
            value: stats.unique_riders_tracked ?? '—',
            subValue: 'tổng đối tượng nhận diện',
            icon: Users,
            tone: 'text-blue-700', // Đổi sang dải màu chuẩn của WinForms trên nền sáng
            iconTone: 'text-blue-600',
        },
        {
            label: 'Đội nón (tuân thủ)',
            value: stats.with_helmet_count ?? '—',
            subValue: 'chấp hành tốt',
            icon: ShieldCheck,
            tone: 'text-green-700',
            iconTone: 'text-green-600',
        },
        {
            label: 'Không đội nón',
            value: stats.without_helmet_count ?? '—',
            subValue: 'phát hiện vi phạm',
            icon: ShieldAlert,
            tone: 'text-red-700',
            iconTone: 'text-red-600',
        },
        {
            label: 'Tỷ lệ vi phạm',
            value: stats.violation_rate_percent != null ? `${stats.violation_rate_percent}%` : '—',
            subValue: 'trên tổng số người',
            icon: Percent,
            tone: 'text-orange-700',
            iconTone: 'text-orange-600',
            emphasize: true, // Ô này sẽ được làm nổi bật với nền màu khác
        },
        {
            label: 'Thời lượng video',
            value: perf.videoDurationFormatted || perf.video_duration_formatted || '—',
            subValue: perf.totalFrames || perf.total_frames ? `${perf.totalFrames || perf.total_frames} frames` : null,
            icon: Film,
            tone: 'text-purple-700',
            iconTone: 'text-purple-600',
        },
        {
            label: 'Thời gian xử lý AI',
            value: perf.totalProcessingTimeFormatted || perf.total_processing_time_formatted || (perf.total_processing_time_sec ? `${perf.total_processing_time_sec}s` : '—'),
            subValue: perf.speedFactor || perf.speed_factor ? `Tốc độ: ${perf.speedFactor || perf.speed_factor}x real-time` : (perf.avgMsPerFrame || perf.avg_ms_per_frame ? `${perf.avgMsPerFrame || perf.avg_ms_per_frame} ms/f` : null),
            icon: Zap,
            tone: 'text-teal-700',
            iconTone: 'text-teal-600',
        },
    ];

    return (
        /* Khung bo ngoài: Viền xám mỏng, bo góc rất nhẹ (rounded thay vì rounded-2xl) */
        <section className="overflow-hidden rounded border border-gray-300 shadow-sm">
            
            {/* Kỹ thuật kẻ bảng (DataGrid Layout): 
                Dùng nền bg-gray-300 kết hợp gap-px để tạo ra các đường viền 1px cực kỳ sắc nét giữa các ô */}
            <div className="grid grid-cols-2 gap-px bg-gray-300 sm:grid-cols-3 lg:grid-cols-6">
                
                {items.map(({ label, value, subValue, icon: Icon, tone, iconTone, emphasize }) => (
                    <div
                        key={label}
                        /* Nền mặc định là trắng (bg-white). Nếu là ô cần nhấn mạnh (Tỷ lệ vi phạm), chuyển sang màu cam nhạt */
                        className={`flex flex-col justify-between gap-2 px-4 py-3 ${
                            emphasize ? 'bg-orange-50' : 'bg-white'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-gray-600">
                            <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} />
                            <span className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-700">
                                {label}
                            </span>
                        </div>

                        <div className="mt-1 flex flex-col">
                            <span className={`font-display text-2xl font-bold tabular-nums md:text-3xl ${tone}`}>
                                {value}
                            </span>
                            {subValue && (
                                <span className="mt-0.5 truncate text-[11px] text-gray-500">
                                    {subValue}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}