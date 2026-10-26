# Nguồn tham khảo

Chế độ camera cận mắt gắn kính tham khảo ý tưởng tìm ô tối nhất, giới hạn vùng tìm kiếm và thử nhiều ngưỡng từ [JEOresearch/EyeTracker — 3DTracker](https://github.com/JEOresearch/EyeTracker/tree/main/3DTracker), tác giả JEOresearch, giấy phép MIT. Phiên bản đã xem: `f0a1fbb5b405fe27b3e5ea4117bc199bb32792b1`.

Các hàm trong `glasses.js` được viết cho demo trình duyệt này. Không đưa mã nguồn mô hình nhãn cầu/OpenGL hay phép chiếu hướng nhìn 3D của dự án tham khảo vào sản phẩm. Ellipse ở trình duyệt được ước lượng bằng moment vùng; hiệu chuẩn 5 điểm dùng ánh xạ affine 2D để điều khiển chấm trong màn hình mô phỏng.

Phần ảnh màu có thêm điều kiện R−B và các bước tăng cường ảnh phục vụ môn DIP; điều kiện màu không áp dụng cho cấu hình kính IR. Phương pháp kính hiện giả định đồng tử tối hơn vùng xung quanh, không bảo đảm hoạt động với ảnh bright-pupil hoặc phản xạ mạnh.
