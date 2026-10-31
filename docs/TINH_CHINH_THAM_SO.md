# Tìm cấu hình DIP trên bộ ellipse đã kiểm duyệt

Giải nén bộ ZIP vào `output/tuning/dataset/`, giữ `annotations.json`, `predictions.json` và `images/`. Các nhãn cần `labelType: ellipse`, `reviewed: true`. Cần có thông số gốc trong `predictions.json` để so sánh cấu hình lúc thu.

```powershell
node tools/tune_pupil.cjs --dataset output/tuning/dataset --output output/tuning/search --workers 6
```

Công cụ đọc đúng các hàm DIP được nhúng trong tool nhãn. Ảnh PNG được thu nhỏ bằng canvas của trình duyệt giống demo; sau đó worker Node chạy cùng mã JavaScript để thử cấu hình và chấm IoU ở kích thước ảnh gốc. Không huấn luyện mạng, không thay đổi nhãn, không đổi cấu hình mặc định demo.

Các pha gồm:

1. Cấu hình lúc thu và mặc định demo.
2. Kênh xám/đỏ, bật/tắt trung vị/Gaussian, các mức blur.
3. Tương phản đen/trắng/gamma trên các cấu hình tốt.
4. Gamma đầu vào.
5. Ngưỡng thủ công bước 8, rồi tinh chỉnh quanh các mức tốt, cùng ngưỡng tự động.
6. Rà lại tương tác kênh/lọc/blur sau các thay đổi trên.

Mỗi cấu hình được chấm trên toàn bộ ảnh dùng trong tìm kiếm, không chỉ một vài khung đẹp. Điểm chính là IoU ellipse trung bình; mất dấu tính bằng 0. Khi bằng điểm, ưu tiên tỷ lệ mất dấu thấp rồi sai số tâm thấp. Có thêm IoU riêng trên nhãn `manual-reviewed` để phân biệt với nhãn duyệt từ dự đoán.

Đây là tìm kiếm nhiều pha, không quét mọi tổ hợp và không bảo đảm cực đại toàn cục. Số cấu hình tùy việc trùng lặp tham số và các cấu hình được chọn ở pha trước.

Đầu ra:

- `ranking.csv`: cấu hình, IoU, sai số tâm, mất dấu và nguồn pha.
- `search-results.json`: từng kết quả trên từng ảnh; cập nhật sau mỗi pha.
- `best-settings.json`: cấu hình tốt nhất đã thử.
- `top-1/` đến `top-5/`: JSON dự đoán để chấm lại bằng Python.
- `summary.json`: hai mốc so sánh và 10 cấu hình đầu.

Chạy lại cấu hình tốt trong trình duyệt và chấm Python:

```powershell
node tools/benchmark_pupil.cjs --annotations output/tuning/dataset/annotations.json --images output/tuning/dataset --settings output/tuning/search/best-settings.json --output output/tuning/best-browser --method robust
uv run --with-requirements requirements.txt python tools/evaluate_pupil.py --annotations output/tuning/dataset/annotations.json --predictions output/tuning/best-browser/predictions.json --output output/tuning/best-browser
```

Thời gian từng phép xử lý trong lượt tìm kiếm nhiều worker chịu ảnh hưởng tải CPU; không coi nó là FPS của demo. Đo hiệu năng riêng trong trình duyệt khi máy không chạy tìm kiếm.

Một bộ đã dùng để chọn thông số trở thành bộ tinh chỉnh, dù thuộc tính `split` ban đầu tên là `test`. Không sửa thuộc tính đầu vào để che điều đó. Giữ cấu hình cố định rồi thu bộ khác nếu muốn đánh giá độc lập. Nhãn duyệt từ chính dự đoán không độc lập với thuật toán; ảnh liên tiếp cùng video có tương quan. Không có ảnh `absent` thì chưa đo được tỷ lệ báo nhầm.

Các ảnh và toàn bộ kết quả trong `output/` tiếp tục được bỏ qua bởi Git.
