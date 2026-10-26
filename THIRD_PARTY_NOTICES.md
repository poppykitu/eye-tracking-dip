# Nguồn tham khảo

Chế độ camera cận mắt gắn kính tham khảo ý tưởng tìm ô tối nhất, giới hạn vùng tìm kiếm và thử nhiều ngưỡng từ [JEOresearch/EyeTracker — 3DTracker](https://github.com/JEOresearch/EyeTracker/tree/main/3DTracker), tác giả JEOresearch, giấy phép MIT. Phiên bản đã xem: `f0a1fbb5b405fe27b3e5ea4117bc199bb32792b1`.

Các hàm trong `glasses.js`, `ellipse_geometry.js` và `eye_reconstruction.js` được viết cho demo trình duyệt này. Không đưa mã nguồn mô hình nhãn cầu/OpenGL hay phép chiếu hướng nhìn 3D của dự án tham khảo vào sản phẩm. Dự án tham khảo gợi ý dùng các trục ellipse để ước lượng tâm quay; bản này dùng khởi tạo giao tuyến, bình phương tối thiểu có trọng số và loại ngoại lai, rồi khớp bán kính từ độ dẹt dưới giả định phối cảnh yếu. Luồng thu dùng một điểm nhìn cố định khi người đeo kính xoay đầu. Hiệu chuẩn 12 điểm riêng chỉ dùng ánh xạ affine 2D cho con trỏ.

Phần ảnh màu có thêm điều kiện R−B và các bước tăng cường ảnh phục vụ môn DIP; điều kiện màu không áp dụng cho cấu hình kính IR. Phương pháp kính hiện giả định đồng tử tối hơn vùng xung quanh, không bảo đảm hoạt động với ảnh bright-pupil hoặc phản xạ mạnh.
