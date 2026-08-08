import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileVideo, ChevronRight, History as HistoryIcon } from 'lucide-react';
import { getAnalysisHistory } from '../services/api';

function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ViolationRateBadge({ value }) {
    if (value == null) return <span className="text-xs text-slate-600">—</span>;
    const tone =
        value >= 50
            ? 'border-rose-800 bg-rose-950 text-rose-400'
            : value >= 20
            ? 'border-amber-800 bg-amber-950 text-amber-400'
            : 'border-emerald-800 bg-emerald-950 text-emerald-400';
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-xs font-semibold ${tone}`}>
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
                if (!cancelled) setError('Không tải được lịch sử. Kiểm tra kết nối Backend/Supabase.');
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-300">
                <HistoryIcon className="h-5 w-5 text-amber-400" />
                <h2 className="font-display text-lg font-semibold text-slate-50">Lịch sử phân tích</h2>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-800 bg-rose-950 px-5 py-4 text-sm text-rose-400">
                    {error}
                </div>
            )}

            {items == null && !error && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                    Đang tải lịch sử...
                </div>
            )}

            {items && items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 px-5 py-12 text-center text-sm text-slate-500">
                    Chưa có video nào được phân tích.
                </div>
            )}

            {items && items.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
                    <div className="divide-y divide-slate-800">
                        {items.map((item) => (
                            <Link
                                key={item.id}
                                to={`/history/${item.id}`}
                                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-950"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-500">
                                    <FileVideo className="h-5 w-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-200">
                                        {item.original_name || 'video.mp4'}
                                    </p>
                                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                                        {formatDateTime(item.processed_at)}
                                    </p>
                                </div>

                                <ViolationRateBadge value={item.violation_rate_percent} />

                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
