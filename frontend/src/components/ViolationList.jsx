import { AlertTriangle } from 'lucide-react';
import PlateChip from './PlateChip';
import ConfidenceBadge from './ConfidenceBadge';

export default function ViolationList({ events }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <div className="flex items-center gap-2 text-slate-300">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span className="text-sm font-medium">Khoảnh khắc vi phạm</span>
                </div>
                <span className="rounded-full border border-rose-800 bg-rose-950 px-2 py-0.5 font-mono text-xs font-semibold text-rose-400">
                    {events.length}
                </span>
            </div>

            {events.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Không phát hiện vi phạm nào.</p>
            ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
                    {events.map((e, idx) => (
                        <div
                            key={e.track_id ?? idx}
                            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 transition-colors hover:border-slate-700"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                                    <span className="text-slate-300">
                                        #{String(e.track_id ?? idx).padStart(4, '0')}
                                    </span>
                                    <span className="text-slate-700">·</span>
                                    <span>{e.timestamp_sec != null ? `${e.timestamp_sec}s` : '—'}</span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <ConfidenceBadge value={e.confidence} label="Nón" />
                                    <ConfidenceBadge value={e.plate_confidence} label="OCR" />
                                </div>
                            </div>
                            <PlateChip text={e.plate_text} imageUrl={e.plate_image_url} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
