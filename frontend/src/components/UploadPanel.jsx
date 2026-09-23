import { useState, useRef } from 'react';
import { UploadCloud, FileVideo } from 'lucide-react';

export default function UploadPanel({ onAnalyze, isProcessing }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    }

    function handleDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('video/')) setSelectedFile(file);
    }

    return (
        /* Khung ngoài mô phỏng GroupBox trong Windows Form */
        <div className="flex flex-col gap-4 rounded border border-gray-300 bg-white p-4 shadow-sm">
            
            {/* Tiêu đề của GroupBox (Tùy chọn để trông giống phần mềm hơn) */}
            <div className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">
                Nguồn Dữ Liệu Video
            </div>

            {/* Khu vực Drag & Drop giả lập File Dialog Area */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-gray-100'
                }`}
            >
                <input ref={inputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                
                {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileVideo className="h-10 w-10 text-blue-600" />
                        <div>
                            <p className="font-mono text-sm font-bold text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">
                                Dung lượng: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <UploadCloud className="h-10 w-10 text-gray-400" />
                        <div>
                            <p className="text-sm font-semibold text-gray-700">Kéo thả tập tin video vào đây</p>
                            <p className="text-xs text-gray-500">hoặc nhấn để mở hộp thoại chọn file (.mp4, .avi)</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Nút bấm (Button) - Thiết kế giống nút Action tiêu chuẩn của Windows */}
            <button
                disabled={!selectedFile || isProcessing}
                onClick={() => onAnalyze(selectedFile)}
                className="flex items-center justify-center rounded border px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 
                disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400
                border-blue-700 bg-blue-600 text-white hover:bg-blue-700"
            >
                {isProcessing ? 'Đang xử lý phân tích...' : 'Tiến hành Phân tích'}
            </button>
        </div>
    );
}