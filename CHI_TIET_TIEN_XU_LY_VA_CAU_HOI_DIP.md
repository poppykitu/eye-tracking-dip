# TÀI LIỆU TOÀN DIỆN VỀ TIỀN XỬ LÝ ẢNH, ẢNH HƯỞNG THAM SỐ VÀ BỘ CÂU HỎI VẤN ĐÁP
## Môn học: Xử lý ảnh số (Digital Image Processing - DIP)
## Đề tài: Eye Tracking - Phát hiện và bám vết tâm mắt / đồng tử trong ảnh và video

---

## MỤC LỤC
1. [Tổng quan Pipeline Xử lý ảnh](#1-tổng-quan-pipeline-xử-lý-ảnh)
2. [Chi tiết các bước Tiền xử lý ảnh](#2-chi-tiết-các-bước-tiền-xử-lý-ảnh)
3. [Phân tích chi tiết: Tăng / Giảm thông số thì ảnh và kết quả bị ảnh hưởng như thế nào?](#3-phân-tích-chi-tiết-tăng--giảm-thông-số-thì-ảnh-và-kết-quả-bị-ảnh-hưởng-như-thế-nào)
4. [Thuật toán vẽ vòng tròn / Ellipse xanh và tìm tâm mắt](#4-thuật-toán-vẽ-vòng-tròn--ellipse-xanh-và-tìm-tâm-mắt)
5. [Bộ câu hỏi vấn đáp bảo vệ đồ án (DIP Defense Q&A)](#5-bộ-câu-hỏi-vấn-đáp-bảo-vệ-đồ-án-dip-defense-qa)

---

## 1. TỔNG QUAN PIPELINE XỬ LÝ ẢNH

Hệ thống hoạt động theo quy trình Xử lý ảnh số kinh điển trong miền không gian (Spatial Domain), không phụ thuộc vào Deep Learning hay mô hình huấn luyện black-box:

```
[Ảnh đầu vào (Ảnh / Video)]
          │
          ▼
1. Chuẩn hóa kích thước (Resize: 1024px / 320px)
          │
          ▼
2. Hiệu chỉnh Gamma thích nghi (Gamma Correction qua bảng LUT)
          │
          ▼
3. Khử nhiễu phi tuyến bằng Lọc trung vị (Median Filter 5x5 hoặc 3x3)
          │
          ▼
4. Cắt vùng quan tâm (ROI: x 18%-87%, y 20%-85%)
          │
          ▼
5. Tách trích không gian màu (Lấy riêng kênh Red)
          │
          ▼
6. Làm mịn tuyến tính bằng Lọc Gauss (Gaussian Blur 7x7)
          │
          ▼
7. Giãn tương phản tuyến tính theo phân vị 2%–98% (Contrast Stretching)
          │
          ▼
8. Mặt nạ lọc sắc độ da (Color Gate: Red - Blue <= 8)
          │
          ▼
9. Phân đoạn ngưỡng nhị phân đảo (Inverse Binary Thresholding / Otsu)
          │
          ▼
10. Toán tử Hình thái học (Morphology: Closing lấp phản xạ, Opening lọc lông mi)
          │
          ▼
11. Trích xuất đặc trưng hình học (Diện tích, Độ tròn, Độ lồi đặc, Tỷ lệ trục)
          │
          ▼
12. Khớp Ellipse (Least Squares Conic Fit / Image Moments) & Vẽ vòng xanh + Tâm đỏ
```

---

## 2. CHI TIẾT CÁC BƯỚC TIỀN XỬ LÝ ẢNH

### Bước 1: Chuẩn hóa kích thước (Resizing / Downscaling)
* **Kỹ thuật:** Phép biến đổi hình học thu phóng ảnh dựa trên nội suy song tuyến (Bilinear Interpolation).
* **Mục đích:** 
  * Giảm số lượng điểm ảnh cần tính toán, đảm bảo tốc độ thời gian thực (real-time $> 30$ FPS).
  * Chuẩn hóa tỷ lệ để các cửa sổ lọc không gian cố định ($5\times 5$, $7\times 7$) và các ngưỡng diện tích hoạt động nhất quán trên nhiều camera có độ phân giải khác nhau.

### Bước 2: Hiệu chỉnh Gamma (Gamma Correction)
* **Cơ sở toán học:** Biến đổi mức xám phi tuyến tính theo luật lũy thừa:
  $$s = c \cdot r^\gamma \quad \Longrightarrow \quad s = 255 \times \left(\frac{r}{255}\right)^\gamma$$
* **Cách thực thi:**
  * Tính trung vị mức xám toàn ảnh ($M$). Ngưỡng lý tưởng đặt ở mức $M \approx 130$.
  * Nếu $90 \le M \le 170$: Giữ nguyên $\gamma = 1.0$.
  * Nếu $M < 90$ (ảnh tối): Tự động chọn $\gamma < 1.0$ (chặn dưới ở mức $0.4$).
  * Nếu $M > 170$ (ảnh sáng chói): Tự động chọn $\gamma > 1.0$ (chặn trên ở mức $1.4$).
  * Dùng bảng tra **Look-Up Table (LUT)** 256 phần tử để ánh xạ trực tiếp, độ phức tạp $O(1)$ cho từng pixel.

### Bước 3: Lọc nhiễu trung vị (Median Filter)
* **Kỹ thuật:** Bộ lọc phi tuyến với cửa sổ kích thước $5\times 5$ (trên ảnh tĩnh) hoặc $3\times 3$ (trên webcam).
* **Mục đích:**
  * Loại bỏ triệt để **nhiễu muối tiêu (Salt-and-pepper noise)** và các hạt nhiễu cảm biến khi ghi hình ở môi trường thiếu sáng.
  * **Đặc tính then chốt:** Khác với lọc trung bình hay Gauss, lọc trung vị **bảo toàn đường biên cạnh (Edge-preserving)**, không làm mờ ranh giới của con ngươi.

### Bước 4: Trích xuất vùng quan tâm (ROI - Region of Interest)
* **Kỹ thuật:** Cắt mảng ma trận ảnh (Array Slicing) theo tỷ lệ: $x \in [0.18W, 0.87W]$, $y \in [0.20H, 0.85H]$.
* **Mục đích:** Loại trừ các vùng không liên quan (trán, mũi, gò má, phông nền), ngăn chặn các điểm tối ngoại vi (lỗ mũi, nốt ruồi, bóng tóc) gây nhiễu cho bước phân đoạn.

### Bước 5: Trích chọn kênh màu tối ưu (Color Channel Extraction - Kênh Red)
* **Kỹ thuật:** Lấy riêng ma trận màu Đỏ ($R = \text{ROI}[:, :, 2]$).
* **Mục đích sinh học:** 
  * Đồng tử hấp thụ gần như toàn bộ ánh sáng nên luôn rất tối ở mọi kênh.
  * Mống mắt (đặc biệt mắt người châu Á màu nâu hạt dẻ) và mô da mí mắt lại **phản xạ bước sóng đỏ rất mạnh** (giá trị mức xám ở kênh Red rất cao).
  * Lấy riêng kênh Red tạo ra **độ tương phản cực đại** giữa con ngươi và mống mắt/da, vượt trội so với ảnh xám tổng hợp $Y = 0.299R + 0.587G + 0.114B$.

### Bước 6: Làm mịn tuyến tính bằng Lọc Gauss (Gaussian Blur)
* **Kỹ thuật:** Nhân chập (convolution) với mặt nạ Gauss $7\times 7$ ($\sigma$ tự động) hoặc $3\times 3$.
* **Mục đích:** Làm phẳng các vân sọc li ti của mống mắt và mao mạch củng mạc, làm mượt gradient biên độ sáng trước khi tính ngưỡng.

### Bước 7: Giãn tương phản tuyến tính theo phân vị (Percentile Contrast Stretching)
* **Cơ sở toán học:** 
  $$I_{\text{enhanced}}(x, y) = \text{clip}\left( \frac{I(x,y) - P_2}{P_{98} - P_2} \times 255, \, 0, \, 255 \right)$$
* **Mục đích:** Trải đều dải mức xám hẹp của mắt về trọn vẹn dải $[0, 255]$. Việc loại bỏ $2\%$ điểm tối nhất ($P_2$) và $2\%$ điểm sáng nhất ($P_{98}$) giúp triệt tiêu các điểm phản xạ chói (outliers), tránh hiện tượng bão hòa cục bộ.

### Bước 8: Mặt nạ lọc sắc độ da (Color Gating)
* **Kỹ thuật:** Tính hiệu số mức sáng giữa kênh Đỏ và kênh Lam:
  $$\Delta = R - B, \quad \text{Mask} = (R - B \le 8) \land (\text{Gray} < 200)$$
* **Mục đích:** Mô da mí mắt và khóe mắt có nhiều mao mạch máu nên sắc đỏ vượt trội ($\Delta > 8$). Mặt nạ này triệt tiêu viền da mí mắt, chỉ giữ lại vùng màu đen xám trung tính của con ngươi.

---

## 3. PHÂN TÍCH CHI TIẾT: TĂNG / GIẢM THÔNG SỐ THÌ ẢNH VÀ KẾT QUẢ BỊ ẢNH HƯỞNG NHƯ THẾ NÀO?

Bảng phân tích trực quan tác động của từng siêu tham số (Hyperparameters):

### 3.1. Thông số Gamma ($\gamma$)
* **Giá trị chuẩn:** $\gamma = 1.0$ (hoặc tự động $0.4 - 1.4$).
* **Nếu TĂNG $\gamma$ quá cao ($\gamma = 1.8 - 2.5$):**
  * *Ảnh hưởng trên ảnh:* Ảnh bị tối đen sầm lại (underexposed), toàn bộ các vùng có độ xám trung bình và thấp đều bị kéo tụt sát mức 0.
  * *Ảnh hưởng đến tracking:* Mống mắt (iris), nếp gấp mí mắt và lông mi đều bị biến thành màu đen kịt tương đương đồng tử. Khi nhị phân hóa, tất cả dính chùm thành một mảng đen khổng lồ $\rightarrow$ **Mất hoàn toàn biên dạng tròn của con ngươi, thuật toán không thể phát hiện được tâm mắt.**
* **Nếu GIẢM $\gamma$ quá thấp ($\gamma = 0.2 - 0.4$):**
  * *Ảnh hưởng trên ảnh:* Ảnh bị thừa sáng, bạc màu, mờ đục như phủ một lớp sương trắng (washed out).
  * *Ảnh hưởng đến tracking:* Vùng con ngươi bị đẩy lên mức xám sáng (mất độ tối đặc trưng), làm triệt tiêu độ tương phản với mống mắt $\rightarrow$ **Ảnh nhị phân bị thủng lỗ chỗ hoặc con ngươi biến mất hoàn toàn, báo lỗi `NO VALID CANDIDATE`.**

### 3.2. Kích thước nhân Lọc trung vị (Median Filter Kernel Size $k$)
* **Giá trị chuẩn:** $k = 5\times 5$ (ảnh tĩnh) hoặc $3\times 3$ (webcam).
* **Nếu TĂNG $k$ quá lớn ($k = 11\times 11, 15\times 15$):**
  * *Ảnh hưởng trên ảnh:* Ảnh bị hiện tượng "bệt màu" (posterization/oversmoothing), mất hoàn toàn các chi tiết mịn, các góc cạnh bị gọt tù tròn.
  * *Ảnh hưởng đến tracking:* Đường biên tròn của đồng tử bị co rút, biến dạng méo mó hoặc lấn sâu vào vùng mống mắt; tốc độ tính toán chậm rõ rệt (FPS giảm sâu vì lọc trung vị phải sắp xếp mảng 121 đến 225 phần tử cho mỗi pixel).
* **Nếu GIẢM $k$ quá nhỏ ($k = 1\times 1$ tức không lọc, hoặc $k = 3\times 3$ trên ảnh gốc độ phân giải cao):**
  * *Ảnh hưởng trên ảnh:* Còn nguyên các hạt nhiễu muối tiêu, nhiễu hạt cảm biến ISO cao, sợi lông mi rụng.
  * *Ảnh hưởng đến tracking:* Khi nhị phân, các hạt nhiễu biến thành hàng trăm đốm trắng li ti rải rác $\rightarrow$ Thuật toán phải duyệt và lọc contour rất nặng, dễ nhận nhầm một cụm nhiễu đốm làm con ngươi.

### 3.3. Kích thước nhân Lọc Gauss (Gaussian Blur Kernel Size & $\sigma$)
* **Giá trị chuẩn:** $7\times 7$, $\sigma = 0$ (tự suy từ kernel).
* **Nếu TĂNG quá lớn ($15\times 15, 21\times 21$):**
  * *Ảnh hưởng trên ảnh:* Ảnh nhòe mờ diện rộng (heavy blurring), biên độ chuyển mức xám giữa đồng tử và mống mắt bị trải rộng, độ dốc gradient giảm mạnh.
  * *Ảnh hưởng đến tracking:* Vị trí đường biên nhị phân bị sai lệch vị trí thật, tâm ellipse bị trượt lệch vài pixel so với tâm quang học chuẩn.
* **Nếu GIẢM quá nhỏ ($3\times 3$ hoặc bỏ qua):**
  * *Ảnh hưởng trên ảnh:* Các đường gân máu nhỏ trên tròng trắng và các vân tia của mống mắt vẫn còn sắc nét.
  * *Ảnh hưởng đến tracking:* Đường biên của đồng tử sau khi nhị phân bị răng cưa lởm chởm (jagged boundary) $\rightarrow$ Chỉ số độ tròn (Circularity) và độ lồi đặc (Solidity) bị sụt giảm nghiêm trọng $\rightarrow$ Bộ lọc hình học đánh trượt ứng viên con ngươi thật.

### 3.4. Phân vị Giãn tương phản ($P_{low}, P_{high}$)
* **Giá trị chuẩn:** $P_2 = 2\%, P_{98} = 98\%$.
* **Nếu CẮT QUÁ MẠNH (ví dụ $P_{low} = 15\%, P_{high} = 85\%$):**
  * *Ảnh hưởng trên ảnh:* Bão hòa mức xám (Clipping). Các pixel có mức xám từ 0 đến $P_{15}$ đều bị ép thành 0 (đen tuyệt đối); các pixel từ $P_{85}$ đến 255 đều biến thành 255 (trắng tuyệt đối).
  * *Ảnh hưởng đến tracking:* Mống mắt bị biến thành màu đen hoàn toàn cùng với đồng tử $\rightarrow$ Hỏng phân đoạn.
* **Nếu KHÔNG CẮT (ví dụ $P_{low} = 0\%, P_{high} = 100\%$ tức Min-Max thông thường):**
  * *Ảnh hưởng trên ảnh:* Nếu trong ảnh có dù chỉ 1 điểm bóng đèn phản xạ chói lóa (giá trị 255) và 1 sợi lông mi đen kịt (giá trị 0), khoảng giãn không có bất kỳ tác dụng nào $\rightarrow$ Ảnh vẫn tối mờ như cũ, không cải thiện được độ tương phản.

### 3.5. Ngưỡng phân đoạn nhị phân (Threshold $T$)
* **Giá trị chuẩn:** Quét tự động trong khoảng $5 - 100$ hoặc dùng thuật toán Otsu.
* **Nếu ĐẶT $T$ QUÁ CAO ($T = 120 - 160$):**
  * *Ảnh hưởng trên ảnh:* Trong phép ngưỡng đảo ($\text{pixel} \le T \to 255$), quá nhiều vùng tối (mống mắt, viền mi, bọng mắt dưới, lông mày) bị biến thành màu trắng.
  * *Ảnh hưởng đến tracking:* Diện tích vùng liên thông vượt quá ngưỡng trần ($13\%$ diện tích ROI) $\rightarrow$ Bị loại bỏ, hoặc tạo ra một ellipse khổng lồ bao trọn cả mắt.
* **Nếu ĐẶT $T$ QUÁ THẤP ($T = 5 - 15$):**
  * *Ảnh hưởng trên ảnh:* Chỉ những điểm đen sâu nhất mới được giữ lại. Nếu ánh sáng phòng phản chiếu nhẹ vào con ngươi, vùng đồng tử bị vỡ vụn thành các chấm nhỏ rời rạc.
  * *Ảnh hưởng đến tracking:* Diện tích quá nhỏ ($< 1.8\%$ ROI), con ngươi bị xóa sổ $\rightarrow$ Mất dấu mắt.

### 3.6. Phần tử cấu trúc Hình thái học (Morphology Structuring Element Size)
* **Giá trị chuẩn:** Dạng Ellipse $5\times 5$, Closing 2 lần, Opening 1 lần.
* **Nếu TĂNG kích thước hoặc TĂNG số lần Closing quá mức (kernel $11\times 11$, lặp 4 lần):**
  * *Ảnh hưởng:* Phép giãn (Dilation) quá mạnh sẽ nối liền đồng tử với hàng lông mi trên hoặc nếp mí mắt $\rightarrow$ Biến hình tròn của con ngươi thành hình quả trứng hoặc bầu dục dẹt kéo dài lên phía trên.
* **Nếu TĂNG số lần Opening quá mức (lặp 3 lần):**
  * *Ảnh hưởng:* Phép co (Erosion) sẽ bào mòn hết viền ngoài của con ngươi $\rightarrow$ Đồng tử bị teo nhỏ hoặc biến mất nếu mắt đang nheo lại.
* **Nếu BỎ QUA phép Đóng (Closing):**
  * *Ảnh hưởng:* Điểm phản xạ ánh sáng (Glint - đốm trắng do đèn trần phản chiếu trên giác mạc) tạo ra một lỗ thủng trắng ở giữa con ngươi nhị phân $\rightarrow$ Chỉ số Solidity (độ lồi đặc) bị tụt thấp $\rightarrow$ Thuật toán loại bỏ vì tưởng là hình rỗng ruột.

### 3.7. Ngưỡng kiểm định hình học (Circularity, Solidity, Aspect Ratio)
* **Giá trị chuẩn:** $\text{Circularity} \ge 0.3$, $\text{Solidity} \ge 0.65$, $\text{Aspect} \ge 0.4$.
* **Nếu SIẾT NGƯỠNG QUÁ CHẶT ($\text{Circularity} \ge 0.85$, $\text{Solidity} \ge 0.90$):**
  * Khi người dùng liếc mắt sang trái/phải, con ngươi bị góc nhìn chiếu xiên (perspective) biến thành hình ellipse nghiêng có độ tròn chỉ khoảng $0.6 - 0.7$; hoặc khi mí mắt trên che mất $10\%$ con ngươi $\rightarrow$ **Mất dấu ngay lập tức khi mắt cử động.**
* **Nếu NỚI NGƯỠNG QUÁ RỘNG ($\text{Circularity} \ge 0.1$, $\text{Solidity} \ge 0.3$):**
  * Các nếp gấp nhăn dưới mắt, góc hốc mắt hay bóng lông mi dài đều bị chấp nhận $\rightarrow$ **Vẽ vòng xanh lung tung lên da mặt.**

---

## 4. THUẬT TOÁN VẼ VÒNG TRÒN / ELLIPSE XANH VÀ TÌM TÂM MẮT

Sau khi trải qua chuỗi tiền xử lý và phân đoạn, ta thu được mặt nạ nhị phân sạch. Thuật toán tiến hành bám vết theo 2 phương pháp:

### Phương pháp 1: Khớp Ellipse bằng Bình phương tối thiểu (Fitzgibbon Least Squares Fit)
* Dùng trong Python (`cv2.fitEllipse(contour)`):
* Phương trình conic tổng quát:
  $$F(x, y) = Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$$
* Với điều kiện ràng buộc hình học elip: $B^2 - 4AC < 0$.
* Thuật toán giải bài toán tối ưu khoảng cách đại số:
  $$\min \sum_{i=1}^N F(x_i, y_i)^2$$
  qua phân rã giá trị riêng tổng quát (Generalized Eigensystem): $D^T D \mathbf{a} = \lambda C \mathbf{a}$.
* **Kết quả thu được:** Tọa độ tâm $(c_x, c_y)$, hai bán trục $a, b$, và góc nghiêng $\theta$. Vẽ ellipse màu xanh lá `cv2.ellipse(..., (0, 255, 0), 2)` và đánh dấu tâm bằng dấu thập đỏ `cv2.drawMarker(..., (0, 0, 255))`.

### Phương pháp 2: Moment không gian và Moment trung tâm (Image Moments)
* Dùng trong xử lý trực tiếp thời gian thực (`webcam.js`):
* **Tọa độ tâm (Centroid):** Tính từ moment bậc 1:
  $$c_x = \frac{m_{10}}{m_{00}} = \frac{\sum x}{N}, \quad c_y = \frac{m_{01}}{m_{00}} = \frac{\sum y}{N}$$
* **Phương sai và hiệp phương sai:** Tính từ moment trung tâm bậc 2:
  $$\mu_{20} = \frac{\sum x^2}{N} - c_x^2, \quad \mu_{02} = \frac{\sum y^2}{N} - c_y^2, \quad \mu_{11} = \frac{\sum xy}{N} - c_x c_y$$
* **Bán trục chính và phụ ($r_x, r_y$):** Tương ứng với các trục quán tính chính:
  $$\Delta = \sqrt{(\mu_{20} - \mu_{02})^2 + 4\mu_{11}^2}$$
  $$r_{\text{major}} = 2\sqrt{\frac{\mu_{20} + \mu_{02} + \Delta}{2}}, \quad r_{\text{minor}} = 2\sqrt{\frac{\mu_{20} + \mu_{02} - \Delta}{2}}$$
* **Góc nghiêng:** $\theta = \frac{1}{2} \arctan\left(\frac{2\mu_{11}}{\mu_{20} - \mu_{02}}\right)$.

---

## 5. BỘ CÂU HỎI VẤN ĐÁP BẢO VỆ ĐỒ ÁN (DIP DEFENSE Q&A)

### Câu 1: Em hãy trình bày toàn bộ quy trình tiền xử lý ảnh trong đề tài?
* **Trả lời:** Dạ quy trình gồm 8 bước: 
  1. Chuẩn hóa kích thước khung hình về 1024px (ảnh tĩnh) hoặc 320px (webcam).
  2. Hiệu chỉnh sáng thích nghi bằng Gamma phi tuyến kết hợp bảng tra LUT.
  3. Lọc trung vị $5\times 5$ để khử nhiễu muối tiêu mà vẫn giữ nguyên biên dạng mắt.
  4. Cắt vùng quan tâm (ROI) cố định để loại trừ khuôn mặt và hậu cảnh.
  5. Tách lấy riêng kênh màu Đỏ (Red) để tối đa hóa độ tương phản giữa con ngươi và mống mắt nâu.
  6. Lọc Gauss $7\times 7$ làm mịn các vân sọc của mống mắt.
  7. Giãn tương phản tuyến tính dựa trên phân vị $2\% - 98\%$.
  8. Áp dụng mặt nạ lọc màu ($R - B \le 8$) để triệt tiêu các vùng da mí mắt màu sẫm.

### Câu 2: Tại sao em không dùng mô hình Deep Learning (YOLO, MediaPipe, U-Net) mà lại dùng xử lý ảnh truyền thống?
* **Trả lời:**
  * Dạ thưa Thầy/Cô, đây là đồ án của học phần **Xử lý ảnh số (DIP)** nên mục tiêu trọng tâm là hiểu sâu và làm chủ các giải thuật toán học cơ bản trong miền không gian: biến đổi cường độ sáng, lọc không gian, toán tử hình thái học, phân đoạn ngưỡng và tính toán moment hình học.
  * Phương pháp DIP truyền thống có ưu điểm lớn là **rất nhẹ, không cần GPU, chạy trực tiếp trên trình duyệt hoặc vi điều khiển nhúng, và giải thích được tường minh từng bước hoạt động (White-box)** mà không phụ thuộc vào dữ liệu gán nhãn lớn như Deep Learning.

### Câu 3: Chỉ số PSNR trong báo cáo của em có ý nghĩa gì?
* **Trả lời:**
  * Dạ **PSNR (Peak Signal-to-Noise Ratio)** chỉ được sử dụng trong một thí nghiệm con để **đánh giá hiệu năng khử nhiễu** của bộ lọc trung vị so với bộ lọc Gauss khi chủ động thêm nhiễu nhân tạo (nhiễu Gauss và nhiễu muối tiêu) so với ảnh gốc tham chiếu.
  * Em **không dùng** PSNR để đánh giá độ chính xác của việc tìm tâm mắt, vì muốn đo tâm mắt cần có Ground Truth tọa độ để đo khoảng cách sai lệch pixel.

### Câu 4: Phép biến đổi Gamma khác gì so với phép biến đổi độ sáng tuyến tính cộng trừ ($I + C$)?
* **Trả lời:**
  * Phép cộng tuyến tính ($I + C$) làm dịch chuyển toàn bộ histogram sang phải một khoảng $C$, dễ làm các vùng vốn đã sáng bị tràn ngưỡng (vượt quá 255 - bão hòa trắng) trong khi vùng tối chỉ sáng lên rất ít.
  * Hiệu chỉnh Gamma ($s = 255 \cdot (r/255)^\gamma$) là phép biến đổi phi tuyến: với $\gamma < 1$, các mức xám tối được kéo sáng rất mạnh nhưng các mức xám cao gần 255 được ghìm lại gần như giữ nguyên, không làm cháy sáng ảnh.

### Câu 5: Tại sao lọc trung vị lại khử nhiễu muối tiêu tốt hơn lọc Gauss?
* **Trả lời:**
  * Nhiễu muối tiêu là các điểm cực trị (0 hoặc 255) nằm cô lập.
  * Bộ lọc Gauss lấy trung bình có trọng số, nên điểm 0 hoặc 255 vẫn đóng góp vào kết quả, làm vết nhiễu bị loang rộng ra thành một quầng mờ.
  * Bộ lọc trung vị sắp xếp các giá trị trong cửa sổ rồi lấy phần tử ở chính giữa. Các điểm cực trị 0 hoặc 255 luôn bị đẩy về hai đầu mảng sắp xếp và **bị loại bỏ hoàn toàn**, thay thế bằng mức xám thật của vùng lân cận.

### Câu 6: Hệ thống đã điều khiển được chuột hoặc gõ phím bằng mắt chưa?
* **Trả lời:**
  * Dạ chưa ạ. Đề tài hiện tại tập trung hoàn thiện khâu **Định vị tâm con ngươi (Pupil Center Detection)** trên mặt phẳng ảnh.
  * Để trở thành hệ thống Gaze Tracking hoàn chỉnh điều khiển được chuột, cần phát triển thêm 2 phần:
    1. Bắt thêm điểm phản xạ giác mạc (Glint) từ đèn hồng ngoại để loại trừ sai số khi người dùng lắc đầu.
    2. Khâu **Hiệu chuẩn (Calibration)** (nhìn vào 9 điểm mẫu) để tính ma trận biến đổi từ tọa độ ảnh $(x, y)$ sang tọa độ màn hình $(X, Y)$.

---
*Tài liệu được tổng hợp và biên soạn dành riêng cho báo cáo và vấn đáp đồ án môn Xử lý ảnh số.*
