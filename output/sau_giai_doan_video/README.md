# Sáu giai đoạn xử lý video

Các ảnh được tính tuần tự từ cùng ảnh mắt đầu vào bằng chính computeVideoFrame trong demo. Không xoay/lật thêm.

1. Gamma: tự động; đầu ra màu.
2. Median: sau gamma, chuyển xám, lọc trung vị 3×3.
3. Gaussian: sau trung vị, lọc Gaussian 3×3.
4. Contrast: cấu hình kính, phân vị 98%, đen 0, trắng 135, gamma đường cong 1,7.
5. Thresholding: ngưỡng tự động trong ROI, vùng tối thành trắng.
6. Morphological: đầu ra hình thái học của demo; cấu hình kính có thể giữ ứng viên trước hình thái học.

Thông số cụ thể xem thong_so.json. Các mặt nạ giữ cả vùng tối phụ; đây chưa phải mặt nạ chỉ chứa đồng tử.
