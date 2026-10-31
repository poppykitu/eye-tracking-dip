# Thu dữ liệu và gắn nhãn ellipse đồng tử

## Thu dữ liệu

Mở `output/demo.html` → Video → **Tạo bộ dữ liệu kiểm tra · ảnh gốc + ellipse**.

1. Điền mã người, phiên quay, tập test/tune và điều kiện sáng/tối/nhiễu/góc nghiêng.
2. Chọn khoảng cách khung (mặc định 1 giây), số ảnh tối đa (mặc định 30).
3. Thu từ webcam hoặc chọn video cục bộ rồi trích khung. Chỉnh xoay/lật trước khi thu. Video tệp có thể trích sau khi từ chối quyền webcam.
4. Dừng, chờ khung hiện tại lưu xong, xuất ZIP.

Ảnh gốc lưu ở độ phân giải nguồn trước gamma/lọc/tăng tương phản, đã đúng chiều xoay/lật. Không phải ảnh RAW cảm biến. Với webcam, cùng một khung nguồn được dùng để lưu ảnh và thu nhỏ cho xử lý. Giữ cả khung mất dấu.

Mỗi bộ tối đa 100 ảnh, 96 MB trong RAM, nguồn tối đa 16 megapixel/khung. Xuất ZIP trước khi tải lại trang hoặc đóng tab.

```text
images/frame_00000.png
annotations.json
predictions.json
dataset.json
```

Không xuất PNG mask. Nhãn `ellipse` chứa `cx`, `cy`, `rx`, `ry`, `angle` trên ảnh gốc. `rx`, `ry` là bán trục (không phải đường kính); `angle` tính bằng radian. Tọa độ sử dụng tâm pixel. Nhãn có `labelType: "ellipse"`, ban đầu `reviewed: false`. Khung mất dấu có `ellipse: null`; người duyệt quyết định đặt lại vòng, đánh dấu không thấy đồng tử hay không đủ thông tin.

`predictions.json` giữ ellipse dự đoán ở kích thước xử lý cùng `processedWidth`, `processedHeight`, cấu hình và thời điểm. Việc đổi ellipse sang ảnh gốc sử dụng cả tâm và ma trận hình dạng; đúng với ảnh bị đổi kích thước hơi khác nhau giữa hai chiều.

## Duyệt và sửa vòng ellipse

Mở `output/annotate.html` → nạp ZIP. Ellipse sẵn có hiện vòng xanh trên ảnh gốc.

- Đúng: điền mã người duyệt, bấm **Duyệt ảnh này**.
- Kéo dấu tâm màu đỏ để di chuyển.
- Kéo đầu trục lớn màu xanh dương để chỉnh bán trục lớn và góc xoay.
- Kéo đầu trục nhỏ màu cam để chỉnh độ dẹt.
- Hoặc nhập tâm X/Y, bán trục a/b, góc xoay bằng độ trong bảng bên cạnh. Trong JSON, góc vẫn lưu radian.
- **Đặt lại ellipse · 3 điểm**: bấm tâm → đầu trục lớn → đầu trục nhỏ. Cần a ≥ b ≥ 1 px.
- Có phóng to 12,5–400%, hoàn tác/làm lại, lọc chưa duyệt, xem ellipse dự đoán ban đầu bằng nét đứt.
- Khi canvas có focus, phím mũi tên dịch tâm 1 px; giữ Shift để dịch 5 px.
- Sửa hình hoặc thông tin ảnh sẽ hủy duyệt. Duyệt lại trước khi chấm.

Với `absent`, cần xóa ellipse. Với `unusable`, ảnh được ghi nhận nhưng không tính điểm. Với `occluded`, chỉ đặt ellipse đầy đủ nếu xác định được hợp lý; nếu không đủ thông tin thì dùng `unusable`, không đoán nhãn để tăng số mẫu.

**Lưu bản làm dở ZIP** giữ ảnh và ellipse đang chỉnh. **Xuất ảnh + nhãn ellipse đã duyệt** chỉ xuất ảnh đã duyệt, JSON ellipse, dự đoán ban đầu và báo cáo CSV/JSON. **Lưu nhãn ellipse JSON** yêu cầu mọi ảnh trong bộ đã duyệt; chuyển JSON sang máy khác cần chuyển cả ảnh gốc.

Có thể nạp bộ ZIP cũ: sử dụng ellipse dự đoán/ellipse đầy đủ nếu có; nhãn cũ có ellipse đầy đủ có thể được giữ; nhãn chỉ có polygon/mask cần đặt lại ellipse và duyệt. Trường hợp chỉ có mask mà không có ellipse, chạy thuật toán lại hoặc đặt vòng thủ công.

## Đặt vòng bằng thuật toán

Mở **Vẽ lại bằng thuật toán DIP · tự chỉnh thông số**. Đây là cùng mã xử lý video, chạy trong worker riêng.

1. Chỉnh gamma, kênh xám/đỏ, trung vị, Gaussian, tương phản, blur và ngưỡng.
2. Mặc định cập nhật sau khi ngừng chỉnh khoảng 220 ms; có thể tắt tự cập nhật và bấm Chạy thử.
3. Vòng xanh trên ảnh là ellipse xem thử. Canvas trong bảng cho xem ảnh tiền xử lý, phân ngưỡng hoặc hình thái học để chẩn đoán; các ảnh này không phải định dạng nhãn.
4. Bấm **Dùng ellipse này làm nhãn**, chỉnh vòng thêm nếu cần, rồi duyệt. Nếu mất dấu, nút áp dụng bị vô hiệu.
5. **Nạp thông số lúc thu** lấy cấu hình đã lưu. **Nạp lại ellipse ban đầu** phục hồi dự đoán gốc. Các thao tác không ghi đè kết quả dự đoán ban đầu.

Nhãn lưu nguồn `prediction-reviewed`, `algorithm-reviewed` hoặc `manual-reviewed`. Cấu hình dùng hỗ trợ đặt vòng lưu trong `labelAlgorithmSettings` và `labelAlgorithmDimensions`.

## Chỉ số báo cáo

- IoU của **ellipse đầy đủ**, trung bình trên ảnh có đồng tử; khung mất dấu tính bằng 0.
- Sai số tâm theo pixel ảnh gốc, trên khung có cả nhãn và dự đoán; kèm số khung được tính/tổng nhãn tâm.
- Tỷ lệ mất dấu trên khung có đồng tử; tỷ lệ báo nhầm trên khung không có đồng tử.
- Phân nhóm theo điều kiện, trạng thái và tune/test trong JSON; CSV có từng ảnh.

Không trình bày IoU ellipse như IoU phân đoạn vùng nhìn thấy khi bị mí che. Nhãn duyệt từ chính dự đoán có thể cho IoU = 1: đây là mức đồng thuận sau duyệt, không chứng minh độ chính xác độc lập. Nên có người thứ hai kiểm lại một phần nhãn, thu nhiều người/phiên/điều kiện và lấy khung đủ cách nhau. Không chia cùng người vào tune và test. Một người duy nhất chỉ cho kết quả trên người/phiên đó, chưa chứng minh tổng quát.

## Chấm lại bằng Python

Giải nén ZIP đã duyệt vào `output/my_dataset/`, chạy từ thư mục gốc:

```powershell
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/my_dataset/annotations.json --predictions output/my_dataset/predictions.json --output output/my_dataset/evaluation
```

Nhãn ellipse không cần mask. Python đo `mean_ellipse_iou_positive_frames`; các chỉ số IoU/Dice vùng nhìn thấy để trống khi không có nhãn phân đoạn. Bộ nhãn mask/polygon cũ vẫn được evaluator hỗ trợ riêng. Bộ chưa duyệt bị từ chối.

Chạy cấu hình thuật toán mới trên cùng ảnh/nhãn:

```powershell
node tools/benchmark_pupil.cjs --annotations output/my_dataset/annotations.json --images output/my_dataset --output output/my_dataset/new_predictions --method robust
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/my_dataset/annotations.json --predictions output/my_dataset/new_predictions/predictions.json --output output/my_dataset/new_evaluation
```

Benchmark chỉ xuất JSON cho bộ ellipse; vẫn xuất mask khi đánh giá bộ phân đoạn cũ. Ảnh, ZIP và báo cáo trong `output/` được `.gitignore` bỏ qua.

## Kiểm thử chức năng

```powershell
npm run test:dataset
uv run --with-requirements requirements.txt python tests/check_dataset_export.py
uv run --with-requirements requirements.txt python -m unittest discover -s tests -p "test_*.py"
```

Dùng camera giả và hình học biết trước để kiểm tra xuất ảnh/ellipse, chỉnh vòng, các trường hợp TP/FN/FP và đối chiếu Python với trình duyệt. Không coi các số kiểm thử này là kết quả mắt thật.

Video tệp (cần ffmpeg hoặc biến `FFMPEG_BINARY`):

```powershell
uv run --with-requirements requirements.txt python tests/create_dataset_video.py
node tests/browser/verify_dataset_video.cjs
```
