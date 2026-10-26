# Xử lý ảnh mắt phục vụ eye tracking

## Notebook thuật toán

Mở `Xu_ly_anh_mat_DIP.ipynb` bằng JupyterLab hoặc VS Code và chọn **Run All**. Notebook có mã thuật toán ảnh tĩnh chia từng bước, công thức, ảnh trước–sau, thí nghiệm nhiễu/PSNR và kết quả trên 8 ảnh. Sửa `IMAGE_NAME`, `CONDITION`, `THRESHOLD` ở ô cấu hình để thử lại. Giữ thư mục `data` cạnh notebook. Notebook có sẵn đầu ra để xem ngay.

```powershell
uv run --with-requirements requirements-notebook.txt jupyter lab Xu_ly_anh_mat_DIP.ipynb
```

Hoặc dùng Python: `python -m pip install -r requirements-notebook.txt`, sau đó `python -m jupyterlab Xu_ly_anh_mat_DIP.ipynb`. Notebook chứa mã Python độc lập; video trên trình duyệt vẫn được triển khai trong `webcam.js`.

Chương trình DIP dùng Python, OpenCV và NumPy. Dữ liệu là 8 ảnh mắt cận cảnh người dùng cung cấp. Không huấn luyện mô hình và không dùng ML. Trọng tâm là cải thiện ảnh và phân đoạn; tâm đồng tử là ứng dụng thử nghiệm cuối quy trình.

## Mở ngay khi thuyết trình

Nhấp đúp `MO_DEMO.bat`, hoặc mở `output/demo.html` trong Edge/Chrome. Demo đã xuất sẵn và chạy offline, không cần Python hay internet để xem. Giữ tab trình duyệt mở trước lúc thuyết trình.

Giao diện nền đen có hai chế độ **Ảnh** và **Video**, giảm vùng sáng trên màn hình khi thu ảnh mắt. Chọn Video sẽ yêu cầu quyền webcam của trình duyệt (nếu đã cho phép trước đó, trình duyệt có thể không hỏi lại). Bấm Cho phép để bắt đầu; dùng menu chọn camera khi có nhiều thiết bị. Nút Tắt webcam hoặc chuyển về Ảnh sẽ dừng camera. Có thể lưu khung hình đã xử lý bằng nút Lưu ảnh đã xử lý.

Video chạy xử lý ngay trong trình duyệt: gamma → kênh xám/đỏ → trung vị 3×3 → Gaussian 3×3 → giãn tương phản → ngưỡng đảo Otsu/thủ công → đóng và mở 3×3. Bước 9 hiển thị histogram; bước 10 lọc các vùng liên thông trong ROI xanh theo diện tích, độ tròn và tỷ lệ trục, rồi vẽ trọng tâm và ellipse ước lượng từ moment vùng. Bạn có thể tắt tự động để chỉnh gamma và ngưỡng. Video dùng khung rộng 320 px; cần đưa một mắt cận cảnh vào ROI. Các thông số và ellipse moment khác pipeline ảnh tĩnh để phù hợp xử lý trực tiếp. Nền tối hoặc lông mi có thể bị chọn nhầm; chưa hiệu chuẩn điểm nhìn. Không gửi video lên máy chủ.

Nếu trình duyệt chặn webcam khi mở file trực tiếp, chạy `uv run python -m http.server 8765 --bind 127.0.0.1 --directory output` tại thư mục dự án, rồi mở `http://localhost:8765/demo.html`. Tắt máy chủ bằng Ctrl+C khi dùng xong.

### Dùng với kính gắn camera

1. Cắm camera USB, chọn **Video → Camera cận mắt gắn kính / IR**, cho phép webcam rồi chọn đúng thiết bị.
2. Chọn xoay 180° hoặc lật ngang nếu cần. Chỉnh ROI sao cho chứa một mắt, tránh gọng kính và vùng nền tối.
3. Xem bước **10. Tìm tâm đồng tử**. Cấu hình kính tìm ô tối 9×9 trong ROI rồi thử các ngưỡng mức tối +5, +15, +25. Lọc hình thái và đặc trưng vùng chọn một ứng viên. Có thể tắt tự động để chỉnh ngưỡng thủ công trên ảnh Gaussian, khác ngưỡng trên ảnh tương phản ở cấu hình thường.
4. Bấm **Hiệu chuẩn tự động** một lần rồi nhìn theo chấm cam. Mỗi điểm chờ 1,4 giây để bạn chuyển mắt, sau đó tự ghi khi có ít nhất 12 khung hợp lệ và tâm ổn định trong 1,2 giây. Chương trình tự chuyển đủ 5 vị trí. Mất dấu hoặc mắt còn di chuyển sẽ làm bước hiện tại chờ lại, không cần bấm ghi từng điểm. Có thanh tiến độ và nút Dừng hiệu chuẩn.
5. Chấm xanh trên ô mô phỏng chạy theo ánh xạ affine 2D. Khi mất dấu, con trỏ được ẩn. Thay camera, ROI, chiều ảnh hoặc thông số video sẽ yêu cầu hiệu chuẩn lại.

Đây là demo 2D theo dõi camera cận mắt, chưa chạy mô hình nhãn cầu 3D hoặc điều khiển con trỏ hệ điều hành. Hiệu quả với kính thật cần kiểm tra trực tiếp; các phép kiểm tra tự động dùng camera giả lập và dữ liệu tổng hợp. Tham khảo thuật toán từ JEOresearch/EyeTracker; xem `THIRD_PARTY_NOTICES.md`.

1. Chọn ảnh và điều kiện gốc, sáng, tối hoặc nhiễu.
2. Bật so sánh trước và sau, lần lượt chọn các bước xử lý.
3. Chọn Histogram để giải thích phân bố sáng; chọn các bước gamma, lọc và tương phản để xem ảnh đã sửa.
4. Cuộn xuống thí nghiệm lọc nhiễu để so sánh Gaussian và trung vị bằng ảnh và PSNR.
5. Phần tìm tâm là kết quả ứng dụng sau phân đoạn, không phải mục tiêu chính của demo.

## Chạy lại chương trình

Có uv: nhấp `CHAY_XU_LY.bat`, hoặc chạy trong thư mục dự án:

```powershell
uv run --with-requirements requirements.txt python eye_tracking.py
```

Nếu dùng Python có sẵn:

```powershell
python -m pip install -r requirements.txt
python eye_tracking.py
```

Chạy ảnh khác hoặc thử ngưỡng cố định, xuất sang thư mục mới để giữ kết quả mặc định:

```powershell
uv run --with-requirements requirements.txt python eye_tracking.py --input data --output output_threshold40 --threshold 40
```

Ảnh mới cần là một mắt chụp cận cảnh, có bố cục tương tự mẫu. Không hỗ trợ ảnh toàn khuôn mặt trong cấu hình hiện tại. Đường dẫn tiếng Việt được hỗ trợ bằng imdecode/imencode.

## Quy trình và cơ sở DIP

1. Thu nhỏ ảnh về chiều rộng tối đa 1024 pixel để giảm tính toán. Các số đo tâm và diện tích được đổi về kích thước đầu vào.
2. Tính trung vị mức xám toàn ảnh để chọn gamma. Công thức `s = 255 × (r/255)^gamma`; gamma nhỏ hơn 1 làm sáng và lớn hơn 1 làm tối. Mục tiêu trung vị 130, giới hạn gamma 0.4–1.4; giữ gamma 1 nếu trung vị 90–170. Đây là quy tắc kinh nghiệm, không phải bảo đảm phơi sáng đúng cho mọi cảnh.
3. Lọc trung vị 5×5 từng kênh để giảm nhiễu điểm. Đánh đổi là mất chi tiết nhỏ.
4. Giới hạn ROI cố định x=18%–87%, y=20%–85% của ảnh, phù hợp bố cục mẫu. Hiển thị ảnh xám để đối chiếu; phân đoạn thực tế sử dụng kênh đỏ.
5. Kênh đỏ giúp phân biệt đồng tử xanh đen với mống mắt nâu trên các ảnh màu này. Không suy rộng lựa chọn này cho mọi mắt hoặc ảnh IR.
6. Gaussian 7×7 trên kênh đỏ để làm mịn. Giãn tương phản theo phân vị 2%–98%, đưa giá trị về 0–255; đây không phải equalizeHist/CLAHE.
7. Ngưỡng đảo: vùng tối thành trắng. Tự thử ngưỡng 5–100 bước 5, chọn cặp ngưỡng và contour theo quy tắc hình dạng; có thể ghi đè bằng `--threshold`.
8. Đóng với phần tử cấu trúc ellipse 5×5, hai lần; mở một lần, để nối khe nhỏ và giảm chi tiết nhiễu.
9. Ứng dụng: lọc contour theo diện tích tương đối 1.8%–13% ROI, độ tròn, solidity và tỷ lệ trục; khớp ellipse, vẽ tâm. Các tham số được thử trên bộ mẫu này, chưa kiểm tra tổng quát.

Điểm chọn = 0.45 × circularity + 0.25 × solidity + 0.20 × tỷ lệ trục + 0.10 × độ tối. Đây là điểm xếp hạng thủ công, không phải xác suất hay độ chính xác.

Để giảm nhầm mí mắt/mống mắt nâu thành đồng tử, pipeline ảnh hiện kết hợp R−B ≤ 8 và mức xám < 200 nếu phân vị 75% của R−B > 20. Ảnh gần trung tính tự bỏ điều kiện màu. Đây là quy tắc theo bộ mẫu màu, không bảo đảm hiệu quả với mọi mắt hoặc chiếu sáng IR. Các bước ROI trong demo được đặt vào đúng tọa độ toàn khung để so sánh trước–sau.

Trong chế độ Ảnh, thay đổi bảng thông số sẽ tính lại ngay bằng JavaScript ở trình duyệt: gamma, trung vị, Gaussian, kênh màu, phân vị tương phản, ngưỡng Otsu/thủ công, điều kiện màu và hình thái học. Có nút khôi phục kết quả Python mặc định và lưu bước đang xem. Bản chỉnh trực tiếp xử lý ảnh xem trước 320/640/1024 px, dùng ellipse moment và có thể khác kết quả Python. Thí nghiệm PSNR bên dưới vẫn là thí nghiệm độc lập với thông số cố định đã ghi rõ.

## Các điều kiện thử nghiệm

Pipeline có 32 trường hợp: 8 ảnh × 4 điều kiện. Ba biến thể được tạo từ ảnh gốc, không phải dữ liệu camera thu riêng:

- Sáng: `clip(1.35 × ảnh + 35)`; có mất dữ liệu do clipping.
- Tối: `clip(0.28 × ảnh)`.
- Nhiễu: cộng Gaussian sigma 28 trên ảnh màu gốc, seed 42, sau đó mới thu nhỏ và xử lý.

Thí nghiệm lọc nhiễu ở cuối demo là một thí nghiệm độc lập: chuyển ảnh tham chiếu sang xám ở 1024 px, thêm Gaussian sigma 20 hoặc muối tiêu 4%, so sánh trung vị 5×5 và Gaussian 5×5. PSNR được tính so với ảnh tham chiếu trước khi thêm nhiễu. Ảnh tham chiếu vẫn có khuyết điểm thực tế của ảnh gốc, không phải ảnh mắt lý tưởng sạch nhiễu.

`PSNR = 10 log10(255² / MSE)`. Giá trị cao hơn nghĩa là sai khác bình phương trung bình nhỏ hơn so với ảnh tham chiếu. Không dùng PSNR này làm độ chính xác eye tracking. Nhiễu tổng hợp giúp kiểm tra có kiểm soát, không chứng minh hiệu quả với mọi nhiễu thực tế.

## Đầu ra

- `output/demo.html`: demo tương tác tự chứa ảnh, chạy offline.
- `output/<tên ảnh>/`: các bước ảnh PNG ở điều kiện gốc; các thư mục bright, dark, noise chứa các biến thể và kết quả xử lý.
- `balanced.png`: ảnh đầy đủ sau gamma; `denoised.png`: ảnh đầy đủ sau gamma và trung vị. Đây là hai đầu ra cải thiện ảnh, khác với ảnh vẽ đường bao.
- `histogram.png`: histogram trước và sau gamma + trung vị.
- `enhanced.png`: ROI kênh đỏ sau Gaussian và giãn tương phản.
- `metrics.csv`, `results.json`: số đo pipeline.
- `noise_evaluation.csv`: PSNR cho hai loại nhiễu tổng hợp trên 8 ảnh.
- `overview.jpg`: tổng hợp kết quả định vị trên 8 ảnh gốc.

## Giới hạn cần trình bày

Ảnh màu không chứng minh quá trình thu dưới chiếu sáng IR. Camera bỏ IR filter cũng có thể thu ánh sáng khả kiến. Chưa có dữ liệu xác nhận điều kiện chiếu sáng của bộ mẫu.

Gamma chỉ điều chỉnh dữ liệu còn tồn tại, không tái tạo vùng cháy sáng. Lọc nhiễu không loại được phản xạ gương lớn. Mí mắt và lông mi làm biến dạng đường biên. ROI cố định đòi hỏi vị trí mắt tương đối ổn định. Tâm ellipse có thể lệch và vùng ứng viên có thể sai. Chưa có nhãn tâm chuẩn, kiểm thử camera trực tiếp, hiệu chuẩn điểm nhìn hoặc điều khiển thiết bị thực tế. Phát chuỗi 8 ảnh chỉ là trình chiếu mẫu rời rạc.

Nội dung thuyết trình và cách liên hệ báo cáo tiến độ nằm trong `THUYET_TRINH.md`.
