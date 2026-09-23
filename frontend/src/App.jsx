import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { ShieldAlert, Clock3, ScanLine, History as HistoryIcon, ZoomIn } from 'lucide-react';
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

// Kiểm tra trạng thái AI Service
function useHealthStatus() {
    const [health, setHealth] = useState(null);

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

// Thiết kế Tab mô phỏng lại Control Tab của Windows Form
function NavTab({ to, icon: Icon, label }) {
    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-t-[3px] border-x border-b ${
                    isActive
                        ? 'bg-white border-t-blue-600 border-x-gray-300 border-b-white text-blue-700 z-10 -mb-[1px]'
                        : 'bg-gray-100 border-t-transparent border-x-transparent border-b-gray-300 text-gray-600 hover:bg-gray-200'
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
        health == null ? 'Đang kiểm tra...' : aiOnline ? 'AI Service: Active' : 'AI Service: Offline';
    
    // Đổi màu trạng thái sang tone sáng (Light mode)
    const statusTone =
        health == null
            ? 'border-gray-300 bg-gray-100 text-gray-600'
            : aiOnline
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-red-300 bg-red-50 text-red-700';

    return (
        /* Nền xám nhạt đặc trưng của Windows Form (Control Color) */
        <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
            
            {/* Thanh Header mô phỏng thanh Title / Menu Bar của ứng dụng Desktop */}
            <header className="bg-white border-b border-gray-300 shadow-sm">
                <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
                    
                    {/* Logo và Tiêu đề */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-gray-300 bg-gray-50 shadow-sm">
                            <img src="https://res.cloudinary.com/dkzgfqj1n/image/upload/v1790175610/Gemini_Generated_Image_ang1rsang1rsang1_v0ledb.png" alt="Logo" className="h-8 w-8" style={{ objectFit: 'contain', zoom: '1.6' }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-800">
                                HỆ THỐNG PHÁT HIỆN NGƯỜI KHÔNG ĐỘI NÓN BẢO HIỂM
                            </h1>
                            <p className="text-sm text-gray-500">Module xử lý thị giác máy tính & Quản lý vi phạm</p>
                        </div>
                    </div>

                    {/* Tiện ích góc phải (Đồng hồ & Trạng thái) */}
                    <div className="flex items-center gap-4">
                        {/* <div className="hidden items-center gap-2 rounded border border-gray-300 bg-gray-50 px-3 py-1.5 font-mono text-sm text-gray-700 sm:flex shadow-sm">
                            <Clock3 className="h-4 w-4 text-gray-500" />
                            {now.toLocaleTimeString('vi-VN', { hour12: false })}
                        </div> */}

                        <div className={`flex items-center gap-2 rounded border px-3 py-1.5 shadow-sm ${statusTone}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {aiOnline && (
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                                )}
                                <span
                                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                                        aiOnline ? 'bg-green-600' : 'bg-current'
                                    }`}
                                />
                            </span>
                            <span className="text-sm font-semibold">{statusLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Khu vực Tabs - Nằm sát mép dưới của header */}
                <div className="mx-auto flex max-w-screen-2xl gap-1 px-6 pt-2 lg:px-10 border-b border-gray-300 bg-gray-50">
                    <NavTab to="/" icon={ScanLine} label="Phân tích Video" />
                    <NavTab to="/history" icon={HistoryIcon} label="Lịch sử Vi phạm" />
                </div>
            </header>

            {/* Vùng Content - Được đóng khung trắng giống một Panel trong WinForms */}
            <main className="mx-auto max-w-screen-2xl px-6 py-6 lg:px-10">
                <div className="bg-white border border-gray-300 shadow-sm rounded p-4 min-h-[75vh]">
                    <Routes>
                        <Route path="/" element={<AnalyzePage />} />
                        <Route path="/history" element={<HistoryListPage />} />
                        <Route path="/history/:id" element={<HistoryDetailPage />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}