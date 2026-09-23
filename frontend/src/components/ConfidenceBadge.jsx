import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export default function ConfidenceBadge({ value, label }) {
    // Trạng thái khi không có dữ liệu (Null state)
    if (value == null) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <HelpCircle className="h-3.5 w-3.5" />
                {label ? `${label}: —` : '—'}
            </span>
        );
    }

    const pct = Math.round(value * 100);
    
    // Cấu hình Tone màu sáng và Icon tương ứng
    let tone = '';
    let Icon = null;

    if (pct >= 60) {
        // Tin cậy cao: Xanh lá
        tone = 'border-green-300 bg-green-50 text-green-700';
        Icon = CheckCircle;
    } else if (pct >= 40) {
        // Tin cậy trung bình: Vàng cam
        tone = 'border-yellow-300 bg-yellow-50 text-yellow-700';
        Icon = AlertTriangle;
    } else {
        // Tin cậy thấp: Đỏ
        tone = 'border-red-300 bg-red-50 text-red-700';
        Icon = XCircle;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-xs font-semibold shadow-sm ${tone}`}>
            <Icon className="h-3.5 w-3.5" />
            <span>{label ? `${label} ${pct}%` : `${pct}%`}</span>
        </span>
    );
}