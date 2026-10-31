# Thu dữ liệu kiểm tra và kiểm duyệt nhãn

## Thu ảnh gốc và mask dự đoán

Mở `output/demo.html` → Video → **Tạo bộ dữ liệu kiểm tra · ảnh gốc + mask**.

1. Điền mã người, phiên quay, tập `test`/`tune`, điều kiện sáng/tối/nhiễu/góc nghiêng.
2. Chọn khoảng cách giữa các khung (mặc định 1 giây), số ảnh tối đa (mặc định 30).
3. **Thu từ webcam** hoặc chọn video cục bộ và bấm **Trích khung từ video**. Chỉnh chiều xoay/lật trước khi thu/trích. Webcam dùng cấu hình camera kính. Video tệp không cần webcam để trích; có thể từ chối quyền webcam ở tab Video.
4. Dừng, chờ khung đang lưu hoàn tất, bấm **Xuất bộ dữ liệu ZIP**.

Mỗi bộ tối đa 100 ảnh và 96 MB ảnh/mask trong bộ nhớ. Giới hạn nguồn 16 megapixel/khung. ZIP không nén thêm vì PNG đã nén. Dữ liệu ở RAM, không tự lưu qua lần tải lại trang; hãy xuất trước khi đóng tab. Thu cả khung mất dấu, không chỉ giữ các khung thuật toán làm tốt.

Ảnh gốc là khung camera/video **trước gamma, lọc, tăng tương phản**, có độ phân giải nguồn và đã xoay/lật theo cấu hình. Đây không phải dữ liệu RAW cảm biến: camera và bộ giải mã trình duyệt có thể đã xử lý ảnh. Với webcam, khung nguồn được chụp một lần rồi thu nhỏ cho worker, vì vậy ảnh gốc và mask thuộc cùng khung. Với video tệp, thời điểm lấy mẫu được lưu theo giây.

Mask dự đoán lấy từ thành phần đồng tử thực sự được chọn, trước lấp lỗ phản xạ, không tô bù ellipse sau mí. Mask được phóng bằng nearest-neighbor về kích thước ảnh nguồn, chỉ có 0 và 255. Phép khớp vẫn xử lý ở độ phân giải demo; PNG lớn không làm tăng độ chính xác.

ZIP ban đầu:

```text
images/frame_00000.png       # ảnh nguồn, đúng chiều
predictions/frame_00000.png  # mask thuật toán, KHÔNG phải nhãn chuẩn
annotations.json            # đa giác rỗng, reviewed=false
predictions.json            # ellipse, kích thước xử lý, thông số, thời điểm
dataset.json                # thông tin bộ dữ liệu
```

## Vẽ và kiểm nhãn

Mở `output/annotate.html` qua đường dẫn trong demo. Nạp ZIP vừa xuất. Có thể nạp ảnh rời và JSON cũ; nạp ZIP/JSON sẽ thay bộ đang mở.

- Mask dự đoán được nạp sẵn, tô mờ và vẽ viền xanh trên ảnh gốc. Nếu đúng, điền người duyệt và bấm **Duyệt ảnh này** ngay, không cần vẽ lại. Nếu sai, chọn **Sai → Vẽ lại** rồi vẽ biên phần đồng tử nhìn thấy trên ảnh gốc. Kéo điểm để sửa; chuột phải xóa điểm. Có phóng to 50–400%, hoàn tác/làm lại và trước/sau.
- Mask bên phải là nhãn hiện tại: mask nạp sẵn hoặc biên vẽ lại. Có thể tắt lớp phủ trên ảnh hoặc chỉnh độ đậm để nhìn rõ đồng tử; chọn **Nạp lại mask dự đoán** để khôi phục bản gợi ý. Nhãn chỉ được duyệt khi người dùng bấm xác nhận.
- Chọn đúng `visible`, `occluded`, `absent` hoặc `unusable`. Với `absent`, xóa đa giác và ellipse. `Unusable` được giữ để ghi nhận dữ liệu nhưng bỏ khỏi điểm đánh giá.
- Ellipse đầy đủ tùy chọn: tâm → đầu trục lớn → đầu trục nhỏ. Không đặt nếu không xác định được. Đa giác vùng bị che không đủ để suy ra tâm chuẩn.
- Điền mã người duyệt, bấm **Duyệt ảnh này**. Công cụ kiểm tra đa giác thiếu điểm, diện tích bằng 0, tự cắt, điểm ngoài ảnh, ellipse sai và người bị chia vào cả tune/test.
- Chỉnh biên hoặc thông tin ảnh sẽ hủy duyệt; cần duyệt lại trước khi chấm. Bộ lọc **Chưa duyệt** giúp kiểm các ảnh còn lại.
- **Lưu bản làm dở ZIP** giữ ảnh, dự đoán, đa giác và trạng thái để mở lại. Không chỉ lưu một JSON khi cần mang ảnh sang máy khác.

**Xuất ZIP các ảnh đã duyệt + mask** chỉ đưa các ảnh đã duyệt vào bộ đánh giá; có `references/*.png` là mask đã kiểm duyệt, cùng ảnh, mask dự đoán và nhãn. Các ảnh chưa duyệt không đóng góp điểm. Mask được duyệt trực tiếp giữ nguyên từng pixel, kể cả lỗ phản sáng; không thay bằng ellipse hay xấp xỉ đa giác. JSON lưu `mask_rle` (run-length theo hàng, bắt đầu bằng vùng nền) để nhãn vẫn mở lại và chấm được khi chỉ mang JSON. Bộ không có dự đoán lưu sẵn vẫn xuất được nhãn nhưng không có chỉ số thuật toán cho các ảnh đó; dùng benchmark để tính dự đoán sau.

## Vẽ lại bằng thuật toán

Mở **Vẽ lại bằng thuật toán DIP · tự chỉnh thông số** ngay trong tool nhãn. Thuật toán dùng đúng các hàm video hiện tại, chạy trong worker riêng để không chặn thao tác chuột.

1. Chỉnh gamma/tự động gamma, kênh xám/đỏ, trung vị, Gaussian, tương phản (đen/trắng/gamma), blur (kernel/σ) và ngưỡng tự động/thủ công.
2. Mặc định cập nhật sau khi ngừng thay đổi khoảng 220 ms. Có thể tắt tự cập nhật và bấm **Chạy thử thuật toán**.
3. Viền xanh trên ảnh lúc này là **bản xem thử**. Có thể xem riêng ảnh sau tiền xử lý, phân ngưỡng hoặc hình thái học ở canvas trong bảng thông số.
4. Bấm **Dùng mask này làm nhãn** rồi **Duyệt ảnh này**. Nếu không tìm được đồng tử thì nút dùng mask bị vô hiệu; chỉnh tham số hoặc vẽ tay. Công cụ yêu cầu áp dụng bản xem thử trước khi duyệt để tránh nhầm nhãn cũ.
5. **Nạp thông số lúc thu** lấy cấu hình được lưu trong bộ dữ liệu. **Nạp lại mask dự đoán** khôi phục mask gốc. Bản dự đoán gốc không bị thay đổi khi thử hoặc áp dụng cấu hình mới.

Thông số và kích thước xử lý được lưu trong `labelAlgorithmSettings`, `labelAlgorithmDimensions`. Mask được phóng nearest-neighbor về tọa độ ảnh nguồn; nhãn tâm ellipse chỉ được đặt bằng thao tác riêng, không tự lấy tâm thuật toán làm đáp án. Chỉ số với nhãn hỗ trợ thuật toán cần được mô tả đúng nguồn trong báo cáo.

## Các con số cho báo cáo

Giao diện và **Xuất chỉ số CSV + JSON** cho:

- IoU và Dice trung bình trên các ảnh nhãn có đồng tử; khung mất dấu tính bằng 0.
- Tỷ lệ mất dấu trên ảnh có đồng tử.
- Tỷ lệ báo nhầm trên ảnh không có đồng tử; không dùng mask rỗng/rỗng để nâng IoU dương.
- Sai số tâm theo pixel ảnh gốc, chỉ khi cả nhãn ellipse đầy đủ và dự đoán tồn tại; luôn kèm số ảnh được tính / số ảnh có nhãn tâm.
- Số ảnh được chấm, bỏ qua, thiếu dự đoán; nhóm riêng theo điều kiện, trạng thái và tune/test trong JSON.
- Thời gian xử lý của các khung có lưu dự đoán. Chỉ so sánh trên cùng máy/cấu hình; không bao gồm mọi chi phí chụp và mã hóa PNG.

Mỗi nhãn ghi `annotationSource`: `prediction-reviewed` khi duyệt mask ban đầu, `algorithm-reviewed` khi chạy lại thuật toán với thông số chỉnh và duyệt, `manual-reviewed` khi vẽ lại bằng tay. Báo cáo đếm riêng ba nguồn. Nếu duyệt chính mask dự đoán rồi so lại với nó thì IoU/Dice có thể bằng 1: đây là mức đồng thuận sau duyệt, không chứng minh độ chính xác độc lập. Không tự sao chép ellipse dự đoán làm nhãn tâm. Đây là đánh giá theo nhãn được duyệt cục bộ, chưa phải nhãn độc lập nhiều người. Nên có người thứ hai kiểm lại một phần nhãn. Khung liên tiếp từ cùng video có tương quan; tăng khoảng cách mẫu và thu nhiều phiên/người/điều kiện. Chọn tham số trên `tune`, giữ nguyên khi đánh giá `test`. Không dùng cùng người ở cả hai tập. Với một người duy nhất chỉ báo cáo kết quả trên các phiên của người đó, không tuyên bố khả năng tổng quát.

## Chấm lại bằng Python hoặc chạy cấu hình mới

Giải nén ZIP đã duyệt vào `output/my_dataset/` bằng trình giải nén thông thường. Chạy từ thư mục gốc:

```powershell
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/my_dataset/annotations.json --predictions output/my_dataset/predictions.json --output output/my_dataset/evaluation
```

Python sử dụng `reference_mask` trong bộ ZIP để giống hệt mask đã duyệt đã xuất; JSON nhãn cũ không có mask thì rasterize đa giác bằng OpenCV. Các biên rasterize có thể khác một ít giữa hai thư viện. Python từ chối dữ liệu `reviewed=false`. Các bộ JSON cũ không có thuộc tính review vẫn được hỗ trợ, với nguồn nhãn do người dùng cung cấp.

Để so sánh một cấu hình thuật toán mới trên cùng ảnh/nhãn:

```powershell
node tools/benchmark_pupil.cjs --annotations output/my_dataset/annotations.json --images output/my_dataset --output output/my_dataset/new_predictions --method robust
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/my_dataset/annotations.json --predictions output/my_dataset/new_predictions/predictions.json --output output/my_dataset/new_evaluation
```

Các ảnh, mask, ZIP, CSV và JSON đánh giá trong `output/` được `.gitignore` bỏ qua. Không đưa ảnh mắt/phiên thu mới lên Git tự động.

## Kiểm thử chức năng

```powershell
node tests/browser/verify_dataset_workflow.cjs
uv run --with-requirements requirements.txt python tests/check_dataset_export.py
```

Bài đầu dùng camera giả và hình học có TP/FN/FP biết trước; bài sau kiểm tra ZIP và đối chiếu từng chỉ số giữa trình duyệt và Python. Các con số này chỉ là kiểm thử phần mềm, không phải kết quả trên dữ liệu mắt thật.

Kiểm thử trích video tệp (cần ffmpeg, có thể đặt biến `FFMPEG_BINARY`):

```powershell
uv run --with-requirements requirements.txt python tests/create_dataset_video.py
node tests/browser/verify_dataset_video.cjs
```
