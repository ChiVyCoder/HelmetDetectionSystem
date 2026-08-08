import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

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
        <div className="flex flex-col gap-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                    isDragging
                        ? 'border-amber-500 bg-slate-900'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
            >
                <input ref={inputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                <UploadCloud className="mx-auto h-8 w-8 text-slate-600" />

                {selectedFile ? (
                    <div className="mt-3">
                        <p className="font-mono text-sm font-medium text-slate-200">{selectedFile.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                    </div>
                ) : (
                    <div className="mt-3">
                        <p className="text-sm font-medium text-slate-300">Kéo thả video vào đây</p>
                        <p className="mt-1 text-xs text-slate-500">hoặc nhấn để chọn file (mp4, mov)</p>
                    </div>
                )}
            </div>

            <button
                disabled={!selectedFile || isProcessing}
                onClick={() => onAnalyze(selectedFile)}
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
            >
                {isProcessing ? 'Đang phân tích...' : 'Phân tích video'}
            </button>
        </div>
    );
}
