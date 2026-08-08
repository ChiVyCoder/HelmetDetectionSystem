"""
Module phát hiện + đọc biển số xe.
Chỉ nên được gọi khi ĐÃ XÁC NHẬN có vi phạm (without helmet) để tiết kiệm tài nguyên,
không chạy cho mọi frame/mọi người trong video.

DÙNG EASYOCR 
"""

import os
import time

import cv2
import re
from collections import Counter

# Ngưỡng tin cậy OCR tối thiểu để chấp nhận kết quả - dưới ngưỡng này coi như
# "chưa đọc được" thay vì hiển thị chuỗi có khả năng sai cao.
MIN_OCR_CONFIDENCE = 0.35

# Tập ký tự hợp lệ trên biển số Việt Nam: số 0-9, chữ cái seri (không dùng
# I, O, J, Q, R, W để tránh nhầm với số 1/0), dấu . và - để phân tách.
PLATE_CHAR_ALLOWLIST = "0123456789ABCDEFGHKLMNPSTUVXYZ.-"

# Biển số thật KHÔNG BAO GIỜ có 3 ký tự giống hệt nhau liên tiếp (vd "LLL").
# OCR đôi khi "hallucinate" ra chuỗi ký tự lặp khi gặp vùng ảnh mờ/thiếu thông
# tin - dùng pattern này để phát hiện và loại bỏ đúng phần "rác" đó.
_JUNK_REPEAT_PATTERN = re.compile(r'(.)\1{2,}')


def _is_junk_segment(text):
    """Đoạn text có 3+ ký tự giống hệt nhau liên tiếp -> coi là rác, loại bỏ."""
    return bool(_JUNK_REPEAT_PATTERN.search(text))


# Biển số Việt Nam chỉ có ĐÚNG 1 chữ cái seri. Mọi ký tự SAU chữ cái seri đó
# đều phải là số. Nếu OCR đọc ra chữ cái ở vị trí này, nhiều khả năng là đọc
# nhầm 1 chữ số có hình dạng gần giống.
_LETTER_TO_DIGIT_CONFUSION = {
    'L': '4', 'S': '5', 'B': '8', 'Z': '2', 'G': '6', 'A': '4',
}


def _force_all_letters_to_digits(text):
    """
    Ép TẤT CẢ ký tự chữ cái trong chuỗi thành số tương ứng, không có ngoại lệ.
    Dùng cho DÒNG DƯỚI của biển số xe máy - dòng này luôn luôn toàn số, không
    bao giờ có chữ cái hợp lệ, nên bất kỳ chữ cái nào xuất hiện ở đây chắc chắn
    là do OCR đọc nhầm.
    """
    return "".join(
        _LETTER_TO_DIGIT_CONFUSION.get(ch, ch) if ch.isalpha() else ch
        for ch in text
    )


def _fix_digit_confusion_after_series_letter(text):
    """
    Sửa các ký tự chữ cái XUẤT HIỆN SAU chữ cái seri đầu tiên thành số tương ứng.
    Chữ cái seri đầu tiên được giữ nguyên, không bị sửa.
    """
    chars = list(text)
    first_letter_idx = None
    for i, ch in enumerate(chars):
        if ch.isalpha():
            first_letter_idx = i
            break

    if first_letter_idx is None:
        return text

    for i in range(first_letter_idx + 1, len(chars)):
        ch = chars[i]
        if ch.isalpha() and ch in _LETTER_TO_DIGIT_CONFUSION:
            chars[i] = _LETTER_TO_DIGIT_CONFUSION[ch]

    return "".join(chars)


def clean_plate_text(raw_text):
    """Chuẩn hóa chuỗi OCR: loại khoảng trắng thừa, in hoa."""
    return raw_text.upper().replace(" ", "")


def _generate_preprocess_variants(plate_crop, scale=4):
    """
    Tạo 3 biến thể tiền xử lý khác nhau từ cùng 1 ảnh gốc:
    1. CLAHE (tăng tương phản cục bộ) - tốt cho ảnh có ánh sáng không đều
    2. Nhị phân hóa Otsu (đen/trắng rõ rệt) - tốt cho ảnh có độ tương phản sẵn tốt
    3. Ảnh xám thường (không xử lý gì thêm) - phương án đối chứng

    Không phải lúc nào 1 cách xử lý cũng tối ưu cho mọi điều kiện ánh sáng/độ mờ -
    thử nhiều cách rồi chọn kết quả OCR tốt nhất giúp tăng độ ổn định.
    """
    resized = cv2.resize(plate_crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # Biến thể 1: CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    variant_clahe = cv2.cvtColor(clahe.apply(gray), cv2.COLOR_GRAY2BGR)

    # Biến thể 2: Nhị phân hóa Otsu (tự động tìm ngưỡng đen/trắng tối ưu)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    _, otsu = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    variant_otsu = cv2.cvtColor(otsu, cv2.COLOR_GRAY2BGR)

    # Biến thể 3: ảnh xám thường, chỉ phóng to - đối chứng, đôi khi ảnh gốc
    # đã đủ rõ và các bước xử lý thêm lại phản tác dụng
    variant_plain = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    return [variant_clahe, variant_otsu, variant_plain]


def _run_ocr_on_crop(crop, ocr_reader, scale=4):
    """
    Chạy OCR trên 1 vùng ảnh (có thể là cả biển số, hoặc chỉ 1 dòng đã tách riêng).
    Thử NHIỀU biến thể tiền xử lý, CHỌN KẾT QUẢ CÓ CONFIDENCE CAO NHẤT cho mỗi
    vùng text phát hiện được - không đơn thuần ghép hết mọi biến thể vào nhau.
    Trả về list các (text, confidence) đã lọc bỏ đoạn rác.
    """
    if crop.size == 0:
        return []

    variants = _generate_preprocess_variants(crop, scale=scale)

    # Gom kết quả từ TẤT CẢ biến thể, mỗi biến thể có thể ra nhiều đoạn text
    all_candidates = []
    for variant in variants:
        ocr_result = ocr_reader.readtext(variant, allowlist=PLATE_CHAR_ALLOWLIST)
        for _, text, seg_conf in ocr_result:
            if _is_junk_segment(text):
                continue
            all_candidates.append((text, seg_conf))

    if not all_candidates:
        return []

    # Nếu nhiều biến thể cùng cho ra 1 CHUỖI GIỐNG HỆT NHAU -> rất đáng tin cậy,
    # ưu tiên chọn (đồng thuận giữa nhiều phương pháp xử lý khác nhau).
    text_counts = Counter(text for text, _ in all_candidates)
    most_common_text, count = text_counts.most_common(1)[0]

    if count >= 2:
        # Có sự đồng thuận - lấy confidence trung bình của các lần ra kết quả này
        confs_for_best = [c for t, c in all_candidates if t == most_common_text]
        return [(most_common_text, sum(confs_for_best) / len(confs_for_best))]

    # Không có đồng thuận -> chọn kết quả có confidence cao nhất
    best_text, best_conf = max(all_candidates, key=lambda x: x[1])
    return [(best_text, best_conf)]


def read_plate_from_region(frame, vehicle_box, model_plate, ocr_reader, track_id, padding_ratio=0.15, conf=0.2):
    """
    Tìm và đọc biển số TRONG ĐÚNG box xe máy đã được xác nhận khớp với người vi phạm
    (lấy từ get_matching_motorcycle_box trong detection_logic.py).

    ocr_reader: object easyocr.Reader(['en']) đã khởi tạo sẵn ở main.py.

    Biển số xe máy VN thường có 2 DÒNG (seri ở trên, số ở dưới) - OCR đọc cả
    khối 2 dòng cùng lúc dễ nhầm lẫn ký tự giữa 2 dòng. Nếu box biển số có
    tỷ lệ khung hình "vuông" (đặc trưng của biển 2 dòng), ta CHỦ ĐỘNG TÁCH
    THÀNH 2 NỬA TRÊN/DƯỚI, chạy OCR riêng từng nửa - giúp model tập trung
    đọc từng dòng đơn giản, giảm hẳn nhầm lẫn giữa 2 dòng.

    Trả về: {"plate_text", "plate_text_raw", "plate_confidence",
             "plate_detect_confidence", "plate_box"}
    hoặc None nếu không tìm/đọc được biển số nào ĐỦ TIN CẬY trong box xe đó.
    """
    frame_h, frame_w = frame.shape[:2]
    vx1, vy1, vx2, vy2 = vehicle_box

    v_width = vx2 - vx1
    v_height = vy2 - vy1

    crop_x1 = max(0, int(vx1 - v_width * padding_ratio))
    crop_y1 = max(0, int(vy1 - v_height * padding_ratio))
    crop_x2 = min(frame_w, int(vx2 + v_width * padding_ratio))
    crop_y2 = min(frame_h, int(vy2 + v_height * padding_ratio))

    vehicle_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
    if vehicle_crop.size == 0:
        return None

    results = model_plate.predict(vehicle_crop, imgsz=640, conf=conf, verbose=False)
    if results[0].boxes is None or len(results[0].boxes) == 0:
        return None

    best_box = max(results[0].boxes, key=lambda b: float(b.conf[0]))
    px1, py1, px2, py2 = map(int, best_box.xyxy[0])
    plate_conf = float(best_box.conf[0])

    plate_crop = vehicle_crop[py1:py2, px1:px2]
    if plate_crop.size == 0:
        return None

    os.makedirs("static/plates", exist_ok=True)
    plate_image_filename = f"plate_{track_id}_{int(time.time())}.jpg"
    plate_image_path = f"static/plates/{plate_image_filename}"
    cv2.imwrite(plate_image_path, plate_crop)  # lưu ảnh crop GỐC (màu), trước khi xử lý cho OCR
    plate_image_url_path = f"/static/plates/{plate_image_filename}"

    plate_h, plate_w = plate_crop.shape[:2]
    aspect_ratio = plate_w / plate_h if plate_h > 0 else 0

    # Biển 1 dòng (ô tô) thường rất dẹt/ngang (aspect ratio > 2.2).
    # Biển 2 dòng (xe máy) thường gần vuông (aspect ratio < 2.2).
    is_two_line_plate = aspect_ratio < 2.2

    if is_two_line_plate:
        # Tách đôi theo chiều dọc, có chồng lấn nhẹ 10% để không cắt đứt chữ
        # nằm ngay giữa ranh giới 2 dòng
        split_y = int(plate_h * 0.5)
        overlap = int(plate_h * 0.1)

        top_half = plate_crop[0:min(plate_h, split_y + overlap), :]
        bottom_half = plate_crop[max(0, split_y - overlap):plate_h, :]

        top_segments = _run_ocr_on_crop(top_half, ocr_reader)
        bottom_segments = _run_ocr_on_crop(bottom_half, ocr_reader)

        if not top_segments and not bottom_segments:
            # Dự phòng: model đoán sai là biển 2 dòng, thử lại nguyên khối
            fallback_segments = _run_ocr_on_crop(plate_crop, ocr_reader)
            all_segments = fallback_segments
            # Không rõ vị trí dòng trong trường hợp dự phòng -> áp quy tắc
            # "bảo vệ chữ cái đầu tiên" như biển 1 dòng
            use_line_aware_correction = False
        else:
            all_segments = top_segments + bottom_segments
            use_line_aware_correction = True
    else:
        all_segments = _run_ocr_on_crop(plate_crop, ocr_reader)
        top_segments, bottom_segments = [], []
        use_line_aware_correction = False

    if not all_segments:
        # Không đọc được ký tự nào, nhưng VẪN CÓ ảnh crop (model đã tìm đúng vị
        # trí biển số) - trả về để người xem tự đối chiếu bằng mắt.
        return {
            "plate_text": None,
            "plate_text_raw": None,
            "plate_confidence": 0.0,
            "plate_detect_confidence": round(plate_conf, 2),
            "plate_box": [crop_x1 + px1, crop_y1 + py1, crop_x1 + px2, crop_y1 + py2],
            "plate_crop_image": plate_crop,
            "plate_image_path": plate_image_url_path,
        }

    valid_segments = [text for text, _ in all_segments]
    valid_confs = [c for _, c in all_segments]

    raw_text_joined = " ".join(valid_segments)
    avg_conf = sum(valid_confs) / len(valid_confs)

    abs_box = [crop_x1 + px1, crop_y1 + py1, crop_x1 + px2, crop_y1 + py2]

    if avg_conf < MIN_OCR_CONFIDENCE:
        # Đọc được ký tự nhưng độ tin cậy thấp -> vẫn trả ảnh crop, nhưng
        # KHÔNG hiển thị text (tránh đưa thông tin sai lệch), người xem tự
        # đối chiếu bằng ảnh.
        return {
            "plate_text": None,
            "plate_text_raw": clean_plate_text(raw_text_joined),
            "plate_confidence": round(avg_conf, 2),
            "plate_detect_confidence": round(plate_conf, 2),
            "plate_box": abs_box,
            "plate_crop_image": plate_crop,
            "plate_image_path": plate_image_url_path,
        }

    cleaned_text = clean_plate_text(raw_text_joined)

    if use_line_aware_correction:
        # ---- Sửa lỗi THEO ĐÚNG VỊ TRÍ DÒNG (chính xác hơn nhiều) ----
        # Dòng TRÊN: có thể chứa chữ cái seri thật -> bảo vệ chữ cái đầu tiên,
        #            chỉ sửa các chữ cái xuất hiện SAU đó.
        # Dòng DƯỚI: luôn luôn toàn số -> ép TẤT CẢ chữ cái thành số, không
        #            có ngoại lệ (không có khái niệm "chữ cái seri" ở đây).
        top_text = clean_plate_text(" ".join(t for t, _ in top_segments))
        bottom_text = clean_plate_text(" ".join(t for t, _ in bottom_segments))

        top_corrected = _fix_digit_confusion_after_series_letter(top_text)
        bottom_corrected = _force_all_letters_to_digits(bottom_text)

        corrected_text = (top_corrected + bottom_corrected) if bottom_corrected else top_corrected
    else:
        # Biển 1 dòng hoặc trường hợp dự phòng -> quy tắc cũ (bảo vệ chữ cái đầu)
        corrected_text = _fix_digit_confusion_after_series_letter(cleaned_text)

    return {
        "plate_text": corrected_text,
        "plate_text_raw": cleaned_text,
        "plate_confidence": round(avg_conf, 2),
        "plate_detect_confidence": round(plate_conf, 2),
        "plate_box": abs_box,
        "plate_crop_image": plate_crop,  # ảnh gốc (màu, chưa xử lý) để hiển thị cho người xem đối chiếu
        "plate_image_path": plate_image_url_path,
    }