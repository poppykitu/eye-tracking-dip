# KỊCH BẢN THUYẾT TRÌNH BÁO CÁO TOÀN DIỆN 12 SLIDE
## ĐỀ TÀI: XỬ LÝ ẢNH MẮT PHỤC VỤ EYE TRACKING
### Môn học: Xử lý ảnh số (Digital Image Processing - DIP)
* **Thời lượng đề xuất:** 5 – 7 phút (trung bình 30 – 45 giây / slide).
* **Mục tiêu:** Thể hiện rõ bản chất thuật toán xử lý ảnh trong miền không gian, số liệu định lượng khách quan (PSNR), tự tin trả lời vấn đáp của Hội đồng.

---

## 📌 BẢNG TỔNG QUAN PHÂN BỔ THỜI GIAN

| Slide | Nội dung chính | Thời lượng ước tính |
| :---: | :--- | :---: |
| **01** | Trang bìa & Giới thiệu đề tài | ~20 giây |
| **02** | Mục lục & 6 nội dung chính | ~25 giây |
| **03** | Bài toán ảnh mắt & Thách thức thực tế | ~35 giây |
| **04** | Tổng quan quy trình xử lý 3 giai đoạn | ~40 giây |
| **05** | Hiệu chỉnh độ sáng bằng Gamma phi tuyến | ~35 giây |
| **06** | Giảm nhiễu trong pipeline bằng Lọc trung vị | ~35 giây |
| **07** | Trích chọn kênh Đỏ & Giãn tương phản phân vị | ~45 giây |
| **08** | Phân ngưỡng nhị phân đảo & Toán tử hình thái học | ~40 giây |
| **09** | Đánh giá thực nghiệm định lượng bằng PSNR | ~45 giây |
| **10** | Trích xuất đặc trưng & Ước lượng tâm đồng tử | ~40 giây |
| **11** | Giới hạn kỹ thuật & Hướng phát triển | ~40 giây |
| **12** | Lời cảm ơn & Sẵn sàng phần Q&A | ~15 giây |
| **TỔNG**| **Toàn bộ bài báo cáo** | **~6 phút** |

---

## 🎤 CHI TIẾT LỜI THOẠI VÀ HƯỚNG DẪN TỪNG SLIDE

---

### SLIDE 1: TRANG BÌA
* **Tiêu đề slide:** XỬ LÝ ẢNH MẮT - Phục vụ eye tracking (BÁO CÁO 2026 - ĐỀ TÀI MÔN HỌC)
* **Thời lượng:** ~20 giây
* **Lời thoại thuyết trình:**
> *"Kính thưa Thầy/Cô và các bạn, hôm nay nhóm em xin phép được báo cáo đề tài bài tập lớn môn Xử lý ảnh số với chủ đề: **Xử lý ảnh mắt phục vụ Eye Tracking**.*
>
> *Đề tài tập trung vào việc nghiên cứu và ứng dụng các kỹ thuật xử lý ảnh kinh điển trong miền không gian để làm sạch, phân đoạn và định vị chính xác tâm con ngươi, làm nền tảng cho bài toán theo dõi ánh nhìn."*

---

### SLIDE 2: NỘI DUNG BÁO CÁO
* **Tiêu đề slide:** NỘI DUNG BÁO CÁO (01 - 06)
* **Thời lượng:** ~25 giây
* **Lời thoại thuyết trình:**
> *"Bài báo cáo của nhóm được cấu trúc gồm 6 phần trọng tâm:
> 1. Đặt vấn đề bài toán và đặc điểm dữ liệu ảnh mắt.
> 2. Tổng quan quy trình xử lý ảnh 3 giai đoạn.
> 3. Phân tích chi tiết so sánh trước và sau từng bước tiền xử lý.
> 4. Đánh giá thực nghiệm định lượng bằng chỉ số PSNR.
> 5. Trực quan hóa kết quả ước lượng tâm trên ảnh thực tế.
> 6. Nhìn nhận các giới hạn và đề xuất hướng phát triển tiếp theo."*

---

### SLIDE 3: BÀI TOÁN ẢNH MẮT
* **Tiêu đề slide:** BÀI TOÁN ẢNH MẮT (Ảnh mắt cận cảnh)
* **Thời lượng:** ~35 giây
* **Thao tác cử chỉ:** *Chỉ tay vào đốm sáng chữ nhật phản xạ trên giác mạc và hàng lông mi rủ xuống.*
* **Lời thoại thuyết trình:**
> *"Như Thầy/Cô thấy trên hình ảnh mắt thu nhận từ camera thông thường, bài toán xác định con ngươi gặp phải 3 thách thức lớn về mặt xử lý ảnh:
> - Thứ nhất là hiện tượng **phản xạ gương (specular reflection / glint)** tạo ra vệt sáng chói ngay trên giác mạc, làm thủng một lỗ trắng giữa con ngươi.
> - Thứ hai, mí mắt trên và hàng lông mi rủ xuống che khuất một phần đường cong ranh giới.
> - Thứ ba là độ tương phản giữa mống mắt màu nâu và con ngươi màu đen là rất thấp.
> Mục tiêu của đề tài là xây dựng pipeline tiền xử lý để làm sạch các nhiễu này và phân đoạn chính xác vùng đồng tử."*

---

### SLIDE 4: QUY TRÌNH XỬ LÝ ẢNH
* **Tiêu đề slide:** QUY TRÌNH XỬ LÝ ẢNH (3 GIAI ĐOẠN)
* **Thời lượng:** ~40 giây
* **Lời thoại thuyết trình:**
> *"Nhóm đã thiết kế một pipeline tuần tự gồm 3 khối chức năng rõ rệt:
> - **Khối 1 - Cải thiện ảnh:** Cân bằng sáng thích nghi bằng Gamma, lọc trung vị khử nhiễu đốm, cắt vùng mắt (ROI), tách riêng kênh Đỏ, làm mịn Gauss và giãn tương phản phân vị 2%–98%.
> - **Khối 2 - Phân đoạn:** Áp dụng phân ngưỡng nhị phân đảo, sau đó dùng toán tử Đóng (Closing) để lấp lỗ thủng phản xạ và toán tử Mở (Opening) để loại bỏ sợi lông mi.
> - **Khối 3 - Ước lượng tâm:** Lọc hình học theo diện tích và độ tròn, cuối cùng khớp Ellipse theo bình phương tối thiểu để trích xuất tọa độ tâm $(x, y)$."*

---

### SLIDE 5: HIỆU CHỈNH ĐỘ SÁNG
* **Tiêu đề slide:** HIỆU CHỈNH ĐỘ SÁNG (Ảnh tối tổng hợp vs Sau hiệu chỉnh gamma)
* **Thời lượng:** ~35 giây
* **Lời thoại thuyết trình:**
> *"Ở bước đầu tiên, nhóm thử nghiệm trong điều kiện ảnh bị thiếu sáng nhân tạo bằng cách nhân hệ số `clip(0.28 * ảnh gốc)`. Vùng mắt gần như đen đặc.
> Thay vì dùng phép cộng độ sáng tuyến tính dễ làm cháy tròng trắng, nhóm áp dụng **Hiệu chỉnh Gamma phi tuyến**: $s = 255 \times (r/255)^\gamma$.
> Bằng cách chọn $\gamma < 1$, các mức xám ở vùng tối được kéo sáng mạnh mẽ mà không làm bão hòa các vùng vốn đã sáng, giúp khôi phục rõ nét cấu trúc mắt như hình bên phải."*

---

### SLIDE 6: GIẢM NHIỄU TRONG PIPELINE
* **Tiêu đề slide:** GIẢM NHIỄU TRONG PIPELINE (Ảnh nhiễu tổng hợp vs Sau gamma và trung vị)
* **Thời lượng:** ~35 giây
* **Lời thoại thuyết trình:**
> *"Khi quay video trong điều kiện ánh sáng yếu, cảm biến camera thường xuất hiện nhiều hạt nhiễu hạt. Trên slide là ảnh mô phỏng khi bị thêm nhiễu Gauss độ lệch chuẩn $\sigma = 28$.
> Sau khi áp dụng **Lọc trung vị $5\times 5$**, toàn bộ các hạt nhiễu lốm đốm trên củng mạc và da mặt đã được triệt tiêu mượt mà.
> Lọc trung vị là bộ lọc phi tuyến có ưu điểm vượt trội là khử nhiễu điểm cực tốt mà vẫn bảo toàn nguyên vẹn đường biên cong của con ngươi, tránh làm mờ nhòe biên dạng như các bộ lọc trung bình."*

---

### SLIDE 7: KÊNH ĐỎ VÀ TƯƠNG PHẢN
* **Tiêu đề slide:** KÊNH ĐỎ VÀ TƯƠNG PHẢN (Ảnh xám $\to$ Kênh đỏ $\to$ Sau tăng tương phản)
* **Thời lượng:** ~45 giây
* **Thao tác cử chỉ:** *So sánh giữa ảnh xám thông thường và ảnh kênh Đỏ.*
* **Lời thoại thuyết trình:**
> *"Đây là bước quan trọng nhất trong khâu tiền xử lý của nhóm:
> - Nếu chỉ dùng ảnh xám thông thường (hình 1), mống mắt màu nâu và con ngươi màu đen có mức xám gần như tương đương, rất khó tách biên.
> - Tuy nhiên khi **tách riêng kênh Đỏ (Red)** (hình 2): do mống mắt và da phản xạ bước sóng đỏ rất mạnh nên sáng rõ, trong khi con ngươi hấp thụ ánh sáng nên đen đậm, tạo ra độ tương phản cực đại.
> - Tiếp theo, nhóm làm mịn Gauss $7\times 7$ và **giãn tương phản theo phân vị 2%–98%** (hình 3). Việc cắt bỏ 2% hai đầu giúp triệt tiêu các đốm phản xạ chói, làm con ngươi nổi bật hoàn toàn trên nền trắng."*

---

### SLIDE 8: PHÂN NGƯỠNG VÀ HÌNH THÁI HỌC
* **Tiêu đề slide:** PHÂN NGƯỠNG VÀ HÌNH THÁI HỌC (Phân ngưỡng đảo vs Sau đóng rồi mở)
* **Thời lượng:** ~40 giây
* **Lời thoại thuyết trình:**
> *"Sau khi tăng tương phản, nhóm áp dụng **Phân ngưỡng nhị phân đảo**: đưa con ngươi tối thành màu trắng (giá trị 255) và nền sáng thành màu đen (giá trị 0).
> Ở ảnh nhị phân ban đầu, con ngươi bị rách một vệt lớn ở giữa do ánh sáng đèn phản xạ và có các gai nhiễu do chân lông mi.
> Nhóm áp dụng chuỗi toán tử hình thái học với phần tử cấu trúc elip $5\times 5$:
> - **Phép Đóng (Closing = Giãn rồi Co):** Lấp kín lỗ thủng phản xạ bên trong lòng con ngươi.
> - **Phép Mở (Opening = Co rồi Giãn):** Cắt đứt các sợi lông mi vụn dính ở rìa ngoài.
> Kết quả thu được mặt nạ nhị phân tròn trịa và sạch sẽ như hình bên phải."*

---

### SLIDE 9: KẾT QUẢ THÍ NGHIỆM LỌC NHIỄU
* **Tiêu đề slide:** KẾT QUẢ THÍ NGHIỆM LỌC NHIỄU (Bảng số liệu PSNR)
* **Thời lượng:** ~45 giây
* **Lời thoại thuyết trình:**
> *"Để chứng minh tính khoa học của việc chọn bộ lọc, nhóm tiến hành thực nghiệm đo chỉ số **PSNR** trung bình trên 8 ảnh mắt:
> - Với **Nhiễu Gauss**: Cả lọc Trung vị ($33.41\text{ dB}$) và lọc Gauss ($32.92\text{ dB}$) đều cải thiện độ nét vượt trội so với ảnh đầu vào ($22.49\text{ dB}$).
> - Với **Nhiễu muối tiêu 4%**: Bộ lọc Trung vị thể hiện ưu thế áp đảo khi đạt tới **$44.40\text{ dB}$**, trong khi lọc Gauss chỉ đạt $28.87\text{ dB}$ vì cơ chế sắp xếp của lọc trung vị loại bỏ hoàn toàn các điểm cực trị 0 và 255.
> Nhóm cũng lưu ý rõ: PSNR chỉ đo mức độ khôi phục tín hiệu so với ảnh gốc, không dùng để đo độ chính xác định vị tâm con ngươi."*

---

### SLIDE 10: ƯỚC LƯỢNG TÂM ĐỒNG TỬ
* **Tiêu đề slide:** ƯỚC LƯỢNG TÂM ĐỒNG TỬ (Vòng xanh elip & Dấu thập đỏ)
* **Thời lượng:** ~40 giây
* **Thao tác cử chỉ:** *Chỉ vào dấu thập đỏ và tọa độ `Pupil candidate (1665, 814)`.*
* **Lời thoại thuyết trình:**
> *"Từ mặt nạ nhị phân sạch, nhóm áp dụng bộ lọc hình học khắt khe: diện tích từ 1.8% đến 13% ROI, độ tròn $\ge 0.3$ và độ lồi đặc $\ge 0.65$ để chọn đúng đối tượng con ngươi.
> Ứng viên tốt nhất được đưa vào giải thuật **Khớp Ellipse theo bình phương tối thiểu (Direct Least Squares)**. Hệ thống hiển thị:
> - Vòng elip màu xanh lá cây ôm khít đường biên con ngươi.
> - Dấu thập đỏ đánh dấu chính xác tọa độ tâm, trên ảnh là $(1665, 814)$.
> Giải thuật khớp elip có khả năng nội suy đường cong cực tốt ngay cả khi con ngươi bị khuyết một phần do mí mắt che khuất."*

---

### SLIDE 11: GIỚI HẠN VÀ HƯỚNG TIẾP
* **Tiêu đề slide:** GIỚI HẠN VÀ HƯỚNG TIẾP
* **Thời lượng:** ~40 giây
* **Lời thoại thuyết trình:**
> *"Nhìn nhận một cách khách quan, nghiên cứu hiện tại còn một số giới hạn:
> - Dữ liệu thực nghiệm mới gồm 8 ảnh tĩnh và chưa có tập nhãn chuẩn Ground Truth để đo sai số pixel tuyệt đối.
> - Vùng ROI đang được cố định, yêu cầu vị trí đầu người tương đối ổn định.
> - Khi mắt liếc quá sát góc hoặc nhắm mắt, mí mắt che mất phần lớn biên tròn có thể gây lệch tâm.
> **Hướng phát triển tiếp theo:** Nhóm sẽ mở rộng tập dữ liệu có gán nhãn chuẩn, tích hợp bộ lọc Kalman để theo vết mượt trên video thời gian thực, và phát triển bước Hiệu chuẩn nhìn 9 điểm (Calibration) để điều khiển con trỏ chuột máy tính."*

---

### SLIDE 12: CẢM ƠN & TRAO ĐỔI
* **Tiêu đề slide:** CẢM ƠN! Trao đổi và câu hỏi
* **Thời lượng:** ~15 giây
* **Lời thoại thuyết trình:**
> *"Trên đây là toàn bộ nội dung báo cáo của nhóm về đề tài Xử lý ảnh mắt phục vụ Eye Tracking.
> Nhóm em xin chân thành cảm ơn Thầy/Cô và các bạn đã chú ý theo dõi. Rất mong nhận được những nhận xét và câu hỏi đóng góp từ Thầy/Cô để nhóm hoàn thiện đề tài hơn nữa ạ!"*

---

## 💡 CÁC CÂU HỎI VẤN ĐÁP "ĐẮT GIÁ" VÀ CÁCH TRẢ LỜI ĂN ĐIỂM

1. **Hỏi:** *"Đề tài này có dùng AI hay Deep Learning không?"*
   * **Trả lời:** *"Dạ không ạ. Nhóm tập trung 100% vào các phương pháp xử lý ảnh số kinh điển trong miền không gian: biến đổi mức sáng, lọc không gian, hình thái học, phân đoạn ngưỡng và khớp conic elip. Nhờ vậy chương trình chạy cực nhẹ, không cần GPU và giải thích được tường minh bản chất toán học của từng bước."*

2. **Hỏi:** *"Tại sao lấy kênh Red mà không lấy kênh Green hay Blue?"*
   * **Trả lời:** *"Dạ vì sắc tố melanin của mống mắt người châu Á và mô da có độ phản xạ phổ đỏ cao nhất (mức sáng cao), trong khi đồng tử hấp thụ ánh sáng nên đen đậm. Kênh Red tạo ra độ tương phản cực đại giữa con ngươi và phần còn lại của mắt."*

3. **Hỏi:** *"Tại sao giãn tương phản theo phân vị 2%-98% mà không lấy Min-Max tuyệt đối?"*
   * **Trả lời:** *"Dạ nếu lấy Min-Max (0%-100%), chỉ cần trong ảnh có đúng 1 điểm phản xạ chói do đèn (giá trị 255) và 1 điểm lông mi (giá trị 0), thì mẫu số $255 - 0 = 255$ khiến công thức co giãn không có tác dụng. Cắt bỏ 2% hai đầu giúp triệt tiêu các điểm nhiễu ngoại lai đó."*
