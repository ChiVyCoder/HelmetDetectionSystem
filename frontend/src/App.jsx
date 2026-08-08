import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { ShieldAlert, Clock3, ScanLine, History as HistoryIcon } from 'lucide-react';
import AnalyzePage from './pages/AnalyzePage';
import HistoryListPage from './pages/HistoryListPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import { getHealthStatus } from './services/api';

function useClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

// Kiểm tra trạng thái AI Service THẬT qua endpoint /api/video/health đã có sẵn
// trong backend  - tự động kiểm tra lại mỗi 15s.
function useHealthStatus() {
    const [health, setHealth] = useState(null); // null = đang kiểm tra lần đầu

    useEffect(() => {
        let cancelled = false;

        async function check() {
            try {
                const data = await getHealthStatus();
                if (!cancelled) setHealth(data);
            } catch {
                if (!cancelled) setHealth({ backend: 'unreachable' });
            }
        }

        check();
        const id = setInterval(check, 15000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    return health;
}

function NavTab({ to, icon: Icon, label }) {
    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                        ? 'bg-amber-950 text-amber-400'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
            }
        >
            <Icon className="h-4 w-4" />
            {label}
        </NavLink>
    );
}

export default function App() {
    const now = useClock();
    const health = useHealthStatus();

    const aiOnline = health?.ai_service?.status === 'ok';
    const statusLabel =
        health == null ? 'Đang kiểm tra...' : aiOnline ? 'AI Service: Sẵn sàng' : 'AI Service: Ngoại tuyến';
    const statusTone =
        health == null
            ? 'border-slate-700 bg-slate-900 text-slate-400'
            : aiOnline
            ? 'border-emerald-800 bg-emerald-950 text-emerald-400'
            : 'border-rose-800 bg-rose-950 text-rose-400';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <header className="border-b border-slate-800">
                <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-800 bg-amber-950">
                            <ShieldAlert className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-slate-50">
                                Hệ thống phát hiện người không đội nón bảo hiểm
                            </h1>
                            <p className="text-xs text-slate-500">Tải video giao thông lên để phân tích tự động</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-400 sm:flex">
                            <Clock3 className="h-3.5 w-3.5" />
                            {now.toLocaleTimeString('vi-VN', { hour12: false })}
                        </div>

                        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${statusTone}`}>
                            <span className="relative flex h-2 w-2">
                                {aiOnline && (
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                )}
                                <span
                                    className={`relative inline-flex h-2 w-2 rounded-full ${
                                        aiOnline ? 'bg-emerald-400' : 'bg-current'
                                    }`}
                                />
                            </span>
                            <span className="text-xs font-medium">{statusLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Thanh điều hướng giữa trang phân tích và trang lịch sử */}
                <div className="mx-auto flex max-w-screen-2xl gap-1 px-6 pb-3 lg:px-10">
                    <NavTab to="/" icon={ScanLine} label="Phân tích" />
                    <NavTab to="/history" icon={HistoryIcon} label="Lịch sử" />
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-6 py-6 lg:px-[14rem]">
                <Routes>
                    <Route path="/" element={<AnalyzePage />} />
                    <Route path="/history" element={<HistoryListPage />} />
                    <Route path="/history/:id" element={<HistoryDetailPage />} />
                </Routes>
            </main>
        </div>
    );
}
