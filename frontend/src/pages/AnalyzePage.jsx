import { useState } from 'react';
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
            setError(err.response?.data?.error || 'Có lỗi xảy ra khi xử lý video');
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div className="space-y-6">
            <UploadPanel onAnalyze={handleAnalyze} isProcessing={isProcessing} />

            {isProcessing && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                    Đang phân tích video, quá trình này có thể mất 1-3 phút...
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-800 bg-rose-950 px-5 py-4 text-sm text-rose-400">
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-6">
                    <KpiStrip stats={result.stats} />
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <ResultViewer videoUrl={result.videoUrl} />
                        </div>
                        <ViolationList events={result.stats.violation_events || []} />
                    </div>
                </div>
            )}
        </div>
    );
}
