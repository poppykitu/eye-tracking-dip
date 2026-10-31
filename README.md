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

Video chạy xử lý ngay trong trình duyệt: gamma → kênh xám/đỏ → trung vị 3×3 → Gaussian 3×3 → giãn tương phản → ngưỡng đảo Otsu/thủ công → hình thái học → khớp biên ellipse. Chấp nhận tỷ lệ trục từ 0.12 nếu biên phù hợp, thay vì loại cứng dưới 0.4; khi phép mở làm mất ellipse thon trong cấu hình kính, dùng lại ứng viên hợp lệ trước hình thái học. Khung xử lý tối đa rộng 320 px và khoảng 76.800 pixel. Cần đưa một mắt cận cảnh vào khung hình. Nền tối hoặc lông mi vẫn có thể bị chọn nhầm. Các phép lọc, phân ngưỡng và khớp ellipse video chạy trong Web Worker riêng; giao diện chỉ lấy/vẽ khung và cập nhật trạng thái. Tối đa một khung đang xử lý, không xếp hàng khung cũ; giới hạn khoảng 10 khung/giây và ngừng gửi khi tab bị ẩn. Worker được hủy khi tắt camera hoặc chuyển về Ảnh. Khung 3D chỉ vẽ khi đang hiển thị và nội dung thay đổi. Không gửi video lên máy chủ.

Nếu trình duyệt chặn webcam khi mở file trực tiếp, chạy `uv run python -m http.server 8765 --bind 127.0.0.1 --directory output` tại thư mục dự án, rồi mở `http://localhost:8765/demo.html`. Tắt máy chủ bằng Ctrl+C khi dùng xong.

### Dùng với kính gắn camera

1. Cắm camera USB, chọn **Video → Camera cận mắt gắn kính / IR**, cho phép webcam rồi chọn đúng thiết bị.
2. Chiều ảnh mặc định **90° theo chiều kim đồng hồ**, phù hợp ảnh camera nghiêng người dùng cung cấp. Có thể chọn 0°, 90°, 180°, 270° và lật ngang. Cả ảnh trước xử lý và pipeline đều dùng cùng khung đã xoay, không chỉ xoay CSS. Giữ một mắt cận cảnh trong khung; video tìm trên toàn ảnh, không có ROI giới hạn.
3. Chế độ kính có **Đẩy nền sáng, giữ đồng tử tối**: chỉnh mức đen, mức trắng và gamma đường cong; bấm **Xem tiền xử lý — bước 6** để xem ảnh xám trước phân ngưỡng. Ở chế độ này, giữ mức đen gốc bằng 0 và nâng sáng theo phân vị 98%; không trừ phân vị 2% để tránh ép chi tiết đồng tử về đen. Mặc định mức đen 0, mức trắng 135, gamma 1.7. Sau đó ánh xạ t = clip((r − mức đen)/(mức trắng − mức đen), 0, 1), s = 255 × (3t² − 2t³)^gamma. Đây là đường cong chữ S, có thể làm mất chi tiết ở vùng bị ép về đen/trắng.

4. Xem bước **10. Tìm tâm đồng tử**. Cấu hình kính thử các ngưỡng từ histogram toàn khung và Otsu trên ảnh tương phản ở bước 6. Phân ngưỡng trên toàn ảnh, không cắt vùng tìm kiếm. Lọc hình thái, độ khớp biên ellipse và độ tương phản bên trong/vành ngoài chọn ứng viên. Tắt tự động để chỉnh ngưỡng thủ công 0–255 trên đúng ảnh bước 6. Mặt nạ nhị phân vẫn hiển thị các vùng phụ dưới ngưỡng; bước 10 mới chọn đồng tử.
5. Bấm **Tái dựng nhãn cầu · 1 điểm**. Giữ nhìn chấm giữa màn hình và xoay đầu nhẹ trái/phải, lên/xuống. Camera phải gắn cố định với kính/đầu. Chương trình thu ellipse ở nhiều hướng, loại mẫu lặp và ngoại lai, rồi khớp tâm chiếu và bán kính cầu hiệu dụng. Bắt đầu thử khớp từ 24 ellipse; tự kết thúc ngay khi khớp đạt điều kiện với ít nhất 24 mẫu đa dạng. Không dựng cầu mặc định nếu chưa đủ dữ liệu.
6. Xem mô hình trong **Nhãn cầu 3D — khớp từ ellipse tracking** và xuất ellipse/mô hình bằng JSON. Tâm, bán kính và đám điểm 3D đều xuất phát từ dữ liệu đo; đơn vị tương đối theo ảnh, không phải mm. Mống mắt và chiếu sáng là minh họa. Xem giả định toán học trong `docs/TAI_DUNG_NHAN_CAU.md`.
7. Hiệu chuẩn con trỏ 2D 12 điểm vẫn có trong mục tùy chọn riêng. Nó dùng ánh xạ affine đến màn hình và không phải bước tái dựng nhãn cầu. Các chức năng dừng bằng Esc, lấy mẫu ổn định và vòng thu dần được giữ lại.

Tái dựng hiện là ước lượng tham số mô hình cầu dưới giả định đồng tử tròn, tâm quay cố định và phối cảnh yếu; chưa tái dựng bề mặt sinh học đầy đủ, chưa biết độ sâu camera tuyệt đối và chưa điều khiển con trỏ hệ điều hành. Đã kiểm tra mặt nạ ellipse thon thật người dùng gửi, cùng dữ liệu hình học tổng hợp có nhiễu/ngoại lai. Hiệu quả tái dựng với kính thật cần thu trực tiếp. Tham khảo ý tưởng từ JEOresearch/EyeTracker; xem `THIRD_PARTY_NOTICES.md`.

Nguồn mô hình mặc định là **Tái dựng từ ellipse tracking**: hiển thị ellipse đã thu khi chưa khớp được cầu, và hiển thị mặt cầu cùng tâm đồng tử 3D sau khi khớp thành công. Chế độ **Minh họa 2D / xoay thử** là tùy chọn riêng để trình diễn bằng thanh điều chỉnh, không dùng chứng minh tái dựng. Cả hai chạy offline trên nền đen.

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
9. Ứng dụng: lọc contour theo diện tích tương đối 0.15%–15% ROI, solidity và sai lệch biên so với ellipse; chấp nhận tỷ lệ trục từ 0.12. Trục nhỏ phải đạt 2.4 px và trục lớn ít nhất 8% cạnh ngắn ROI để hạn chế đốm nhỏ. Các tham số được thử trên bộ mẫu này, chưa kiểm tra tổng quát.

Điểm chọn Python = 0.45 × exp(−6 × sai lệch biên chuẩn hóa) + 0.15 × solidity + 0.20 × độ tối + 0.20 × hỗ trợ diện tích. Hỗ trợ diện tích = min(1, diện tích/(0.018 × diện tích ROI)), giảm chọn đốm nhỏ mà không loại cứng ellipse thon. Độ tròn chỉ ghi lại để tham khảo. Đây là điểm xếp hạng thủ công, không phải xác suất hay độ chính xác.

Để giảm nhầm mí mắt/mống mắt nâu thành đồng tử, pipeline ảnh hiện kết hợp R−B ≤ 8 và mức xám < 200 nếu phân vị 75% của R−B > 20. Ảnh gần trung tính tự bỏ điều kiện màu. Đây là quy tắc theo bộ mẫu màu, không bảo đảm hiệu quả với mọi mắt hoặc chiếu sáng IR. Các bước ROI trong demo được đặt vào đúng tọa độ toàn khung để so sánh trước–sau.

Trong chế độ Ảnh, thay đổi bảng thông số sẽ tính lại ngay bằng JavaScript ở trình duyệt: gamma, trung vị, Gaussian, kênh màu, phân vị tương phản, ngưỡng Otsu/thủ công, điều kiện màu và hình thái học. Có nút khôi phục kết quả Python mặc định và lưu bước đang xem. Bản chỉnh trực tiếp xử lý ảnh xem trước 320/640/1024 px, dùng khớp biên ellipse trong JavaScript và có thể khác kết quả Python. Thí nghiệm PSNR bên dưới vẫn là thí nghiệm độc lập với thông số cố định đã ghi rõ.

## Các điều kiện thử nghiệm

Pipeline có 32 trường hợp: 8 ảnh × 4 điều kiện. Ba biến thể được tạo từ ảnh gốc, không phải dữ liệu camera thu riêng:

- Sáng: `clip(1.35 × ảnh + 35)`; có mất dữ liệu do clipping.
- Tối: `clip(0.28 × ảnh)`.
- Nhiễu: cộng Gaussian sigma 28 trên ảnh màu gốc, seed 42, sau đó mới thu nhỏ và xử lý.

Thí nghiệm lọc nhiễu ở cuối demo là một thí nghiệm độc lập: chuyển ảnh tham chiếu sang xám ở 1024 px, thêm Gaussian sigma 20 hoặc muối tiêu 4%, so sánh trung vị 5×5 và Gaussian 5×5. PSNR được tính so với ảnh tham chiếu trước khi thêm nhiễu. Ảnh tham chiếu vẫn có khuyết điểm thực tế của ảnh gốc, không phải ảnh mắt lý tưởng sạch nhiễu.

`PSNR = 10 log10(255² / MSE)`. Giá trị cao hơn nghĩa là sai khác bình phương trung bình nhỏ hơn so với ảnh tham chiếu. Không dùng PSNR này làm độ chính xác eye tracking. Nhiễu tổng hợp giúp kiểm tra có kiểm soát, không chứng minh hiệu quả với mọi nhiễu thực tế.

## Đầu ra

Git chỉ lưu `output/demo.html` và `output/annotate.html` để mở ngay. Các PNG, số đo, ảnh chụp QA, bản trình chiếu và tệp xuất khác được sinh trên máy và bỏ qua bởi `.gitignore`. Chạy lại chương trình để tạo chúng.

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

## Nhánh cải tiến theo nghiên cứu

Xem [Hướng dẫn gán nhãn và đánh giá](docs/NGHIEN_CUU_VA_DANH_GIA.md). Chế độ video kính thêm khớp ellipse bền vững khi bị che một phần, mặt nạ vùng nhìn thấy riêng và kiểm tra chất lượng khung. Ellipse suy ra được đánh dấu màu cam để cảnh báo biên chưa đầy đủ, nhưng được sử dụng cho 3D như ellipse xanh. Mở `output/annotate.html` để tự gán nhãn ảnh thật, rồi chấm bằng IoU/Dice, sai số tâm và tỷ lệ mất dấu. Bảng kết quả lịch sử trong `docs/EVALUATION_SYNTHETIC.md` chỉ là dữ liệu tổng hợp, chưa phải kết quả đánh giá trên kính thật hoặc bộ dữ liệu của nghiên cứu.

### Blur bổ sung trước phân ngưỡng video

Ở cấu hình camera kính, lớp Gaussian bổ sung đặt sau ảnh tương phản (bước 6), trước phân ngưỡng (bước 7). Control gồm bật/tắt, kernel 3–15 và sigma 0,5–4. Mặc định 5×5, sigma 1,2. Bấm **Xem ảnh sau blur** hoặc bước **6b** để xem đúng đầu vào phân ngưỡng. Tăng blur giúp làm nhẹ các dải tối nhỏ như lông mi nhưng cũng có thể làm lệch biên đồng tử; cần xem lại bước 10 sau khi chỉnh. Thay đổi thông số sẽ xóa hiệu chuẩn/mô hình đã thu vì đầu vào hình học đã thay đổi. Lớp này chạy trong Web Worker.

### Lấp lỗ phản xạ đèn ở mặt nạ hình thái

Cấu hình kính có control **Lấp lỗ phản xạ đèn ở bước 8**, mặc định bật với giới hạn tổng diện tích lỗ 8% (điều chỉnh 1–20%). Chỉ lấp lỗ nhỏ nằm kín trong thành phần đồng tử đã chọn và bên trong ellipse; không lấp khe thông ra nền hoặc vùng rỗng lớn. Không cần phóng to kernel đóng/mở nên giữ nguyên biên ngoài. Bước 8 hiển thị mặt nạ được sửa; bước 7 và mặt nạ vùng nhìn thấy ở bước 11 giữ nguyên để không làm sai đánh giá. Việc xếp hạng vùng và khớp ellipse vẫn dùng mặt nạ trước lấp; đây không phải khôi phục chi tiết ảnh gốc bị chói.

### Video tìm đồng tử trên toàn khung

Đã bỏ các ô giới hạn ROI và khung chữ nhật ROI ở chế độ video. Ngưỡng, kiểm tra chất lượng và tìm ứng viên trong cấu hình kính dùng toàn bộ ảnh đã thu nhỏ. Chế độ webcam thường cũng tìm trên toàn khung; ảnh cận mắt nên chiếm phần lớn khung để hạn chế chọn nhầm nền tối. Kiểm thử gồm đồng tử nhìn rõ gần cả bốn cạnh, nằm ngoài ROI cũ. Thí nghiệm ảnh tĩnh / notebook giữ cấu hình riêng.


## Cấu trúc và quản lý tệp

| Vị trí | Nội dung |
|---|---|
| `eye_tracking.py`, `*.js`, `report_template.html`, `annotation_tool.html` | Mã nguồn xử lý và giao diện |
| `Xu_ly_anh_mat_DIP.ipynb` | Notebook thuật toán ảnh tĩnh |
| `data/` | 8 ảnh nguồn cần để tái lập thí nghiệm |
| `docs/` | Tài liệu thuật toán, tái dựng và đánh giá nghiên cứu |
| `tests/browser/`, `tests/fixtures/` | Kiểm thử JavaScript/trình duyệt và ảnh hồi quy cần thiết |
| `tools/` | Công cụ build, xuất ảnh, sinh dữ liệu và đánh giá |
| `output/` | Hai demo HTML được lưu Git; phần còn lại là đầu ra cục bộ |

Chạy lệnh từ thư mục gốc dự án. Cập nhật demo sau khi sửa JavaScript mà không tính lại ảnh:

```powershell
uv run python tools/build_demo.py
```

Kiểm thử trình duyệt cần Node.js và Playwright (`npm install`, cài Edge hoặc `npx playwright install msedge`). Các bài webcam dùng camera giả, không mở camera thật.

```powershell
node tests/browser/verify_notched_pupil.cjs
node tests/browser/verify_occlusion.cjs
node tests/browser/verify_reconstruction.cjs
node tests/browser/verify_video_worker.cjs
uv run --with-requirements requirements.txt python -m unittest discover -s tests -p "test_*.py"
```

Giữ ảnh trong `data/` và `tests/fixtures/` vì thuật toán và kiểm thử phụ thuộc chúng. Không dùng quy tắc bỏ qua toàn bộ `*.png`/`*.jpg`. Tệp tạm, log, cache, đầu ra mới trong `output/`, báo cáo và slide cục bộ không được thêm vào Git. Bỏ theo dõi đầu ra không xóa bản sao trên máy và không xóa lịch sử commit cũ.
