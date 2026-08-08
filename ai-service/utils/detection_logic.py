"""
Logic kết hợp model helmet + model xe máy (COCO).
Dùng model COCO như bằng chứng bổ trợ (soft evidence), không phải điều kiện bắt buộc,
để tránh loại oan helmet đúng khi xe máy bị che khuất (occlusion).
"""


def get_matching_motorcycle_box(helmet_box, motorcycle_boxes, x_margin=0.4, y_margin=1.0):
    """
    Trả về ĐÚNG box xe máy khớp với vị trí người đội/không đội nón, hoặc None nếu
    không khớp box cụ thể nào (kể cả trường hợp danh sách motorcycle_boxes rỗng).

    Đây là hàm cốt lõi - việc "khớp" không chỉ dùng để quyết định giữ/loại helmet,
    mà còn dùng để xác định CHÍNH XÁC chiếc xe nào đang bị đánh dấu vi phạm,
    phục vụ việc tìm đúng biển số của xe đó (không lẫn với xe khác trong khung hình).
    """
    if len(motorcycle_boxes) == 0:
        return None

    hx1, hy1, hx2, hy2 = helmet_box
    h_center_x = (hx1 + hx2) / 2
    h_center_y = (hy1 + hy2) / 2

    for mx1, my1, mx2, my2 in motorcycle_boxes:
        m_width = mx2 - mx1
        m_height = my2 - my1

        x_match = (mx1 - m_width * x_margin) <= h_center_x <= (mx2 + m_width * x_margin)
        y_match = (my1 - m_height * y_margin) <= h_center_y <= (my1 + m_height * 0.9)

        if x_match and y_match:
            return [mx1, my1, mx2, my2]

    return None


def is_riding_motorcycle(helmet_box, motorcycle_boxes, x_margin=0.4, y_margin=1.0):
    """
    Kiểm tra nón bảo hiểm có khớp với vị trí người lái xe máy không (dùng cho
    logic giữ/loại helmet). Nếu model COCO không phát hiện xe máy nào trong frame
    -> không đủ tin cậy để loại bỏ, mặc định giữ lại kết quả của model helmet.
    """
    if len(motorcycle_boxes) == 0:
        return True

    return get_matching_motorcycle_box(helmet_box, motorcycle_boxes, x_margin, y_margin) is not None