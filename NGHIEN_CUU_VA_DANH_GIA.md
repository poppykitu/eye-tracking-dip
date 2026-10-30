# Cải tiến phân đoạn và kiểm thử dựa trên nghiên cứu

Nguồn: Garbin và cộng sự, *Dataset for Eye Tracking on a Virtual Reality Platform* (ETRA 2020). [Trang công bố của tác giả](https://ischtz.github.io/publication/etra-2020-dataset-eye-tracking/).

## Phạm vi đã triển khai

- Cải tiến đường xử lý **Video / camera gắn kính** bằng xử lý ảnh cổ điển, vẫn chạy trong Web Worker.
- Phân biệt **mặt nạ phần đồng tử nhìn thấy** và **ellipse đầy đủ ước lượng**. Không tô bù phần che khuất vào mặt nạ dùng đo IoU.
- Khớp bình phương tối thiểu cho biên rõ; với biên không đều, thử RANSAC giới hạn 128 giả thuyết và tinh chỉnh bằng các điểm hỗ trợ. Kiểm tra sai lệch theo pixel, tỷ lệ biên hỗ trợ, độ phủ góc và diện tích vùng nhìn thấy so với ellipse. Nếu không đủ hỗ trợ thì không trả ellipse.
- Ellipse suy ra từ biên bị che được vẽ **màu cam**, có cờ `occluded`, `method`, `supportFraction`, `arcCoverage` và `reconstructionEligible=false`. Cả bước thu mẫu và hàm khớp cầu đều bỏ các mẫu được đánh dấu suy đoán. Đây không phải bộ phát hiện che khuất hoàn hảo; có thể chưa nhận ra một số trường hợp che nhẹ.
- Cảnh báo tương phản quá thấp hoặc nhiều điểm ảnh gốc cháy sáng/gần đen, tính trong ROI trước tăng tương phản. Đây là kiểm tra chất lượng bằng ngưỡng kinh nghiệm, không chẩn đoán mắt nhắm. Khung thiếu tương phản bị bỏ tracking; cảnh báo cháy sáng chỉ là cảnh báo, không tự loại mọi vùng nền trắng.
- Thêm bước **11. Mặt nạ đồng tử nhìn thấy** ở cấu hình kính.
- Thêm công cụ gán nhãn, bộ xuất dự đoán dùng đúng `computeVideoFrame`, và đánh giá bằng nhãn tham chiếu.

Không thay mô hình cầu hiện có, không đưa mạng học sâu vào demo, không thay kết quả Python tĩnh / notebook. Đường xử lý ảnh tĩnh vẫn có giới hạn riêng.

## Điều rút ra từ bài báo và điều do dự án tự đề xuất

Mục 4 phân biệt nhãn ellipse và nhãn vùng nhìn thấy, kể cả khi có mí che. Mục 6 nhấn mạnh dữ liệu khó và sự thay đổi mức sáng; mục 6.1 chia dữ liệu theo người. Dự án tiếp thu cách định nghĩa đầu ra và đánh giá này.

Thuật toán RANSAC, các ngưỡng kiểm tra biên, công cụ web gán nhãn và CLI ở nhánh này là triển khai riêng cho môn DIP, **không phải mã thuật toán của bài báo**. Mạng mSegNet thử nghiệm trong bài không được tích hợp. Đám mây điểm giác mạc trong nghiên cứu được đo bằng thiết bị chuyên dụng, không dùng làm bằng chứng cho mô hình cầu suy ra từ ellipse của demo.

## Gán nhãn ảnh kính thật

1. Mở `output/annotate.html`, hoặc liên kết **Gán nhãn tham chiếu và đánh giá đồng tử** trên demo.
2. Nạp các ảnh gốc đã đúng chiều, không xoay/lật khác với ảnh dùng đánh giá. Mỗi tên ảnh phải duy nhất. Ảnh chụp giao diện đã có khung/ellipse chồng lên không phù hợp làm ảnh gốc.
3. Điền người, phiên quay và tập `tune` / `test`. Một người chỉ thuộc một tập; cả công cụ và bộ đánh giá đều kiểm tra điều này.
4. Vẽ đa giác sát phần đồng tử thực sự nhìn thấy. Không vẽ phần sau mí. Chọn trạng thái `visible`, `occluded`, `absent` hoặc `unusable`.
5. Chỉ khi xác định được hợp lý mới đặt ellipse đầy đủ bằng ba điểm: tâm, đầu trục lớn, đầu trục nhỏ. Không lấy tâm đa giác bị che làm tâm ellipse thật.
6. Lưu JSON. Có thể nạp lại JSON và các ảnh gốc để tiếp tục sửa. Đây là nhãn do người đặt, cần kiểm tra lại chất lượng; không tự sinh từ dự đoán của thuật toán.

Ảnh không thấy đồng tử (`absent`) không có đa giác/ellipse. Ảnh không đủ thông tin để làm đáp án (`unusable`) bị bỏ khỏi các chỉ số, có đếm số lượng đã bỏ. Đa giác là tọa độ pixel ảnh gốc; ellipse dùng bán trục `rx`, `ry` và góc radian.

## Chạy đánh giá

Bộ Python dùng `requirements.txt`. Bộ chạy trình duyệt cần Playwright và Edge; môi trường Codex hiện tại đã có. Ngoài môi trường này có thể cài `npm install --no-save playwright`. Nếu dùng Chromium, cài trình duyệt bằng `npx playwright install chromium`, rồi thêm `--browser chromium` vào lệnh benchmark.

```powershell
# Cập nhật giao diện / thuật toán JS, giữ nguyên thí nghiệm ảnh tĩnh đã nhúng.
uv run python tools/build_demo.py

# Dự đoán trên ảnh đã có nhãn, không xoay/lật ngầm.
node tools/benchmark_pupil.cjs --annotations "pupil-annotations.json" --images "data/anh_co_nhan" --output "output/evaluation_real/robust" --method robust

# Chấm điểm bằng đáp án của người gán.
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations "pupil-annotations.json" --predictions "output/evaluation_real/robust/predictions.json" --output "output/evaluation_real/robust"
```

Muốn đối chiếu, chạy lại benchmark với `--method direct` và thư mục đầu ra khác. Hai nhánh dùng cùng tiền xử lý/điểm vùng, chỉ đổi cách khớp ellipse; đây là **baseline direct-only**, không phải tái hiện nguyên trạng một commit cũ. Có thể dùng `--settings config.json` để ghi rõ cấu hình khác; cấu hình thực chạy được lưu vào từng dự đoán. So sánh phải dùng cùng cấu hình và cùng tập ảnh.

Kết quả gồm mặt nạ thành phần liên thông được chọn (PNG 0/255), `predictions.json`, `evaluation.json` và `evaluation.csv`.

## Ý nghĩa chỉ số

- **IoU, Dice vùng nhìn thấy**: so mặt nạ dự đoán với đa giác nhãn; không so ellipse điền kín với nhãn vùng bị che. Ảnh có đồng tử nhưng không tìm được bị chấm 0.
- **Tỷ lệ mất dấu**: số khung có đồng tử trong nhãn nhưng không có ellipse hợp lệ / số khung dương.
- **Tỷ lệ báo nhầm**: số khung `absent` nhưng có dự đoán / số khung `absent`. Không cộng điểm hai mặt nạ trống vào IoU trung bình vùng đồng tử.
- **Sai số tâm, IoU ellipse đầy đủ**: chỉ tính khi có ellipse tham chiếu đầy đủ và có dự đoán. Khi báo cáo phải kèm số khung được tính và tỷ lệ mất dấu. Không gán lỗi 0 cho khung mất dấu.
- Báo cáo riêng theo trạng thái và theo `tune` / `test`. Các ảnh `unusable` được ghi là bỏ qua, không coi là phát hiện đúng.

## Bằng chứng kiểm thử hiện tại

[Đánh giá tổng hợp](output/evaluation_synthetic/README.md) dùng 18 ảnh hình học sinh tự động, **không phải ảnh mắt thật, OpenEDS hay điểm của nghiên cứu**. Trên 12 khung cả baseline và bản mới đều tìm được, sai số tâm trung bình giảm từ khoảng 2,821 px xuống 0,305 px. Bản mới từ chối 4 ca che nặng, nên tỷ lệ mất dấu là 25% và IoU toàn bộ khung dương giảm; không thể nói mọi chỉ số đều cải thiện.

Các mặt nạ mỏng và ảnh mắt người dùng gửi vẫn được dùng cho kiểm thử hồi quy. Chưa có đủ nhãn mắt thật được người dùng kiểm tra độc lập để công bố độ chính xác thực tế. Công cụ đã sẵn sàng để làm bước đó; bộ nghiên cứu công bố chưa được tải hoặc chấm điểm.

Tái tạo bộ tổng hợp:

```powershell
uv run --with-requirements requirements.txt python tools/create_synthetic_occlusion_set.py
node tools/benchmark_pupil.cjs --annotations output/evaluation_synthetic/inputs/annotations.json --images output/evaluation_synthetic/inputs --output output/evaluation_synthetic/robust --method robust
node tools/benchmark_pupil.cjs --annotations output/evaluation_synthetic/inputs/annotations.json --images output/evaluation_synthetic/inputs --output output/evaluation_synthetic/direct --method direct
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/evaluation_synthetic/inputs/annotations.json --predictions output/evaluation_synthetic/robust/predictions.json --output output/evaluation_synthetic/robust
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/evaluation_synthetic/inputs/annotations.json --predictions output/evaluation_synthetic/direct/predictions.json --output output/evaluation_synthetic/direct
```
