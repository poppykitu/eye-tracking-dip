# Hướng dẫn trình bày demo xử lý ảnh mắt

## Mở đầu khoảng 30 giây

“Đề tài của em là xử lý ảnh mắt để phục vụ eye tracking và hướng tới hỗ trợ điều khiển thiết bị. Trong phiên bản hiện tại, em tập trung xây dựng quy trình cải thiện ảnh và phân đoạn trên tám ảnh mắt cận cảnh. Em sử dụng các phương pháp xử lý ảnh truyền thống, không dùng mô hình học máy. Phần tìm tâm đồng tử là bước ứng dụng sau khi xử lý ảnh.”

## Bước 1 Giới thiệu đầu vào

Mở demo, chọn ảnh đầu tiên và bước Đầu vào. Chỉ ra ảnh sáng không đều, phản xạ trong mắt và lông mi. Nói rõ: “Đây là các ảnh trích từ video, chưa phải hệ thống chạy trực tiếp trên camera.”

Chọn điều kiện quá tối, quá sáng hoặc nhiễu. Nói rõ đây là biến thể tổng hợp từ ảnh thật để đánh giá phương pháp có kiểm soát, không phải ba lần thu camera riêng.

## Bước 2 Biến đổi cường độ sáng

Chọn Quá tối rồi Hiệu chỉnh gamma. Giải thích: “Gamma nhỏ hơn một giúp nâng vùng tối. Với ảnh sáng, gamma lớn hơn một làm giảm mức sáng. Chương trình chọn gamma theo trung vị độ sáng và giới hạn để tránh điều chỉnh quá mạnh.”

Chuyển qua Histogram. Giải thích trục ngang là mức xám 0 đến 255, trục dọc là số pixel. Đường xanh lam là trước xử lý, xanh lá là sau gamma và trung vị.

Chọn Quá sáng và chỉ vùng trắng bị mất chi tiết: “Phép biến đổi chỉ cải thiện độ sáng hiển thị; vùng đã bão hòa không còn thông tin để phục hồi đầy đủ.”

## Bước 3 Lọc nhiễu và tương phản

Chọn điều kiện Nhiễu, bước Lọc trung vị, quan sát trước và sau. Nói: “Lọc trung vị là bộ lọc phi tuyến, thay pixel bằng trung vị trong lân cận. Nó giúp loại điểm nhiễu nhưng có thể làm mất chi tiết nhỏ.”

Chọn bước Gaussian và tương phản. Nói: “Gaussian là phép làm mịn tuyến tính. Sau đó em giãn tương phản theo phân vị 2% và 98% để làm rõ khác biệt mức sáng. Vì bước này chỉ áp dụng trên vùng mắt nên ảnh bên phải là ảnh cắt, không phải toàn bộ khung hình.”

Cuộn xuống thí nghiệm riêng, chọn lần lượt Gaussian và muối tiêu. Chỉ bốn ảnh: tham chiếu, có nhiễu, trung vị, Gaussian. Đọc số PSNR đang hiển thị; không cần nhớ số. “Ở đây có ảnh tham chiếu trước khi thêm nhiễu, nên có thể dùng PSNR để so sánh. PSNR cao hơn thể hiện ảnh gần tham chiếu hơn theo sai số bình phương.”

Không kết luận bộ lọc nào luôn tốt hơn chỉ từ một ảnh. Phương pháp phù hợp phụ thuộc loại nhiễu, kích thước cửa sổ và chi tiết cần giữ.

## Bước 4 Biểu diễn ảnh và phân đoạn

Quay lại điều kiện Ảnh gốc. So sánh bước Ảnh xám và Kênh đỏ. “Trên bộ ảnh màu này, kênh đỏ tạo khác biệt giữa đồng tử tối và mống mắt nâu. Khi thay camera hoặc ánh sáng IR, em cần đánh giá lại cách chọn kênh.”

Chọn Phân ngưỡng rồi Hình thái học. “Ngưỡng đảo biến vùng tối thành trắng. Phép đóng nối khe nhỏ, phép mở loại chi tiết nhỏ. Các phép này có thể làm thay đổi đường biên nên cần đánh giá bằng quan sát.”

## Bước 5 Ứng dụng và kết luận

Chọn Ứng dụng tìm tâm, chuyển qua vài ảnh. “Sau phân đoạn, em lọc các vùng theo diện tích và hình dạng, rồi khớp ellipse. Chữ thập đỏ là tâm ước lượng. Kết quả còn lệch khi phản xạ hoặc mí mắt làm thiếu biên. Đây là vị trí trong ảnh, chưa phải tọa độ nhìn trên màn hình.”

“Kết quả hiện tại là chương trình chạy được trên bộ ảnh đã có, xuất ảnh từng bước và số đo cho thí nghiệm nhiễu. Hướng tiếp theo là ổn định thu nhận ảnh, bổ sung ảnh có nhãn tâm, kiểm thử trên video liên tục rồi mới hiệu chuẩn và chuyển thành tín hiệu điều khiển.”

## Những câu hỏi có thể gặp

**Vì sao không dùng ML?** Vì mục tiêu hiện tại là thực hành biến đổi mức sáng, lọc, phân đoạn và đặc trưng hình dạng trong môn DIP. Mỗi bước có tham số và ảnh minh họa cụ thể.

**Có thực sự sửa ảnh không?** Có. Gamma tạo ảnh cân chỉnh sáng, trung vị tạo ảnh giảm nhiễu, Gaussian và giãn tương phản tạo vùng mắt đã cải thiện. Ảnh PNG đầu ra được lưu riêng; không chỉ vẽ đường bao lên ảnh gốc.

**Độ chính xác bao nhiêu?** Chưa có nhãn tâm chuẩn và tập kiểm tra độc lập nên chưa báo cáo độ chính xác. PSNR chỉ đo thí nghiệm nhiễu tổng hợp, không đo độ chính xác đồng tử.

**Có dùng lọc miền tần số không?** Phiên bản này dùng lọc miền không gian. Chưa triển khai FFT hay bộ lọc miền tần số; ưu tiên những bước dễ kiểm tra trên dữ liệu hiện có.

**Camera tháo IR filter thì tại sao ảnh màu?** Việc bỏ IR filter không làm camera chỉ thu hồng ngoại. Cần phân biệt cấu hình camera với điều kiện chiếu sáng thực tế; chưa dùng bộ ảnh màu này để khẳng định kết quả dưới IR.

**Có điều khiển thiết bị được chưa?** Chưa. Phần đã làm là xử lý ảnh và thử định vị đồng tử trên ảnh tĩnh. Điều khiển cần kiểm tra liên tục và hiệu chuẩn.

## Liên hệ báo cáo tuần

Các biên bản cũ đang là khung dự kiến. Không dùng demo vừa tạo để khẳng định rằng thử nghiệm đã hoàn thành ở các tuần trước. Có thể dùng cấu trúc sau để cập nhật tiến độ hiện tại theo đúng ba mục mẫu:

### 1 Mục đích của buổi họp

Rà soát chương trình xử lý ảnh mắt, đánh giá các bước hiệu chỉnh sáng và lọc nhiễu, tổng hợp kết quả phục vụ báo cáo bài tập lớn.

### 3 Các chủ đề các vấn đề thảo luận và quyết định sẽ thực hiện

- Xem xét quy trình gamma, lọc trung vị, Gaussian và giãn tương phản trên tám ảnh mẫu.
- So sánh ảnh trước và sau xử lý với các điều kiện sáng, tối và nhiễu tổng hợp.
- Rà soát phân ngưỡng, hình thái học và kết quả ước lượng tâm đồng tử.
- Hoàn thiện minh họa kết quả, ghi nhận hạn chế và chuẩn bị trình diễn.

### 4 Buổi họp tiếp theo nếu có kế hoạch

Ngày và giờ: Điền lịch thực tế nếu đã có.

Mục tiêu: Bổ sung dữ liệu đánh giá và cải thiện độ ổn định khi chuyển sang video hoặc camera trực tiếp.
