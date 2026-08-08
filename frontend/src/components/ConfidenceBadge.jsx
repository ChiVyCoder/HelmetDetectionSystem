export default function ConfidenceBadge({ value, label }) {
    if (value == null) {
        return <span className="text-xs text-slate-600">{label ? `${label}: —` : '—'}</span>;
    }

    const pct = Math.round(value * 100);
    const tone =
        pct >= 60
            ? 'border-emerald-800 bg-emerald-950 text-emerald-400'
            : pct >= 40
            ? 'border-amber-800 bg-amber-950 text-amber-400'
            : 'border-rose-800 bg-rose-950 text-rose-400';

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs font-semibold ${tone}`}>
            {label ? `${label} ${pct}%` : `${pct}%`}
        </span>
    );
}
