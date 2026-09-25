# Hệ thống phát hiện người không đội nón bảo hiểm

Kiến trúc 3 phần:

```
frontend/    React (Vite)      -> giao diện người dùng
backend/     Node.js (Express) -> nghiệp vụ, lưu lịch sử, gọi AI Service
ai-service/  Python (FastAPI)  -> chạy model YOLOv8 (helmet + xe máy)
```

Luồng hoạt động:

```
Người dùng -> Frontend -> Backend (Node.js) -> AI Service (Python) -> trả kết quả ngược lại
```

## 1. Chuẩn bị model (bắt buộc trước khi chạy)

Copy 2 file model đã train vào `ai-service/models/`:

- `best_45epoch.pt` (model helmet của bạn)
- `yolov8n.pt` (model COCO, tải tự động qua Ultralytics nếu chưa có)

Sau đó export sang OpenVINO để tăng tốc trên CPU :

```bash
cd ai-service
pip install -r requirements.txt
python export_openvino.py
```

## 2. Chạy AI Service (Python)

```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

Kiểm tra: mở `http://localhost:8000/health`

## 3. Chạy Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Kiểm tra: mở `http://localhost:5000/api/video/health`
(sẽ báo trạng thái AI Service có kết nối được không)

## 4. Chạy Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Mở `http://localhost:3000` để dùng giao diện.

## Ghi chú

- `ai-service` cần cài `ffmpeg` trên máy (dùng để chuẩn hóa video trước khi xử lý). Nếu thiếu, hệ thống vẫn chạy được nhưng bỏ qua bước cắt/resize video.
- Video demo mặc định giới hạn tối đa 15 giây, resize xuống 960x540 (chỉnh trong `ai-service/utils/video_processor.py`).
- Muốn đổi model mới (train lại tốt hơn): chỉ cần thay file trong `ai-service/models/`, không cần sửa code backend/frontend — miễn giữ nguyên tên/số lượng class (`with helmet`, `without helmet`).
