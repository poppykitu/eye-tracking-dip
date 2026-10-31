# Kịch bản thuyết trình: Xử lý ảnh mắt phục vụ eye tracking

**Môn học:** Xử lý ảnh số — Digital Image Processing (DIP).  
**Phiên bản:** xử lý từng khung video, cấu hình camera cận mắt gắn kính.  
**Cấu trúc:** 6 phần, 15 slide, khoảng 10–13 phút.  
**Cách dùng:** sao chép “Nội dung trên slide” vào màn hình; dùng “Lời thuyết trình” làm ghi chú. Sáu trang thuật toán giữ bố cục như các slide người dùng đã thiết kế: tiêu đề tiếng Anh, nguyên lý, áp dụng và ảnh trước–sau.

## Mục lục sáu phần

1. **Bài toán và dữ liệu — Problem and Data.**
2. **Quy trình xử lý — Processing Pipeline.**
3. **So sánh sau xử lý — Before-and-After Comparison.**
4. **Xác định đồng tử — Pupil Detection.**
5. **Giới hạn hiện có — Current Limitations.**
6. **Demo — System Demonstration.**

## Thứ tự slide

| Slide | Phần | Tiêu đề | Tên tiếng Anh |
| --- | --- | --- | --- |
| 01 | Mở đầu | Xử lý ảnh mắt phục vụ eye tracking | Eye Image Processing for Eye Tracking |
| 02 | Mở đầu | Nội dung báo cáo | Presentation Outline |
| 03 | 01 | Bài toán xử lý ảnh mắt | Problem Statement |
| 04 | 01 | Dữ liệu video và thu nhận khung hình | Video Input and Frame Acquisition |
| 05 | 02 | Quy trình xử lý ảnh | Processing Pipeline |
| 06 | 03 | Hiệu chỉnh gamma | Gamma Correction |
| 07 | 03 | Lọc trung vị | Median Filtering |
| 08 | 03 | Lọc Gaussian | Gaussian Filtering |
| 09 | 03 | Tăng tương phản | Contrast Enhancement |
| 10 | 03 | Phân ngưỡng | Thresholding |
| 11 | 03 | Đóng và mở hình thái học | Morphological Closing and Opening |
| 12 | 04 | Ước lượng tâm đồng tử | Pupil Center Estimation |
| 13 | 05 | Giới hạn hiện tại | Current Limitations |
| 14 | 06 | Demo chương trình | System Demonstration |
| 15 | Kết thúc | Kết luận và trao đổi | Conclusion and Discussion |

## Slide 01 — Xử lý ảnh mắt phục vụ eye tracking

**Nội dung trên slide**

- XỬ LÝ ẢNH MẮT PHỤC VỤ EYE TRACKING.
- Báo cáo môn Xử lý ảnh số.
- Họ tên, lớp, giảng viên: điền thông tin thực tế.

**Hình ảnh:** khung mắt và ellipse từ demo video. Không đưa công thức hay đoạn dài lên trang bìa.

**Lời thuyết trình — khoảng 20 giây**

> Kính chào Thầy/Cô và các bạn. Nhóm em trình bày đề tài xử lý ảnh mắt phục vụ eye tracking. Chương trình nhận video từ camera, xử lý từng khung hình bằng các phương pháp xử lý ảnh truyền thống và thử ước lượng tâm đồng tử. Báo cáo tập trung vào nguyên lý, kết quả từng bước và cách đánh giá.

## Slide 02 — Nội dung báo cáo

**Nội dung trên slide:** sáu phần trong mục lục, đánh số 01–06.

**Bố cục:** lưới 3 cột × 2 hàng theo mẫu. Viết đủ “Demo chương trình” và “Giới hạn và phát triển”, tránh cắt chữ.

**Lời thuyết trình — khoảng 20 giây**

> Bài báo cáo gồm sáu phần: bài toán và dữ liệu video, quy trình xử lý, so sánh sau xử lý, xác định đồng tử, giới hạn hiện có và cuối cùng là demo. Phần kỹ thuật kết thúc ở cách xác định và vẽ tâm; sau đó chuyển sang giới hạn và demo.

## Phần 01 — Bài toán và dữ liệu

### Slide 03 — Bài toán xử lý ảnh mắt

**Nội dung trên slide**

- Đầu vào: video cận cảnh một mắt.
- Khó khăn: độ sáng thay đổi, phản xạ, mí mắt và lông mi che biên.
- Mục tiêu: cải thiện khung hình, phân đoạn và ước lượng tâm đồng tử.

**Hình ảnh:** khung mắt gốc, chỉ ra phản xạ và vùng bị che; có thể đặt một kết quả bên cạnh.

**Lời thuyết trình — khoảng 40 giây**

> Trong ảnh mắt, các vùng tối còn có lông mi và bóng mí mắt. Phản xạ trên giác mạc tạo điểm sáng, còn chuyển động làm hình dạng và độ sáng thay đổi giữa các khung. Vì vậy, chương trình cần tiền xử lý trước khi phân đoạn. Đầu ra là vùng ứng viên và tâm trong ảnh. Để suy ra điểm nhìn trên màn hình, hệ thống còn cần hiệu chuẩn và đánh giá riêng.

### Slide 04 — Dữ liệu video và thu nhận khung hình

**Nội dung trên slide**

- Nhận video từ webcam hoặc camera cận mắt gắn kính.
- Lấy từng khung, xoay/lật theo cấu hình.
- Thu nhỏ tối đa rộng 320 px và khoảng 76.800 điểm ảnh.
- Chỉnh vùng quan tâm ROI chứa một mắt.

**Hình ảnh:** giao diện Video gồm khung camera và khung xử lý. Nếu dùng ba khung liên tiếp để minh họa chuyển động, trích từ cùng video thực tế.

**Lời thuyết trình — khoảng 40 giây**

> Đầu vào chính là video trực tiếp từ camera. Chương trình lấy khung, chỉnh hướng rồi thu nhỏ để giảm tính toán. ROI là vùng quan tâm được đặt quanh một mắt, giúp giới hạn nơi tìm đồng tử. Các phép tính chạy trong trình duyệt và kết quả cập nhật theo khung. Tốc độ thực tế phụ thuộc thiết bị và kích thước xử lý.

**Ghi chú:** không dùng số “8 ảnh × 4 điều kiện = 32 trường hợp” để mô tả dữ liệu video. Không tự điền số video, thời lượng, số người hoặc FPS. Giới hạn gửi khoảng 10 khung/giây trong mã không phải tốc độ đã đo.

## Phần 02 — Quy trình xử lý

### Slide 05 — Processing Pipeline

**Nội dung trên slide**

Giữ đúng sáu mốc của slide quy trình đang thiết kế:

| Giai đoạn | Mô tả ngắn |
| --- | --- |
| **Gamma Correction** | Cân chỉnh độ sáng khung hình. |
| **Median Filtering** | Trung vị 3 × 3, giảm nhiễu điểm. |
| **Gaussian Filtering** | Gaussian 3 × 3, làm mịn ảnh. |
| **Contrast Enhancement** | Tăng chênh lệch giữa vùng sáng và tối. |
| **Thresholding** | Tạo mặt nạ nhị phân vùng tối. |
| **Morphological Closing and Opening** | Nối khe nhỏ, giảm vùng nhiễu nhỏ. |

**Bố cục:** sáu mốc từ trái sang phải như ảnh mẫu. Trên sơ đồ có thể rút gọn nhãn cuối thành “Morphological”; trang chi tiết viết đủ “Closing and Opening”.

**Lời thuyết trình — khoảng 50 giây**

> Sáu bước chính là gamma, trung vị, Gaussian, tăng tương phản, phân ngưỡng và hình thái học. Sau gamma, ảnh được chuyển về một kênh trước khi lọc; cấu hình kính mặc định dùng ảnh xám. Kết thúc sáu bước, chương trình tiếp tục xét vùng liên thông và khớp ellipse để lấy tâm. Histogram là nhánh quan sát mức sáng, không phải phép lọc nối tiếp sau hình thái học.

**Chuyển ý:** “Sau đây là nguyên lý và kết quả trước–sau của từng bước trên cùng một đầu vào.”

## Phần 03 — So sánh sau xử lý

### Slide 06 — Gamma Correction

**Nội dung trên slide**

**Nguyên lý hiệu chỉnh gamma**  
Điều chỉnh mức sáng theo công thức **s = 255 × (r/255)^γ**. Khi **γ < 1**, ảnh sáng hơn; khi **γ > 1**, ảnh tối hơn. **γ = 1** giữ nguyên mức sáng.

**Áp dụng trong chương trình**  
Gamma được chọn tự động theo trung vị độ sáng hoặc chỉnh thủ công, giúp cân chỉnh khung hình trước lọc và phân ngưỡng. Phép biến đổi không khôi phục chi tiết đã mất do cháy sáng.

**Ảnh:** nguồn và `01_Gamma.png`, hiển thị cùng kênh màu. Không gán thay đổi màu–xám cho gamma.

**Lời thuyết trình — khoảng 45 giây**

> Gamma là phép biến đổi phi tuyến trên cường độ pixel. Gamma nhỏ hơn một nâng mức sáng thấp; gamma lớn hơn một hạ mức sáng. Chương trình tự chọn theo trung vị hoặc cho phép chỉnh tay. Riêng bộ ảnh vừa xuất, gamma tự động bằng một nên cường độ được giữ nguyên. Nếu muốn minh họa tác động làm sáng, cần chạy lại cùng ảnh với gamma khác một và ghi rõ giá trị đã dùng.

**Ghi chú:** gamma ở đây khác gamma 1,7 của đường cong tương phản. Ảnh Gamma đã xuất vẫn là ảnh màu; chuyển xám là bước riêng sau đó.

### Slide 07 — Median Filtering

**Nội dung trên slide**

**Nguyên lý lọc trung vị**  
Thay mỗi điểm ảnh bằng **giá trị trung vị của 9 điểm** trong cửa sổ **3 × 3**. Phép lọc giảm ảnh hưởng của các điểm sáng hoặc tối bất thường trong lân cận.

**Áp dụng trong chương trình**  
Áp dụng trên ảnh một kênh sau hiệu chỉnh gamma, trước Gaussian và phân ngưỡng. Ảnh bớt nhiễu điểm nhưng có thể mất một số chi tiết nhỏ.

**Ảnh:** ảnh sau gamma đã chuyển xám và `02_Median.png`.

**Lời thuyết trình — khoảng 40 giây**

> Trung vị xét chín giá trị trong cửa sổ 3 × 3, sắp xếp rồi lấy giá trị giữa để thay pixel trung tâm. Những điểm khác biệt mạnh với lân cận sẽ bớt ảnh hưởng. Bộ lọc giúp giảm nhiễu điểm nhưng không loại hết nhiễu hoặc giữ nguyên mọi chi tiết. Bước này xử lý ảnh một kênh sau gamma.

### Slide 08 — Gaussian Filtering

**Nội dung trên slide**

**Nguyên lý lọc Gaussian**  
Thay mỗi điểm ảnh bằng **trung bình có trọng số** trong cửa sổ **3 × 3**. Các điểm gần tâm có trọng số lớn hơn, giúp làm mịn ảnh và giảm dao động cường độ nhỏ.

**Áp dụng trong chương trình**  
Thực hiện sau lọc trung vị, trước tăng tương phản và phân ngưỡng. Ảnh được làm mịn hơn, nhưng đường biên và chi tiết nhỏ có thể bị mờ.

**Ảnh:** `02_Median.png` và `03_Gaussian.png`.

**Lời thuyết trình — khoảng 40 giây**

> Gaussian lấy trung bình có trọng số, ưu tiên điểm gần tâm. Trong mã, cửa sổ 3 × 3 dùng trọng số 1–2–1 theo hai chiều, chuẩn hóa tổng bằng 16. Kết quả mượt hơn trước bước tương phản. Vì biên cũng có thể bị mờ, không nên mô tả Gaussian như một phép loại sạch lông mi.

### Slide 09 — Contrast Enhancement

**Nội dung trên slide**

**Nguyên lý tăng tương phản**  
Giãn dải mức sáng bằng cách ánh xạ các giá trị ban đầu sang khoảng **0–255**. Trong cấu hình kính, chương trình kết hợp **đường cong chữ S** để điều chỉnh mức sáng tiếp theo.

**Áp dụng trong chương trình**  
Thực hiện sau Gaussian, giúp vùng quanh đồng tử sáng hơn và đồng tử vẫn tối để hỗ trợ phân ngưỡng. Mặc định: **mức đen 0, mức trắng 135, gamma đường cong 1,7**.

**Ảnh:** `03_Gaussian.png` và `04_Contrast.png`.

**Lời thuyết trình — khoảng 50 giây**

> Tăng tương phản ánh xạ lại mức sáng để các vùng khác nhau rõ hơn. Cấu hình kính giữ mốc đen bằng không, chọn mốc sáng từ phân bố pixel rồi nâng dải sáng. Khi bật tùy chọn, ảnh tiếp tục qua đường cong chữ S. Mục tiêu là làm rõ đồng tử tối so với vùng quanh nó. Nếu đặt mức trắng quá thấp, vùng sáng bị ép về trắng và mất chi tiết, như có thể thấy trong ảnh minh họa.

**Ghi chú kỹ thuật:** mốc sáng là phân vị 98%, nghĩa là khoảng 98% pixel không sáng hơn mốc này. Ánh xạ đầu tiên giữ mức đen 0 và tính `clip(r × 255 / mốc_sáng, 0, 255)`. Đường cong tiếp theo dùng `t = clip((r − black)/(white − black), 0, 1)` rồi `255 × (3t² − 2t³)^γ`. Toàn bộ bước không chỉ là giãn tuyến tính min–max. Giữ thuật ngữ và công thức chi tiết ở ghi chú, không đưa vào hai đoạn trên slide nếu thiếu chỗ.

### Slide 10 — Thresholding

**Nội dung trên slide**

**Nguyên lý phân ngưỡng**  
So sánh mức sáng của từng điểm ảnh với ngưỡng **T**. Với phân ngưỡng đảo, điểm ảnh **≤ T thành trắng**, còn lại thành đen, tạo ảnh nhị phân.

**Áp dụng trong chương trình**  
Thực hiện trên ảnh đã tăng tương phản trong ROI. Ngưỡng được chọn tự động hoặc chỉnh thủ công để tạo các vùng ứng viên đồng tử, sau đó xử lý hình thái học.

**Ảnh:** `04_Contrast.png` và `05_Thresholding.png`. Vùng trắng phụ vẫn là kết quả của phép ngưỡng, chưa phải tất cả đều là đồng tử.

**Lời thuyết trình — khoảng 45 giây**

> Phân ngưỡng đưa ảnh nhiều mức xám về đen và trắng. Vì đồng tử thường tối, chương trình dùng ngưỡng đảo: pixel nhỏ hơn hoặc bằng T thành trắng. Cấu hình kính thử nhiều ngưỡng từ histogram ROI và Otsu rồi xét chất lượng ứng viên; người dùng cũng có thể chỉnh tay. Lông mi hoặc mí đủ tối vẫn thành trắng, nên mặt nạ mới chứa các vùng ứng viên.

### Slide 11 — Morphological Closing and Opening

**Nội dung trên slide**

**Nguyên lý đóng và mở hình thái học**  
Phép **đóng** thực hiện giãn rồi co để nối khe và lấp lỗ nhỏ. Phép **mở** thực hiện co rồi giãn để loại các vùng trắng nhỏ, sử dụng phần tử cấu trúc vuông **3 × 3**.

**Áp dụng trong chương trình**  
Thực hiện sau phân ngưỡng để làm sạch mặt nạ trước khi tìm tâm đồng tử. Nếu ellipse thon bị biến dạng, chương trình có thể giữ ứng viên hợp lệ trước bước này.

**Ảnh:** `05_Thresholding.png` và `06_Morphological.png`. Giữ nguyên vùng phụ còn tồn tại; không sửa tay mặt nạ thành hình tròn hoàn hảo.

**Lời thuyết trình — khoảng 50 giây**

> Hình thái học thao tác lên hình dạng vùng trắng bằng phần tử 3 × 3. Đóng là giãn rồi co, giúp nối khe và lấp một số lỗ nhỏ; mở là co rồi giãn để giảm chi tiết nhỏ. Tuy nhiên, biên và ellipse thon có thể bị biến dạng. Cấu hình kính vì vậy có thể chọn lại ứng viên hợp lệ trước hình thái học. Bước này hỗ trợ làm sạch, không bảo đảm chỉ còn đồng tử.

## Phần 04 — Xác định đồng tử

### Slide 12 — Pupil Center Estimation

**Nội dung trên slide**

**Nguyên lý ước lượng tâm**  
Từ các điểm trên đường biên vùng đồng tử, tìm ellipse phù hợp nhất với đường biên đó. Lấy tâm ellipse làm vị trí đồng tử ước lượng.

**Áp dụng trong chương trình**  
Hàm **fitEllipseFromBoundary()** tính tâm, hai bán trục và góc nghiêng. Sau khi kiểm tra độ phù hợp, chương trình vẽ **ellipse xanh và dấu tâm đỏ** lên khung hình.

**Ảnh:** mặt nạ người dùng gửi và kết quả `output/tim_tam_dong_tu/02_Tam_tren_anh_mat.png` đã chạy trên cùng nguồn. Có thể dùng thêm `01_Tam_tren_mat_na.png` để chỉ rõ vị trí ellipse trên mặt nạ.

**Lời thuyết trình — khoảng 50 giây**

> Sau phân đoạn, chương trình lấy các điểm trên đường biên rồi dùng hàm fitEllipseFromBoundary để tìm ellipse phù hợp với đường biên đó. Kết quả cho biết tâm, hai bán trục và góc nghiêng. Sau khi kiểm tra độ phù hợp, chương trình vẽ đường ellipse xanh và dấu tâm đỏ lên ảnh. Đây là vị trí ước lượng trong khung hình; để biết mức độ chính xác cần so với tọa độ được đánh dấu chuẩn.

**Câu chuyển sang giới hạn:** “Đó là kết quả của quy trình từ khung camera đến vị trí tâm đồng tử. Tiếp theo, nhóm em nêu một số giới hạn còn gặp trước khi chuyển sang demo.”

**Ghi chú kỹ thuật:** hàm nằm trong `ellipse_geometry.js`, chuẩn hóa tọa độ điểm biên rồi khớp phương trình `Ax² + Bxy + Cy² + Dx + Ey = 1` theo bình phương tối thiểu đại số. Đây không phải tối ưu khoảng cách vuông góc chính xác từ điểm đến ellipse. Hàm cần ít nhất 12 điểm biên để thử khớp; bước tìm ứng viên còn có phương án dự phòng từ moment nếu hàm không trả ellipse. Bản Python ảnh tĩnh trước đây gọi `cv2.fitEllipse(contour)`, còn video hiện tại dùng hàm JavaScript tự triển khai. Không ghi demo video gọi trực tiếp `cv2.fitEllipse()`.

## Phần 05 — Giới hạn hiện có

### Slide 13 — Giới hạn hiện tại

**Nội dung trên slide**

- Phản xạ và che khuất có thể làm sai hoặc mất dấu đồng tử.
- ROI và ngưỡng cần điều chỉnh theo camera và điều kiện chiếu sáng.
- Chưa có đánh giá đầy đủ trên video có nhãn chuẩn để xác định sai số tâm và tỷ lệ mất dấu.
- FPS và độ trễ cần đo trên thiết bị thực tế; chưa thể khẳng định hiệu năng thời gian thực.
- Tâm đồng tử trong ảnh chưa phải điểm nhìn trên màn hình; cần hiệu chuẩn riêng.
- Lọc và hình thái học có thể làm mờ hoặc biến dạng biên.


**Hình ảnh:** một trường hợp khó đã xác nhận. Nếu chỉ minh họa điều kiện khó, ghi như vậy thay vì gán lỗi chưa kiểm chứng.

**Lời thuyết trình — khoảng 40 giây**

> Chương trình vẫn có thể tìm sai hoặc mất dấu khi phản xạ mạnh, mắt chuyển động hoặc bị che khuất. Lọc và hình thái học có thể làm thay đổi đường biên, còn ROI và ngưỡng cần phù hợp với camera thực tế. Hiện chưa có đánh giá đầy đủ bằng video có nhãn chuẩn nên chưa đưa ra tỷ lệ chính xác. Hướng cải thiện là bổ sung dữ liệu và đo sai số cũng như độ ổn định. Sau đây nhóm em chuyển sang demo để quan sát trực tiếp kết quả.

## Phần 06 — Demo

### Slide 14 — Demo chương trình

**Nội dung trên slide**

- Chọn camera, hướng ảnh và ROI.
- Quan sát từng bước và thay đổi tham số.
- Xem mặt nạ, ellipse và tâm theo khung hình.
- Có thể mở nhãn cầu ảo ở cuối demo nếu cần minh họa chức năng mở rộng.

**Bố cục:** ảnh giao diện video và ba nhãn trên; mở sẵn cửa sổ demo trước giờ báo cáo.

**Kịch bản thao tác — khoảng 90 giây; thêm 30 giây nếu giới thiệu nhãn cầu ảo**

| Thời gian | Thao tác | Lời nói |
| --- | --- | --- |
| 0–15 giây | Chọn Video, camera, cấu hình kính; kiểm tra hướng và ROI | “Chương trình lấy và xử lý từng khung camera trong trình duyệt.” |
| 15–30 giây | Xem Gamma rồi Kênh ảnh | “Gamma cân chỉnh sáng; cấu hình kính mặc định dùng ảnh xám.” |
| 30–45 giây | Xem Trung vị, Gaussian, Tương phản | “Hai bộ lọc là 3 × 3; tương phản ánh xạ lại dải sáng trước phân ngưỡng.” |
| 45–60 giây | Xem Phân ngưỡng và Hình thái học; thử ngưỡng thủ công | “Vùng tối thành trắng; đổi ngưỡng sẽ làm mặt nạ thay đổi.” |
| 60–75 giây | Xem Histogram rồi Tìm tâm | “Histogram so sánh mức xám đầu vào với ảnh sau tương phản. Tâm lấy từ ứng viên khớp ellipse.” |
| 75–90 giây | Cho mắt chuyển động nhẹ; quan sát tâm và mất dấu | “Tâm được cập nhật khi có ứng viên phù hợp. Độ ổn định cần đo trên video có nhãn.” |
| Tùy chọn, thêm 30 giây | Nếu đã chuẩn bị camera gắn kính, mở phần nhãn cầu ảo hoặc bản ghi có nguồn rõ ràng | “Đây là phần mở rộng dùng nhiều ellipse để ước lượng mô hình nhãn cầu tương đối.” |

**Lời dẫn:** “Sau các ảnh minh họa trên cùng một đầu vào, nhóm em trình diễn video camera để quan sát thay đổi giữa các khung và tác động của tham số.”

**Chuẩn bị:** mở `MO_DEMO.bat`, thử camera và quyền truy cập. Nếu file trực tiếp không mở webcam, dùng máy chủ localhost theo README. Camera gắn kính phải giữ ổn định tương đối với đầu để thu mô hình. Dành 30 giây cuối để giới thiệu thao tác thu, không hứa sẽ khớp xong trong thời gian đó. Nếu cần xem kết quả ngay, chuẩn bị bản ghi của lần thu thành công và ghi rõ nguồn. Khi chưa khớp, giải thích trạng thái đang thu, không chuyển sang cầu minh họa rồi gọi đó là kết quả tái dựng. Hiệu chuẩn con trỏ 2D là chức năng riêng, chỉ mở thêm khi cần.

## Slide 15 — Kết luận và trao đổi

**Nội dung trên slide**

- Xử lý từng khung video bằng các phương pháp DIP.
- Minh họa sáu bước và ứng dụng ước lượng tâm.
- Từ ellipse, vẽ tâm và thử dựng mô hình nhãn cầu ảo.
- Cảm ơn Thầy/Cô và các bạn.

**Lời thuyết trình — khoảng 20 giây**

> Nhóm em đã xây dựng quy trình video với các đầu ra từng bước có thể quan sát và điều chỉnh. Từ mặt nạ, chương trình khớp ellipse, vẽ tâm đồng tử và thu nhiều mẫu để thử dựng nhãn cầu ảo. Hướng tiếp theo là đánh giá độ chính xác và độ ổn định trên dữ liệu thực tế. Nhóm em xin cảm ơn và sẵn sàng trao đổi.

## Phụ lục A — Đối chiếu 10 bước giao diện

Sáu mốc trên slide 05 là các phép xử lý chính được chọn để giải thích. Giao diện có đủ mười mục; bảng này là ghi chú đối chiếu, không thêm thành slide bắt buộc.

| Mục demo | Tên tiếng Anh | Nội dung |
| --- | --- | --- |
| 1. Đầu vào | Video Frame Acquisition | Lấy khung, xoay/lật, thu nhỏ. |
| 2. Gamma | Gamma Correction | Theo trung vị độ sáng hoặc chỉnh tay. |
| 3. Kênh ảnh | Grayscale Conversion / Red Channel Extraction | Ảnh xám hoặc kênh đỏ; kính mặc định xám. |
| 4. Trung vị | Median Filtering | Trung vị 3 × 3. |
| 5. Gaussian | Gaussian Filtering | Gaussian 3 × 3. |
| 6. Tương phản | Contrast Enhancement | Ánh xạ dải sáng; kính có tùy chọn đường cong chữ S. |
| 7. Phân ngưỡng | Inverse Binary Thresholding | Pixel ≤ T thành trắng trong ROI. |
| 8. Hình thái học | Morphological Closing and Opening | Đóng rồi mở vuông 3 × 3; có thể chọn lại ứng viên trước bước này. |
| 9. Histogram | Intensity Histogram Visualization | Nhánh hiển thị ảnh xám đầu vào và ảnh sau tăng tương phản. |
| 10. Tìm tâm | Pupil Center Estimation via Ellipse Fitting | Xét vùng liên thông, khớp biên ellipse, lấy tâm. |

## Phụ lục B — Ghép ảnh và thông số minh họa

Thư mục ảnh: `C:/Users/poppy/OneDrive/Documentos/ChatGPT/EYE TRACKING/output/sau_giai_doan_video/`.

| Slide | Trước | Sau |
| --- | --- | --- |
| 06 — Gamma | Ảnh mắt nguồn người dùng gửi | `01_Gamma.png` |
| 07 — Median | `01_Gamma.png` sau chuyển xám | `02_Median.png` |
| 08 — Gaussian | `02_Median.png` | `03_Gaussian.png` |
| 09 — Contrast | `03_Gaussian.png` | `04_Contrast.png` |
| 10 — Thresholding | `04_Contrast.png` | `05_Thresholding.png` |
| 11 — Morphology | `05_Thresholding.png` | `06_Morphological.png` |

Bộ sáu ảnh là minh họa trên một ảnh nguồn được đưa qua chính thuật toán video. Chúng không phải sáu thời điểm liên tiếp, không chứng minh độ ổn định tracking.

Thông số từ `thong_so.json`: nguồn 330 × 443, xử lý 239 × 321; gamma đầu quy trình **1**; ảnh một kênh là xám; trung vị/Gaussian **3 × 3**; tương phản **0 / 135 / 1,7**; ngưỡng tự động **222**; ROI x=23–213, y=32–287 (không gồm biên phải 214 và dưới 288).

Các giá trị thuộc bộ ảnh minh họa. Khi chạy camera, đọc tham số thực tế; không coi ngưỡng 222 là mặc định cho mọi ảnh. Giữ đúng tỷ lệ ảnh, không chỉnh mặt nạ để làm kết quả đẹp hơn.

## Phụ lục C — Câu hỏi dự phòng

**Vì sao gamma không làm ảnh minh họa sáng hơn?** Giá trị tự động của ảnh này bằng 1 nên giữ nguyên cường độ. Muốn thể hiện tác động cần chạy lại cùng ảnh với gamma khác 1 và ghi rõ giá trị.

**Vì sao dùng cả trung vị và Gaussian?** Trung vị chọn giá trị giữa để giảm ảnh hưởng nhiễu điểm; Gaussian lấy trung bình có trọng số để làm mịn. Dùng nối tiếp cần cân nhắc chi tiết và biên bị mất.

**Có loại hết lông mi và phản xạ không?** Không. Các vùng đó có thể còn trong mặt nạ; bước chọn ứng viên hình học và tương phản tiếp tục phân biệt. Một số trường hợp vẫn thất bại.

**Tương phản có phải chỉ dùng công thức min–max không?** Cấu hình kính ánh xạ dải sáng rồi thêm đường cong chữ S khi bật tùy chọn. Giãn tuyến tính giải thích bước ánh xạ, không mô tả đầy đủ cả chuỗi.

**Otsu chọn ngưỡng thế nào?** Otsu dùng histogram để tìm mức ngưỡng tách hai nhóm cường độ tốt theo độ tách biệt giữa nhóm. Cấu hình kính thử thêm ngưỡng khác từ histogram và chọn theo chất lượng ứng viên.

**Vì sao sau hình thái học còn vùng trắng phụ?** Đóng và mở tác động lên cấu trúc nhỏ, không nhận biết ngữ nghĩa đồng tử. Các vùng tối lớn hoặc liền mạch có thể vẫn tồn tại.

**Vẽ được tâm có nghĩa là tìm đúng chưa?** Dấu tâm hiển thị tọa độ của ellipse được chọn. Muốn biết có đúng hay không cần so với nhãn chuẩn và đo sai số; một dấu vẽ đẹp không đủ chứng minh.

**Dựng nhãn cầu có phải chỉ vẽ một quả cầu 3D không?** Chế độ tái dựng dùng các ellipse đã thu để ước lượng mô hình. Chế độ cầu minh họa là tùy chọn riêng và không chứng minh đã tái dựng từ dữ liệu.

**Đủ 24 ellipse thì chắc chắn có mô hình không?** Chưa chắc. Các mẫu còn phải đủ đa dạng và nhất quán để phép khớp đạt điều kiện.

**Mô hình có đo kích thước mắt bằng milimét không?** Chưa. Các tham số theo tỷ lệ ảnh, chưa có thước chuẩn và hiệu chuẩn camera để suy ra kích thước tuyệt đối.

**Có dùng học máy không?** Quy trình này dùng biến đổi mức sáng, lọc không gian, phân ngưỡng, hình thái học và khớp hình học; không huấn luyện mô hình học máy.

**Video xử lý ở đâu?** Xử lý cục bộ trên trình duyệt trong Web Worker, tối đa một khung đang tính để tránh dồn khung cũ. FPS và độ trễ cần đo trên thiết bị thực tế.

## Nguồn đối chiếu

- `C:/Users/poppy/OneDrive/Documentos/ChatGPT/EYE TRACKING/webcam.js`: xử lý video, gamma, chuyển kênh, lọc và tương phản.
- `C:/Users/poppy/OneDrive/Documentos/ChatGPT/EYE TRACKING/glasses.js`: chọn ngưỡng, tương phản ứng viên, phương án trước hình thái học.
- `C:/Users/poppy/OneDrive/Documentos/ChatGPT/EYE TRACKING/ellipse_geometry.js`: khớp và đánh giá ellipse.
- `C:/Users/poppy/OneDrive/Documentos/ChatGPT/EYE TRACKING/docs/TAI_DUNG_NHAN_CAU.md`: cách thu ellipse, giả định và giới hạn của mô hình nhãn cầu.
- `C:/Users/poppy/OneDrive/Documentos/ChatGPT/EYE TRACKING/output/sau_giai_doan_video/thong_so.json`: cấu hình bộ ảnh đã xuất.

Không chuyển chức năng đã có thành tuyên bố độ chính xác hoặc hiệu năng chưa được đo. Không dùng ảnh màu để khẳng định điều kiện chiếu sáng IR nếu chưa có thông tin thu nhận.
