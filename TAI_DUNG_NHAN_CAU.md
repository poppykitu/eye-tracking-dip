# Tái dựng mô hình cầu từ các ellipse đồng tử

Luồng thu dữ liệu chỉ cần một chấm cố định trên màn hình: người đeo kính tiếp tục nhìn chấm trong khi xoay đầu nhẹ theo hai chiều. Camera gắn kính phải giữ vị trí tương đối với đầu. Các chuyển động này tạo nhiều hướng mắt tương đối với camera; một camera đặt rời quan sát đầu dịch chuyển không đáp ứng giả định tâm quay cố định của bản này.

Chương trình lưu **tâm, bán trục lớn a, bán trục nhỏ b, góc và sai lệch biên ellipse**. Tọa độ tâm 2D đơn lẻ hoặc vị trí chấm trên màn hình không đủ cho phép khớp này.

## Giả định hình học

Đồng tử được mô hình hóa là một đường tròn có bán kính gần ổn định trong giai đoạn thu. Với phép chiếu phối cảnh yếu, tỷ lệ `q = b/a` xấp xỉ `cos(theta)`, trong đó theta là góc giữa pháp tuyến mặt phẳng đồng tử và hướng camera. Hướng của pháp tuyến chiếu lên ảnh nằm trên trục ngắn ellipse.

Tâm quay chiếu C phải gần các đường đi qua tâm ellipse và song song với trục ngắn. Giao tuyến các cặp đủ khác hướng cho các giả thuyết ban đầu. Chương trình chọn giả thuyết có sai lệch trung vị nhỏ, rồi tối ưu bình phương tối thiểu có trọng số Tukey để giảm ảnh hưởng ngoại lai.

Gọi D là khoảng cách từ tâm quay đến tâm mặt phẳng đồng tử theo đơn vị tỷ lệ ảnh. Từ mỗi mẫu:

`||c_i − C|| ≈ D × sqrt(1 − q_i²)`.

C và D được tinh chỉnh đồng thời bằng hai loại sai lệch: khoảng cách đến đường trục ngắn và sai lệch bán kính do độ dẹt. Mẫu gần tròn không có hướng trục đáng tin nên bị bỏ khỏi tập khớp; mẫu lỗi biên hoặc các trục gần song song cũng không được dùng để công bố mô hình.

## Dựng điểm 3D và hình cầu

Chọn gốc tọa độ tại tâm quay, X sang phải, Y lên trên, Z hướng về camera. Tâm đồng tử được dựng tương đối:

`P_i = (c_ix − Cx, −(c_iy − Cy), D × q_i)`.

Bán kính cầu hiệu dụng được lấy `R = sqrt(D² + r_p²)`, với `r_p` là trung vị bán trục lớn a của các mẫu nhất quán. Đây là mô hình hình học nối tâm quay, tâm mặt phẳng đồng tử và vành tròn; không phải phép đo bán kính sinh học của mắt. Mô hình hiển thị được tự căn vừa ô xem; số đo thực theo tỷ lệ ảnh và các ellipse gốc vẫn được xuất trong JSON.

Không có hiệu chuẩn tiêu cự, độ sâu hoặc thước chuẩn nên chưa suy ra mm, vị trí tâm quay tuyệt đối trong hệ camera hoặc bề mặt mắt đầy đủ. Khúc xạ giác mạc, che khuất, thay đổi đường kính đồng tử và sai số phân đoạn có thể làm mô hình lệch. Tái dựng thành công về số học không thay thế đánh giá thực nghiệm.

## Điều kiện nhận và đầu ra

- Bắt đầu thử khớp từ 24 ellipse có hướng đa dạng; tự kết thúc ngay khi khớp đạt điều kiện với ít nhất 24 mẫu.
- Yêu cầu mẫu phủ cả hai chiều, hướng trục không gần song song, ít nhất 18 mẫu nhất quán và tỷ lệ mẫu nhất quán tối thiểu 65%.
- Không dùng một hình cầu có sẵn thay kết quả khi dữ liệu chưa đạt điều kiện. Khi chưa khớp, chỉ hiển thị các ellipse đã quan sát.
- JSON lưu cả mẫu ellipse, tham số mô hình, sai số, đám điểm 3D, kích thước khung, góc xoay camera và mô tả đơn vị.

Kiểm thử gồm mặt nạ đồng tử thon thật do người dùng gửi; các ellipse tổng hợp ở nhiều tỷ lệ/góc; mô hình cầu có hình học biết trước; dữ liệu có nhiễu và ngoại lai; trường hợp thiếu hướng và giao diện một điểm cố định. Ảnh `reconstruction_synthetic_preview.png` là ảnh kiểm thử bằng dữ liệu tổng hợp, không phải kết quả thu từ kính thật.
