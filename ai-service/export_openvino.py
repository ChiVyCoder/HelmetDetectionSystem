"""
Chạy 1 lần duy nhất để export model .pt sang định dạng OpenVINO
(tối ưu tốc độ inference trên CPU, nhanh hơn PyTorch thuần 2-4 lần).

Cách chạy: python export_openvino.py
Yêu cầu: đã đặt file best_45epoch.pt và yolov8n.pt trong thư mục models/
"""

import pathlib
_original_path_exists = pathlib.Path.exists


def _safe_path_exists(self, *args, **kwargs):
    try:
        return _original_path_exists(self, *args, **kwargs)
    except OSError:
        return False


pathlib.Path.exists = _safe_path_exists

from ultralytics import YOLO

print("Đang export model helmet sang OpenVINO...")
model_helmet = YOLO("models/best_45epoch.pt")
model_helmet.export(format="openvino", imgsz=640, half=False)
print("-> models/best_45epoch_openvino_model/")

print("\nĐang export model COCO sang OpenVINO...")
model_coco = YOLO("models/yolov8s.pt")
model_coco.export(format="openvino", imgsz=480, half=False)
print("-> models/yolov8s_openvino_model/")

print("\nHoàn tất. Khởi động lại main.py để tự động dùng model OpenVINO mới.")