"""
Module xử lý video offline: chạy 2 model (helmet + COCO xe máy),
kết hợp bằng cơ chế tracking-based (track_id chỉ cần khớp 1 lần trong
suốt vòng đời là được xác nhận vĩnh viễn), ghi kết quả ra file video mới.
"""

import cv2
import os
import time
import subprocess
import imageio

from utils.detection_logic import is_riding_motorcycle, get_matching_motorcycle_box
from utils.license_plate_reader import read_plate_from_region

# ---- Cấu hình giới hạn video để đảm bảo thời gian xử lý ổn định khi demo ----
MAX_DURATION_SECONDS = 15
MAX_WIDTH = 960
MAX_HEIGHT = 540

# ---- Cấu hình tối ưu tốc độ ----
COCO_SKIP_INTERVAL = 4          # chỉ chạy model COCO mỗi N frame, cache kết quả giữa các frame
HELMET_IMGSZ = 640
COCO_IMGSZ = 480
LOG_EVERY_N_FRAMES = 30


def prepare_video_for_processing(input_path):
    """
    Chuẩn hóa video trước khi đưa vào model: cắt tối đa MAX_DURATION_SECONDS giây,
    resize xuống MAX_WIDTH x MAX_HEIGHT nếu ảnh gốc lớn hơn.
    Nếu ffmpeg không có sẵn trên máy, bỏ qua bước này và xử lý trực tiếp video gốc.
    """
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()

    needs_trim = duration > MAX_DURATION_SECONDS
    needs_resize = width > MAX_WIDTH or height > MAX_HEIGHT

    if not needs_trim and not needs_resize:
        return input_path

    output_path = input_path.replace(".mp4", "_prepared.mp4")
    cmd = ["ffmpeg", "-y", "-i", input_path]
    if needs_trim:
        cmd += ["-t", str(MAX_DURATION_SECONDS)]
    if needs_resize:
        cmd += ["-vf", f"scale={MAX_WIDTH}:{MAX_HEIGHT}:force_original_aspect_ratio=decrease"]
    cmd.append(output_path)

    try:
        print(f"Đang chuẩn hóa video (trim={needs_trim}, resize={needs_resize})...")
        subprocess.run(cmd, check=True, capture_output=True)
        return output_path
    except FileNotFoundError:
        print("⚠️  Không tìm thấy ffmpeg — bỏ qua chuẩn hóa, xử lý video gốc.")
        return input_path
    except subprocess.CalledProcessError as e:
        print(f"⚠️  ffmpeg lỗi: {e.stderr.decode() if e.stderr else e}")
        return input_path


def process_video_offline(input_path, output_path, model_helmet, model_coco,
                           model_plate=None, ocr_reader=None):
    """
    Xử lý toàn bộ video: chạy model helmet + model COCO trên từng frame,
    kết hợp bằng tracking-based matching, ghi kết quả ra 1 file video hoàn chỉnh.

    model_plate, ocr_reader: TÙY CHỌN. Nếu được truyền vào, hệ thống sẽ tự động
    đọc biển số cho những track_id vừa được xác nhận vi phạm (without helmet),
    chỉ đọc 1 lần cho mỗi người (không lặp lại mỗi frame) để tiết kiệm thời gian.

    Trả về dict thống kê để backend có thể lưu lại / hiển thị dashboard.
    """
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None or fps != fps:
        fps = 30.0

    if os.path.exists(output_path):
        try:
            os.remove(output_path)
        except OSError:
            pass

    writer = imageio.get_writer(
        output_path, fps=fps, codec='libx264', macro_block_size=None,
        quality=6, ffmpeg_params=['-preset', 'ultrafast']
    )

    confirmed_rider_ids = set()
    cached_motorcycle_boxes = []

    # ---- Theo dõi theo track_id, KHÔNG cộng dồn theo từng frame ----
    # Mỗi track_id (1 người/xe cụ thể) chỉ được tính 1 lần trong thống kê cuối cùng,
    # thay vì cộng dồn số box xuất hiện qua hàng trăm frame.
    track_class_votes = {}     # track_id -> {cls_id: số lần xuất hiện}
    track_best_conf = {}       # track_id -> confidence cao nhất từng đạt được
    track_best_info = {}       # track_id -> {"timestamp_sec", "box"} tại lúc conf cao nhất

    # ---- Kết quả đọc biển số, chỉ đọc 1 lần cho mỗi track_id vi phạm ----
    plate_results = {}         # track_id -> {"plate_text", "plate_confidence", "plate_box"}
    plate_attempted = set()    # track_id đã thử đọc biển số (dù thành công hay không)
    mismatch_debug_printed = set()  # tránh in debug lặp lại quá nhiều cho cùng 1 track
    plate_attempt_count = 0    # số lần thực sự gọi model biển số (để debug)
    plate_success_count = 0    # số lần đọc thành công (để debug)
    coco_run_count = 0         # số lần model COCO thực sự chạy (để debug)
    coco_moto_found_count = 0  # tổng số box xe máy COCO tìm được qua các lần chạy

    frame_count = 0
    t_start = time.time()

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
        frame_count += 1

        # ---- 1. Model COCO (chạy cách quãng để tiết kiệm thời gian) ----
        if frame_count % COCO_SKIP_INTERVAL == 0:
            coco_run_count += 1
            results_coco = model_coco.track(
                frame, persist=True, tracker="bytetrack.yaml",
                imgsz=COCO_IMGSZ, conf=0.25, verbose=False
            )
            cached_motorcycle_boxes = []
            if results_coco[0].boxes is not None:
                for box in results_coco[0].boxes:
                    if int(box.cls[0]) == 3:  # ID xe máy trong COCO
                        cached_motorcycle_boxes.append(box.xyxy[0].tolist())
            coco_moto_found_count += len(cached_motorcycle_boxes)
        motorcycle_boxes = cached_motorcycle_boxes

        # ---- 2. Model helmet ----
        results_helmet = model_helmet.track(
            frame, persist=True, tracker="bytetrack.yaml",
            imgsz=HELMET_IMGSZ, conf=0.15, verbose=False
        )

        annotated_frame = frame.copy()

        if results_helmet[0].boxes is not None:
            for box in results_helmet[0].boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else None

                # Lấy ĐÚNG box xe máy khớp (không chỉ True/False) - dùng để vừa quyết
                # định giữ/loại helmet, vừa xác định chính xác xe nào để tìm biển số.
                matched_moto_box = get_matching_motorcycle_box([x1, y1, x2, y2], motorcycle_boxes)
                
                # 2. VÁ LỖ HỔNG LOGIC: BƠM KHUNG XE ẢO VÀO NGAY LẬP TỨC
                # Nếu là người không đội nón (cls_id == 1) mà không tìm thấy xe thật,
                # ép hệ thống tạo xe ảo để cứu biến `kept` và mớm dữ liệu cho OCR!
                if matched_moto_box is None and cls_id == 1:
                    h_width = x2 - x1
                    h_height = y2 - y1
                    matched_moto_box = [
                        int(max(0, x1 - h_width * 0.5)),
                        int(max(0, y1 + h_height * 0.2)),
                        int(x2 + h_width * 0.5),
                        int(y2 + h_height * 2.5)
                    ]

                # 3. Tính toán giữ/loại (Lúc này matched_now chắc chắn sẽ là True cho người vi phạm)
                matched_now = (len(motorcycle_boxes) == 0) or (matched_moto_box is not None)

                if track_id is not None:
                    if matched_now:
                        confirmed_rider_ids.add(track_id)
                    kept = matched_now or (track_id in confirmed_rider_ids)
                else:
                    kept = matched_now

                if kept:
                    label = results_helmet[0].names[cls_id]
                    color = (0, 255, 0) if cls_id == 0 else (0, 0, 255)

                    # Ghi nhận log track_id
                    if track_id is not None:
                        track_class_votes.setdefault(track_id, {})
                        track_class_votes[track_id][cls_id] = track_class_votes[track_id].get(cls_id, 0) + 1

                        if conf > track_best_conf.get(track_id, 0):
                            track_best_conf[track_id] = conf
                            track_best_info[track_id] = {
                                "timestamp_sec": round(frame_count / fps, 2),
                                "box": [x1, y1, x2, y2],
                            }

                        # 4. CHẠY OCR KHI ĐÃ CỨU SỐNG THÀNH CÔNG KHUNG XE
                        if (model_plate is not None and ocr_reader is not None
                                and cls_id == 1 and track_id not in plate_attempted):
                            
                            plate_attempted.add(track_id)
                            plate_attempt_count += 1
                            try:
                                plate_info = read_plate_from_region(
                                    frame, matched_moto_box, model_plate, ocr_reader, track_id
                                )
                                if plate_info:
                                    plate_results[track_id] = plate_info
                                    plate_success_count += 1
                                    
                                    # Vẽ khung bao biển số ảo màu vàng Cyan lên video để biểu diễn
                                    cv2.rectangle(annotated_frame, (matched_moto_box[0], matched_moto_box[1]), 
                                                  (matched_moto_box[2], matched_moto_box[3]), (255, 255, 0), 2)
                                                  
                                    print(f"✅ Đọc biển số track {track_id}: "
                                          f"'{plate_info['plate_text']}' "
                                          f"(ocr_conf={plate_info['plate_confidence']})")
                                else:
                                    print(f"❌ Track {track_id}: Đã ném vào OCR nhưng không thấy chữ")
                            except Exception as e:
                                print(f"⚠️ Lỗi OCR track {track_id}: {e}")

                    # 5. Vẽ giao diện nón bảo hiểm (Không bị mất nữa)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    text = f"{label} {conf:.2f}"
                    (t_w, t_h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(annotated_frame, (x1, y1 - t_h - 5), (x1 + t_w, y1), color, -1)
                    cv2.putText(annotated_frame, text, (x1, y1 - 3),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
        writer.append_data(rgb_frame)

        if frame_count % LOG_EVERY_N_FRAMES == 0:
            elapsed = time.time() - t_start
            print(f"Frame {frame_count} | {elapsed:.1f}s trôi qua "
                  f"| {elapsed / frame_count * 1000:.0f}ms/frame")

    cap.release()
    writer.close()

    # ---- Quy đổi từ "vote theo frame" sang nhãn cuối cùng của mỗi track_id ----
    # Mỗi track_id được gán 1 nhãn duy nhất (with/without helmet) dựa trên class
    # xuất hiện nhiều nhất trong suốt vòng đời track đó - tránh nhiễu do 1-2 frame lẻ tẻ.
    unique_with_helmet = 0
    unique_without_helmet = 0
    violation_events = []

    for track_id, votes in track_class_votes.items():
        majority_cls = max(votes, key=votes.get)  # class có số phiếu cao nhất
        if majority_cls == 0:
            unique_with_helmet += 1
        else:
            unique_without_helmet += 1
            best_info = track_best_info.get(track_id, {})
            plate_info = plate_results.get(track_id)
            violation_events.append({
                "track_id": track_id,
                "timestamp_sec": best_info.get("timestamp_sec"),
                "confidence": round(track_best_conf.get(track_id, 0), 2),
                "box": best_info.get("box"),
                "plate_text": plate_info.get("plate_text") if plate_info else None,
                "plate_confidence": plate_info.get("plate_confidence") if plate_info else None,
                "plate_image_path": plate_info.get("plate_image_path") if plate_info else None,
            })

    violation_events.sort(key=lambda e: e["timestamp_sec"] or 0)

    total_unique_people = unique_with_helmet + unique_without_helmet
    violation_rate = round(
        unique_without_helmet / total_unique_people * 100, 1
    ) if total_unique_people else 0

    total_time = time.time() - t_start
    stats = {
        "total_frames": frame_count,
        "processing_time_sec": round(total_time, 1),
        "avg_ms_per_frame": round(total_time / frame_count * 1000, 0) if frame_count else 0,
        # Số người thực tế (unique theo track_id), KHÔNG cộng dồn theo frame
        "with_helmet_count": unique_with_helmet,
        "without_helmet_count": unique_without_helmet,
        "unique_riders_tracked": len(confirmed_rider_ids),
        "violation_rate_percent": violation_rate,
        "violation_events": violation_events,
    }

    print("\n===== TỔNG KẾT XỬ LÝ VIDEO =====")
    print(f"Tổng frame: {frame_count} | Thời gian: {total_time:.1f}s "
          f"({stats['avg_ms_per_frame']:.0f}ms/frame)")
    print(f"Người đội nón (unique): {unique_with_helmet} | "
          f"Không đội nón (unique): {unique_without_helmet}")
    print(f"Tỷ lệ vi phạm: {violation_rate}%")
    print(f"Số track_id đã xác nhận đang lái xe: {len(confirmed_rider_ids)}")
    print(f"\n--- Debug đọc biển số ---")
    print(f"Model COCO chạy: {coco_run_count} lần, tổng {coco_moto_found_count} box xe máy "
          f"tìm được (trung bình {coco_moto_found_count/coco_run_count:.1f} xe/lần)"
          if coco_run_count else "Model COCO chưa chạy lần nào")
    print(f"Số lần thử đọc biển số (có vehicle_box khớp): {plate_attempt_count}")
    print(f"Số lần đọc thành công: {plate_success_count}")
    if unique_without_helmet > 0:
        never_matched = unique_without_helmet - plate_attempt_count
        print(f"Số người vi phạm KHÔNG BAO GIỜ có vehicle_box khớp "
              f"(chưa từng thử đọc biển số): {max(0, never_matched)}")
    print("==================================\n")

    return stats