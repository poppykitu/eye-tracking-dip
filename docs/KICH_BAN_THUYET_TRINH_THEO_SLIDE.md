# KỊCH BẢN THUYẾT TRÌNH VÀ BỘ CÂU HỎI BẢO VỆ THEO TỪNG SLIDE
## Đề tài: Xử lý ảnh mắt phục vụ Eye Tracking (Môn: Xử lý ảnh số - DIP)

Tài liệu này bám sát 100% nội dung và hình ảnh trong bộ slide báo cáo của bạn. Mỗi slide gồm 3 phần:
1. **Nội dung cần nói (Kịch bản 30-45s/slide, tự tin, đúng thuật ngữ DIP).**
2. **Những chi tiết trên slide giảng viên sẽ "chỉ tay vào hỏi".**
3. **Câu hỏi thầy cô sẽ vặn vẹo và cách trả lời ăn trọn điểm.**

---

### SLIDE 1 & 2: TRANG BÌA & NỘI DUNG BÁO CÁO

#### 1. Kịch bản thuyết trình:
> *"Kính thưa Thầy/Cô và các bạn, hôm nay nhóm em xin báo cáo đề tài bài tập lớn môn Xử lý ảnh số: **Xử lý ảnh mắt phục vụ Eye Tracking**. Mục tiêu trọng tâm của đề tài là xây dựng quy trình tiền xử lý và phân đoạn ảnh truyền thống trong miền không gian để xác định được tâm con ngươi (đồng tử). Nội dung báo cáo gồm 6 phần: từ bài toán, quy trình xử lý, phân tích so sánh trước sau, thực nghiệm định lượng bằng PSNR, demo chương trình và cuối cùng là giới hạn cùng hướng phát triển."*

#### 2. Thầy cô có thể hỏi ngay từ mục lục:
* **Hỏi:** *"Đề tài này em có dùng trí tuệ nhân tạo hay mạng nơ-ron (AI/Deep Learning) không?"*
* **Trả lời chuẩn:** *"Dạ không ạ. Đây là môn Xử lý ảnh số nên nhóm em tập trung 100% vào các phương pháp xử lý ảnh kinh điển: biến đổi mức sáng, lọc không gian, toán tử hình thái học, phân đoạn ngưỡng và giải thuật khớp hình học elip. Nhờ vậy chương trình chạy cực nhẹ, không cần GPU và giải thích được tường minh bản chất toán học của từng bước."*

---

### SLIDE 3: BÀI TOÁN ẢNH MẮT (CHỈ VÀO HÌNH MẮT THỰC TẾ)

#### 1. Kịch bản thuyết trình:
> *"Như Thầy/Cô thấy trên slide, việc xác định tâm mắt từ camera thông thường gặp 3 thách thức xử lý ảnh rất lớn:
> 1. Ánh sáng không đều, đặc biệt là hiện tượng **phản xạ gương (specular reflection / glint)** tạo ra vệt trắng chói ngay trên giác mạc và con ngươi.
> 2. Mí mắt trên và hàng lông mi rủ xuống che khuất một phần đường cong của đồng tử.
> 3. Độ tương phản giữa mống mắt màu nâu và đồng tử màu đen là khá thấp.
> Mục tiêu của bài là phải cải thiện chất lượng ảnh để tách sạch vùng đồng tử này."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Vệt trắng hình chữ nhật phản chiếu trên con ngươi kia từ đâu ra? Nó gây hại gì cho thuật toán?"*
* **Trả lời:** *"Dạ đó là đốm phản xạ ánh sáng (Glint) từ đèn phòng hoặc màn hình máy tính. Nó khiến vùng đồng tử vốn là màu đen bị thủng một lỗ trắng ở giữa. Nếu phân ngưỡng trực tiếp, đồng tử sẽ bị biến thành hình vành khăn bị rách, làm sai lệch hoàn toàn trọng tâm và độ tròn."*

---

### SLIDE 4: QUY TRÌNH XỬ LÝ ẢNH (3 GIAI ĐOẠN)

#### 1. Kịch bản thuyết trình:
> *"Pipeline xử lý ảnh của tụi em chia làm 3 khối chức năng rõ rệt:
> - **Khối 1 - Cải thiện ảnh:** Cân bằng sáng thích nghi bằng Gamma, lọc trung vị khử nhiễu đốm, cắt vùng ROI, lấy riêng kênh Đỏ, làm mịn Gauss và giãn tương phản phân vị 2%-98%.
> - **Khối 2 - Phân đoạn:** Phân ngưỡng nhị phân đảo kết hợp mặt nạ lọc màu da, sau đó dùng toán tử Đóng (Closing) để vá lỗ thủng phản xạ và Mở (Opening) để cắt tỉa lông mi.
> - **Khối 3 - Ước lượng tâm:** Lọc hình học theo diện tích, độ tròn, độ lồi đặc; cuối cùng khớp Ellipse bằng phương pháp bình phương tối thiểu để trích xuất tâm $(x, y)$."*

---

### SLIDE 5: HIỆU CHỈNH ĐỘ SÁNG (GAMMA CORRECTION)

#### 1. Kịch bản thuyết trình:
> *"Ở slide này, nhóm tạo một điều kiện thử nghiệm khắc nghiệt: ảnh bị làm tối nhân tạo bằng phép nhân `clip(0.28 * ảnh)`. Vùng mắt gần như đen đặc.
> Bằng công thức biến đổi lũy thừa $s = 255 \times (r/255)^\gamma$, chương trình tự động tính trung vị mức xám và gán $\gamma < 1$. Nhờ tính chất phi tuyến của đường cong lũy thừa, các mức xám tối được kéo sáng rõ rệt mà không làm cháy các vùng sáng khác, giúp hiển thị rõ lại ranh giới con ngươi."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Tại sao không dùng phép cộng tuyến tính $I + C$ cho đơn giản mà phải dùng Gamma?"*
* **Trả lời:** *"Dạ phép cộng tuyến tính sẽ dịch chuyển toàn bộ histogram sang phải, làm những vùng vốn dĩ đã sáng (như tròng trắng hay da mặt) bị tràn ngưỡng 255 (cháy trắng) trong khi vùng tối vẫn chưa đủ tương phản. Gamma là hàm mũ phi tuyến, nó kéo sáng mạnh ở vùng tối nhưng ghìm dần ở vùng sáng cao, giúp giữ lại chi tiết."*
* **Hỏi:** *"Nếu ảnh bị cháy sáng bão hòa (quá trắng) thì Gamma có cứu lại được chi tiết không?"*
* **Trả lời:** *"Dạ không ạ. Pixel đã chạm ngưỡng 255 thì thông tin gốc đã mất hoàn toàn, Gamma chỉ phân bố lại các pixel còn thông tin."*

---

### SLIDE 6: GIẢM NHIỄU TRONG PIPELINE (LỌC TRUNG VỊ 5x5)

#### 1. Kịch bản thuyết trình:
> *"Trên slide là thử nghiệm khi ảnh bị nhiễu Gauss mạnh $\sigma = 28$. Sau khi qua hiệu chỉnh Gamma và Lọc trung vị $5\times 5$, toàn bộ hạt nhiễu sạn trên da và củng mạc đã được triệt tiêu mượt mà. 
> Lọc trung vị là bộ lọc phi tuyến, nó thay thế pixel bằng giá trị trung vị trong lân cận $5\times 5$, do đó nó loại trừ được nhiễu đốm cực tốt mà vẫn bảo toàn được đường biên cong của con ngươi."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Dùng cửa sổ lọc $5\times 5$ có nhược điểm gì?"*
* **Trả lời:** *"Dạ đánh đổi của việc dùng cửa sổ lớn $5\times 5$ là có thể làm mất các chi tiết rất nhỏ (như sợi lông mi mảnh) và làm bo nhẹ các góc nhọn. Tuy nhiên với bài toán tìm con ngươi là một khối tròn/elip lớn thì việc mất chi tiết vi mô này lại là lợi thế giúp loại bỏ lông mi rụng."*

---

### SLIDE 7: KÊNH ĐỎ VÀ GIÃN TƯƠNG PHẢN

#### 1. Kịch bản thuyết trình:
> *"Đây là bước then chốt nhất trong khâu tiền xử lý của nhóm:
> So sánh giữa **Ảnh xám thông thường** và **Kênh Đỏ**: ở ảnh xám, mống mắt nâu và đồng tử đen khá tiệp màu nhau. Nhưng ở kênh Đỏ, mống mắt phản xạ bước sóng đỏ rất mạnh nên sáng rõ, trong khi đồng tử hấp thụ ánh sáng nên đen đậm.
> Tiếp đó, nhóm áp dụng lọc Gauss $7\times 7$ để làm mịn và **Giãn tương phản tuyến tính theo phân vị 2%–98%**. Kết quả ở ảnh thứ 3 cho thấy con ngươi nổi bật hoàn toàn trên nền trắng."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Tại sao lại chọn phân vị 2% và 98% mà không lấy Min - Max (0% và 100%)?"*
* **Trả lời:** *"Dạ nếu lấy Min - Max tuyệt đối, chỉ cần trong ảnh có đúng 1 pixel chói do đèn (giá trị 255) và 1 pixel lông mi đen (giá trị 0) thì công thức co giãn sẽ chia cho $255 - 0 = 255$, tức là ảnh không được giãn tương phản chút nào. Việc cắt bỏ 2% hai đầu giúp triệt tiêu các điểm nhiễu ngoại lai (outliers) đó."*

---

### SLIDE 8: PHÂN NGƯỠNG VÀ TOÁN TỬ HÌNH THÁI HỌC

#### 1. Kịch bản thuyết trình:
> *"Sau khi tăng tương phản, nhóm áp dụng **Phân ngưỡng nhị phân đảo (Inverse Threshold)**: đồng tử tối biến thành màu trắng (255), nền sáng thành màu đen (0).
> Tuy nhiên ảnh nhị phân lúc này bị rách ở giữa do đốm sáng phản xạ và có các gai nhiễu do chân lông mi.
> Nhóm áp dụng chuỗi hình thái học:
> - **Phép Đóng (Closing = Giãn rồi Co):** Dùng phần tử elip $5\times 5$ lấp kín lỗ thủng phản xạ bên trong con ngươi.
> - **Phép Mở (Opening = Co rồi Giãn):** Cắt đứt các sợi lông mi vụn dính ở rìa ngoài."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Em dùng phần tử cấu trúc (Structuring Element) hình gì? Kích thước bao nhiêu?"*
* **Trả lời:** *"Dạ dùng phần tử cấu trúc hình Ellipse kích thước $5\times 5$ ạ. Vì con ngươi mắt có hình dạng cong lồi, dùng kernel elip sẽ bảo toàn độ tròn tốt hơn kernel hình chữ nhật."*

---

### SLIDE 9: KẾT QUẢ THÍ NGHIỆM ĐỊNH LƯỢNG BẰNG PSNR

#### 1. Kịch bản thuyết trình:
> *"Để chứng minh tính khoa học của việc chọn bộ lọc, nhóm thực hiện thí nghiệm đo lường khách quan bằng chỉ số **PSNR (Peak Signal-to-Noise Ratio)** trên 8 ảnh:
> - Với **Nhiễu Gauss $\sigma = 20$:** Cả Trung vị ($33.41$ dB) và Gauss ($32.92$ dB) đều cải thiện vượt bậc so với ảnh nhiễu gốc ($22.49$ dB).
> - Với **Nhiễu muối tiêu 4%:** Bộ lọc Trung vị thể hiện sự vượt trội hoàn toàn với **$44.40$ dB** (so với Gauss chỉ đạt $28.87$ dB).
> Nhóm cũng lưu ý rõ: PSNR chỉ đo lường sai số phục hồi ảnh so với ảnh tham chiếu, chứ không dùng để khẳng định độ chính xác của vị trí tâm mắt."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Công thức tính PSNR là gì? Đơn vị là gì?"*
* **Trả lời:** *"Dạ $\text{PSNR} = 10 \log_{10}\left(\frac{255^2}{\text{MSE}}\right)$, đơn vị là Decibel (dB). Trong đó MSE là sai số toàn phương trung bình giữa ảnh sau lọc và ảnh gốc tham chiếu. PSNR càng cao chứng tỏ ảnh sau lọc càng sát với ảnh gốc."*

---

### SLIDE 10: ƯỚC LƯỢNG TÂM ĐỒNG TỬ (VÒNG XANH - TÂM ĐỎ)

#### 1. Kịch bản thuyết trình:
> *"Từ mặt nạ nhị phân đã làm sạch, nhóm trích xuất các đường bao (Contours) và đưa qua bộ lọc hình học khắt khe:
> - Diện tích phải nằm trong khoảng $1.8\% - 13\%$ diện tích ROI.
> - Độ tròn (Circularity) $\ge 0.3$, Độ lồi đặc (Solidity) $\ge 0.65$, Tỷ lệ trục $\ge 0.4$.
> Ứng viên tốt nhất được đưa vào thuật toán **Khớp Ellipse theo bình phương tối thiểu (Direct Least Squares)**. Hệ thống vẽ vòng xanh lá cây biểu diễn đường biên con ngươi và vẽ dấu thập đỏ tại tọa độ tâm ước lượng $(1665, 814)$."*

#### 2. Câu hỏi xoáy từ Thầy/Cô:
* **Hỏi:** *"Độ tròn (Circularity) và Độ lồi đặc (Solidity) tính bằng công thức nào?"*
* **Trả lời:** 
  * *"Độ tròn: $C = \frac{4\pi \times \text{Area}}{\text{Perimeter}^2}$ (bằng 1 nếu là hình tròn tuyệt đối)."*
  * *"Độ lồi đặc: $S = \frac{\text{Area}}{\text{ConvexHull Area}}$ (tỷ lệ giữa diện tích thực và diện tích bao lồi nhỏ nhất chứa nó)."*

---

### SLIDE 11: ĐÁNH GIÁ, GIỚI HẠN VÀ HƯỚNG PHÁT TRIỂN

#### 1. Kịch bản thuyết trình:
> *"Cuối cùng, nhóm nhìn nhận rất trung thực về các giới hạn hiện tại:
> - Thuật toán hiện chạy trên các khung hình mắt cận cảnh với vùng ROI cố định.
> - Khi người dùng đảo mắt quá sát góc hoặc nhắm mắt, mí mắt che mất biên sẽ làm tâm ellipse bị lệch nhẹ.
> - Chưa có nhãn tâm chuẩn (Ground Truth) do chuyên gia chấm tọa độ để đo sai số pixel tuyệt đối.
> Hướng phát triển tiếp theo là kết hợp **Bộ lọc Kalman** để theo vết mượt mà trên video thời gian thực, tự động bám ROI khuôn mặt và tiến hành bước Hiệu chuẩn nhìn 9 điểm để điều khiển con trỏ chuột."*

#### 2. Câu hỏi chốt hạ của Thầy/Cô:
* **Hỏi:** *"Đề tài này có ứng dụng thực tế gì?"*
* **Trả lời:** *"Dạ ứng dụng lớn nhất là hỗ trợ người khuyết tật vận động (bị liệt tứ chi) điều khiển máy tính hoặc xe lăn thông qua cử động mắt; ngoài ra còn ứng dụng trong đo lường độ tập trung của tài xế chống ngủ gật và phân tích hành vi người dùng khi xem quảng cáo."*

---
*Tài liệu đã sẵn sàng để bạn tự tin làm chủ toàn bộ buổi báo cáo!*
