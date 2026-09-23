"""
AI Service - chỉ chịu trách nhiệm xử lý AI (detection nón bảo hiểm).
Đây là service nội bộ, được Backend (Node.js) gọi tới qua HTTP,
không phục vụ trực tiếp giao diện người dùng.
"""

import pathlib


_original_path_exists = pathlib.Path.exists
 
 
def _safe_path_exists(self, *args, **kwargs):
    try:
        return _original_path_exists(self, *args, **kwargs)
    except OSError:
        return False
 
 
pathlib.Path.exists = _safe_path_exists

import asyncio
import os
import time
import torch
from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

from utils.video_processor import process_video_offline, prepare_video_for_processing

app = FastAPI(title="Helmet Detection AI Service")

# Cho phép Backend Node.js (chạy ở port khác) gọi sang service này
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # sản phẩm thật nên giới hạn đúng origin của backend
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
os.makedirs("temp", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

torch.set_num_threads(os.cpu_count())

# ---- Load model ----
# Ưu tiên load bản OpenVINO nếu đã export (nhanh hơn nhiều trên CPU).
# Nếu chưa export, tự động fallback về file .pt gốc.
MODEL_HELMET_OPENVINO = "models/best_45epoch_openvino_model/"
MODEL_HELMET_PT = "models/best_45epoch.pt"
# Dùng bản 's' (mạnh hơn 'n') cho model COCO - vì bước matching xe máy cần độ
# chính xác cao hơn tốc độ tối đa, đặc biệt quan trọng cho việc tìm đúng xe để
# đọc biển số. Do model COCO chỉ chạy cách quãng (COCO_SKIP_INTERVAL), chi phí
# tốc độ tăng thêm không đáng kể so với lợi ích detect chính xác hơn.
MODEL_COCO_OPENVINO = "models/yolov8s_openvino_model/"
MODEL_COCO_PT = "models/yolov8s.pt"

print("=" * 50)
model_helmet_path = MODEL_HELMET_OPENVINO if os.path.isdir(MODEL_HELMET_OPENVINO) else MODEL_HELMET_PT
model_coco_path = MODEL_COCO_OPENVINO if os.path.isdir(MODEL_COCO_OPENVINO) else MODEL_COCO_PT

print(f"Đang load model helmet từ: {model_helmet_path}")
model_helmet = YOLO(model_helmet_path)

print(f"Đang load model COCO từ: {model_coco_path}")
model_coco = YOLO(model_coco_path)

# ---- Model biển số + OCR (TÙY CHỌN) ----
# Nếu chưa có file model_plate/chưa cài easyocr, hệ thống vẫn chạy bình thường,
# chỉ là không có tính năng đọc biển số.
MODEL_PLATE_PT = "models/license_plate.pt"
model_plate = None
ocr_reader = None

if os.path.isfile(MODEL_PLATE_PT):
    print(f"Đang load model biển số từ: {MODEL_PLATE_PT}")
    model_plate = YOLO(MODEL_PLATE_PT)
    try:
        import easyocr
        print("Đang load EasyOCR reader...")
        ocr_reader = easyocr.Reader(['en'])
        print("Tính năng đọc biển số: BẬT")
    except ImportError:
        print("Chưa cài easyocr (pip install easyocr) — tính năng đọc biển số: TẮT")
        model_plate = None
else:
    print(f"Không tìm thấy {MODEL_PLATE_PT} — tính năng đọc biển số: TẮT")

print(f"CUDA available: {torch.cuda.is_available()}")
print("AI Service sẵn sàng.")
print("=" * 50)


@app.get("/health")
async def health_check():
    """Endpoint để Backend kiểm tra AI Service còn hoạt động không."""
    return {
        "status": "ok",
        "cuda_available": torch.cuda.is_available(),
        "model_helmet": model_helmet_path,
        "model_coco": model_coco_path,
        "license_plate_enabled": model_plate is not None and ocr_reader is not None,
    }


@app.post("/analyze_video")
async def analyze_video(file: UploadFile = File(...)):
    """
    Nhận video, xử lý detection, trả về:
    - video_url: đường dẫn video đã annotate
    - stats: thống kê chi tiết (số lượng, timestamp vi phạm, biển số nếu đọc được)
      để Backend lưu vào DB / hiển thị dashboard.
    """
    input_path = f"temp/temp_input_{int(time.time())}.mp4"
    unique_filename = f"result_{int(time.time())}.mp4"
    final_output_path = os.path.join("static", unique_filename)

    with open(input_path, "wb") as f:
        f.write(await file.read())

    prepared_path = prepare_video_for_processing(input_path)

    stats = await asyncio.to_thread(
        process_video_offline,
        prepared_path, final_output_path, model_helmet, model_coco,
        model_plate, ocr_reader
    )

    if os.path.exists(input_path):
        os.remove(input_path)
    if prepared_path != input_path and os.path.exists(prepared_path):
        os.remove(prepared_path)

    return {
        "video_url": f"/static/{unique_filename}",
        "stats": stats,
    }