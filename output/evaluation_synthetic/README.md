# Kiểm thử hình học tổng hợp — KHÔNG phải kết quả trên mắt thật

18 ảnh được tạo bởi `tools/create_synthetic_occlusion_set.py`: 4 góc xoay, 4 mức che, 2 ảnh không có đồng tử. Nhãn là hình học sinh ảnh, không phải nhãn do người gán hoặc dữ liệu nghiên cứu công bố. Bộ nhỏ này chỉ dùng hồi quy; không chứng minh khả năng tổng quát.

Baseline `direct` dùng cùng tiền xử lý, cùng chọn ngưỡng, chỉ khớp ellipse trực tiếp. Không phải chạy lại toàn bộ một phiên bản Git cũ.

| Chỉ số | Direct | Robust |
|---|---:|---:|
| Sai số tâm trên cùng 12 khung cả hai tìm được | 2.848 px | 0.460 px |
| Số khung dương có ellipse được nhận / 16 | 16 | 12 |
| Tỷ lệ mất dấu trên 16 khung có đồng tử | 0.0% | 25.0% |
| IoU vùng nhìn thấy, tính cả khung mất dấu bằng 0 | 0.921 | 0.659 |
| Báo nhầm trên 2 khung không có đồng tử | 0.0% | 0.0% |

Robust giảm lệch tâm trên các ca được nhận nhưng từ chối cả 4 ca che nặng. Vì vậy IoU trung bình toàn bộ khung giảm. Không thể tuyên bố mọi chỉ số đều tốt hơn. Cần đánh giá bằng ảnh kính thật có nhãn trước khi kết luận hiệu quả thực tế. Các ellipse suy ra ở ca bị che không được đưa vào tái dựng 3D.

Các JSON/CSV trong `direct/` và `robust/` chứa từng kết quả, trạng thái và thông số chạy. Điểm sai số tâm chỉ tính khi có cả ellipse dự đoán và ellipse nhãn đầy đủ; số khung được tính phải luôn đi kèm con số này.

Cấu hình hiện tại có blur bổ sung Gaussian 5×5, sigma 1,2 trước phân ngưỡng ở cả hai phương pháp. Thông số bật/tắt và kernel/sigma được lưu trong predictions.json.
