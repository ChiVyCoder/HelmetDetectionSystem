import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileVideo } from 'lucide-react';
import ResultViewer from '../components/ResultViewer';
import KpiStrip from '../components/KpiStrip';
import ViolationList from '../components/ViolationList';
import { getAnalysisById } from '../services/api';

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
                if (!cancelled) setError('Không tìm thấy video này, hoặc đã bị xóa.');
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        <div className="space-y-6">
            <Link
                to="/history"
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-amber-400"
            >
                <ArrowLeft className="h-4 w-4" />
                Quay lại lịch sử
            </Link>

            {error && (
                <div className="rounded-2xl border border-rose-800 bg-rose-950 px-5 py-4 text-sm text-rose-400">
                    {error}
                </div>
            )}

            {!analysis && !error && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                    Đang tải chi tiết...
                </div>
            )}

            {analysis && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-500">
                            <FileVideo className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-semibold text-slate-50">
                                {analysis.originalName || 'video.mp4'}
                            </h2>
                            <p className="font-mono text-xs text-slate-500">
                                Phân tích lúc {formatDateTime(analysis.processedAt)}
                            </p>
                        </div>
                    </div>

                    <KpiStrip stats={analysis.stats} />

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <ResultViewer videoUrl={analysis.videoUrl} />
                        </div>
                        <ViolationList events={analysis.stats.violation_events || []} />
                    </div>
                </div>
            )}
        </div>
    );
}
