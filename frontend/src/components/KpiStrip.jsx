import { Users, ShieldCheck, ShieldAlert, Percent, Gauge } from 'lucide-react';

export default function KpiStrip({ stats }) {
    const items = [
        {
            label: 'Người theo dõi',
            value: stats.unique_riders_tracked ?? '—',
            icon: Users,
            tone: 'text-sky-400',
        },
        {
            label: 'Đội nón (tuân thủ)',
            value: stats.with_helmet_count ?? '—',
            icon: ShieldCheck,
            tone: 'text-emerald-400',
        },
        {
            label: 'Không đội nón',
            value: stats.without_helmet_count ?? '—',
            icon: ShieldAlert,
            tone: 'text-rose-400',
        },
        {
            label: 'Tỷ lệ vi phạm',
            value: stats.violation_rate_percent != null ? `${stats.violation_rate_percent}%` : '—',
            icon: Percent,
            tone: 'text-amber-400',
            emphasize: true,
        },
        {
            label: 'Tốc độ xử lý',
            value: stats.avg_ms_per_frame != null ? `${stats.avg_ms_per_frame} ms` : '—',
            icon: Gauge,
            tone: 'text-slate-300',
        },
    ];

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-800 shadow-lg">
            <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-3 lg:grid-cols-5">
                {items.map(({ label, value, icon: Icon, tone, emphasize }) => (
                    <div
                        key={label}
                        className={`flex flex-col gap-2 px-6 py-5 ${emphasize ? 'bg-slate-950' : 'bg-slate-900'}`}
                    >
                        <div className="flex items-center gap-2 text-slate-500">
                            <Icon className={`h-4 w-4 ${tone}`} />
                            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                        </div>
                        <span className={`font-display text-2xl font-semibold tabular-nums md:text-3xl ${tone}`}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
