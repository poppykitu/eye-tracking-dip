"""Build a self-contained teaching notebook from the demo's Python pipeline."""
import ast
import json
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'eye_tracking.py').read_text(encoding='utf-8')
tree = ast.parse(source)
functions = {node.name: ast.get_source_segment(source, node) for node in tree.body if isinstance(node, ast.FunctionDef)}
body = textwrap.dedent(functions['analyze'].split('    start = time.perf_counter()', 1)[1])
body = 'start = time.perf_counter()' + body
cells = []


def markdown(text):
    cells.append({'cell_type': 'markdown', 'metadata': {}, 'source': textwrap.dedent(text).strip()})


def code(text):
    cells.append({'cell_type': 'code', 'metadata': {}, 'source': textwrap.dedent(text).strip(), 'execution_count': None, 'outputs': []})


def chunk(start, end):
    return body[body.index(start):body.index(end)].strip()


markdown(r'''
# Xử lý ảnh mắt phục vụ eye tracking

Notebook trình bày thuật toán **xử lý ảnh số truyền thống**, không dùng ML: thu nhận ảnh → gamma → trung vị → chọn kênh → Gaussian → giãn tương phản → phân ngưỡng → hình thái học → ellipse và tâm đồng tử.

Đây là phiên bản thuật toán **ảnh tĩnh Python** của demo. Video trên trình duyệt có cách triển khai và tham số riêng trong `webcam.js`.

**Cách dùng:** mở bằng JupyterLab hoặc VS Code, chọn Python kernel rồi **Run All**. Giữ thư mục `data` cạnh notebook. Sửa `IMAGE_NAME`, `CONDITION` và `THRESHOLD` ở ô cấu hình rồi chạy lại các ô phía dưới. Ảnh đầu ra đã được lưu trong notebook để xem ngay.

Các vùng sáng, tối, nhiễu mô phỏng được ghi rõ. Tâm đồng tử chỉ là ước lượng; chưa có nhãn chuẩn để công bố độ chính xác hoặc hiệu chuẩn điểm nhìn.
''')
markdown('## 1. Thư viện và hàm hiển thị\nNếu thiếu thư viện, bỏ dấu `#` ở dòng `%pip` bên dưới rồi chạy lại kernel. Lần cài đầu cần internet; các bước xử lý không cần mạng.')
code('''
# %pip install -r requirements-notebook.txt
from pathlib import Path
import csv
import json
import math
import time
import cv2
import numpy as np
import matplotlib.pyplot as plt
from IPython.display import display, Markdown

plt.rcParams.update({'figure.dpi': 100, 'font.size': 11})

def show(images, titles, columns=2):
    rows = math.ceil(len(images) / columns)
    fig, axes = plt.subplots(rows, columns, figsize=(6 * columns, 3.5 * rows), squeeze=False)
    for ax, image, title in zip(axes.flat, images, titles):
        if image.ndim == 2:
            ax.imshow(image, cmap='gray', vmin=0, vmax=255)
        else:
            ax.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        ax.set_title(title)
        ax.axis('off')
    for ax in list(axes.flat)[len(images):]:
        ax.axis('off')
    plt.tight_layout()
    plt.show()
    plt.close(fig)
''')
code(functions['read_image'] + '\n\n' + functions['histogram_panel'])
markdown('## 2. Chọn ảnh và điều kiện thử nghiệm\nẢnh gốc giữ nguyên trong `data`. Các điều kiện bright, dark, noise là biến thể tổng hợp; không đại diện cho các lần thu camera riêng.')
code('''
ROOT = Path.cwd()
if not (ROOT / 'data').is_dir() and (ROOT.parent / 'data').is_dir():
    ROOT = ROOT.parent
DATA_DIR = ROOT / 'data'
IMAGE_NAME = 'Videoshot_20261026_002227.jpg'
CONDITION = 'original'  # original | bright | dark | noise
THRESHOLD = None       # None: tìm ngưỡng 5–100; hoặc đặt số nguyên 0–255

if CONDITION not in {'original', 'bright', 'dark', 'noise'}:
    raise ValueError('Điều kiện không hợp lệ')
if THRESHOLD is not None and (not isinstance(THRESHOLD, int) or not 0 <= THRESHOLD <= 255):
    raise ValueError('THRESHOLD cần là None hoặc số nguyên 0–255')
original_image = read_image(DATA_DIR / IMAGE_NAME)
image = original_image.copy()
if CONDITION == 'bright':
    image = np.clip(image.astype(np.float32)*1.35 + 35, 0, 255).astype(np.uint8)
elif CONDITION == 'dark':
    image = np.clip(image.astype(np.float32)*.28, 0, 255).astype(np.uint8)
elif CONDITION == 'noise':
    rng = np.random.default_rng(42)
    image = np.clip(image.astype(np.float32) + rng.normal(0, 28, image.shape), 0, 255).astype(np.uint8)
threshold = THRESHOLD
print('Ảnh:', IMAGE_NAME, '| Điều kiện:', CONDITION, '| Kích thước:', image.shape)
show([original_image, image], ['Ảnh gốc', f'Đầu vào: {CONDITION}'])
''')
markdown('## 3. Thu nhỏ và xác định vùng mắt\nChiều rộng tối đa 1024 px. ROI cố định x=18%–87%, y=20%–85% phù hợp ảnh một mắt cận cảnh. Đây không phải bộ phát hiện mắt trên toàn khuôn mặt.')
code(chunk('start =', 'median =') + '''
roi_preview = frame.copy()
cv2.rectangle(roi_preview, (x0, y0), (x1, y1), (255, 180, 0), 2)
show([roi_preview, input_gray], ['Vùng xử lý ROI', 'Ảnh xám đầu vào'])
''')
markdown(r'''
## 4. Hiệu chỉnh độ sáng bằng gamma

$$s = 255\left(\frac{r}{255}\right)^\gamma$$

Gamma < 1 làm sáng, gamma > 1 làm tối. Chọn gamma từ trung vị mức xám, mục tiêu 130; chặn trong 0.4–1.4 và giữ gamma=1 nếu trung vị 90–170. Đây là quy tắc thử nghiệm. Vùng đã cháy sáng mất chi tiết không được tái tạo bằng gamma.
''')
code(chunk('median =', 'denoised =') + "\nprint(f'Trung vị đầu vào: {median:.1f}; gamma: {gamma:.3f}')\nshow([frame, balanced], ['Trước gamma', 'Sau gamma'])")
markdown('## 5. Lọc trung vị và quan sát histogram\nTrung vị 5×5 thay giá trị pixel bằng trung vị lân cận, xử lý từng kênh màu. Có thể giảm nhiễu điểm nhưng cũng làm mất chi tiết nhỏ. Histogram là biểu đồ phân bố mức sáng, không phải thao tác cân bằng histogram.')
code("denoised = cv2.medianBlur(balanced, 5)\nshow([balanced, denoised], ['Trước trung vị', 'Sau trung vị 5×5'])\n" + '''
fig, ax = plt.subplots(figsize=(10, 3))
for label, img in [('Trước xử lý', input_gray), ('Sau gamma + trung vị', cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY))]:
    ax.plot(cv2.calcHist([img], [0], None, [256], [0, 256]).ravel(), label=label)
ax.set(xlabel='Mức xám', ylabel='Số pixel', xlim=(0, 255))
ax.legend()
plt.tight_layout()
plt.show()
plt.close(fig)
''')
markdown('## 6. Chọn kênh ảnh và lọc Gaussian\nTrên bộ ảnh này, đồng tử xanh đen tối hơn mống mắt nâu ở kênh đỏ. Ảnh xám được hiển thị để đối chiếu; phân đoạn sử dụng **kênh đỏ**. Cần đánh giá lại lựa chọn này với dữ liệu IR. Gaussian 7×7 giảm nhiễu và làm mịn biên.')
code(chunk('roi =', 'low, high =') + "\nshow([gray, red, smooth], ['Ảnh xám ROI', 'Kênh đỏ ROI', 'Sau Gaussian 7×7'], columns=3)")
markdown('## 7. Giãn tương phản\nLấy phân vị 2% và 98% làm hai mốc, ánh xạ tuyến tính về 0–255 và cắt ngoài miền. Các mốc được tính trên ROI sau Gaussian; không dùng CLAHE hay cân bằng histogram.')
code(chunk('low, high =', 'rh, rw =') + "\nprint(f'Mốc thấp: {low:.1f}; mốc cao: {high:.1f}')\nshow([smooth, enhanced], ['Sau Gaussian', 'Sau giãn tương phản'])")
markdown('## 8. Phân ngưỡng và hình thái học\nMinh họa ngưỡng 40 nếu cấu hình tự động. Ngưỡng đảo biến vùng tối thành trắng. Đóng hai lần và mở một lần với phần tử cấu trúc ellipse 5×5. Ở bước sau, thuật toán thử các ngưỡng để chọn vùng ứng viên tốt nhất.')
code('''
preview_threshold = 40 if threshold is None else threshold
_, preview_binary = cv2.threshold(enhanced, preview_threshold, 255, cv2.THRESH_BINARY_INV)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
preview_closed = cv2.morphologyEx(preview_binary, cv2.MORPH_CLOSE, kernel, iterations=2)
preview_clean = cv2.morphologyEx(preview_closed, cv2.MORPH_OPEN, kernel)
show([preview_binary, preview_closed, preview_clean],
     [f'Nhị phân T={preview_threshold}', 'Sau đóng', 'Sau mở'], columns=3)
''')
markdown(r'''
## 9. Lựa chọn contour bằng đặc trưng hình dạng

Trên ảnh màu nâu rõ (phân vị 75% của R−B > 20), kết hợp R−B ≤ 8 và mức xám < 200 để giảm vùng mống mắt/mí mắt nâu và phản xạ mạnh. Ảnh gần trung tính tự bỏ điều kiện màu. Đây là quy tắc cho bộ mẫu, cần kiểm tra lại với ảnh IR. Bước 8 minh họa ngưỡng đơn; bước này bổ sung điều kiện màu trước hình thái học.

- Diện tích vùng trong 1.8%–13% diện tích ROI; loại vùng chạm biên ROI.
- Độ tròn $4\pi A/P^2$, solidity $A/A_{hull}$, tỷ lệ trục ngắn/trục dài.
- Điểm xếp hạng: 0.45 × độ tròn + 0.25 × solidity + 0.20 × tỷ lệ trục + 0.10 × độ tối.

Ngưỡng tự động ở đây là **tìm kiếm ngưỡng 5–100 bước 5 theo điểm hình dạng**, không phải Otsu. Điểm xếp hạng không phải độ chính xác hay xác suất. Phần này là ứng dụng sau xử lý ảnh.
''')
code(chunk('rh, rw =', 'overlay =') + '''
if best is None:
    print('Chưa tìm được vùng hợp lệ. Kiểm tra ảnh, ROI và ngưỡng.')
else:
    print('Ngưỡng được chọn:', best['threshold'])
    print({key: round(best[key], 4) for key in ['area', 'circularity', 'solidity', 'aspect', 'score']})
    show([best['binary'], best['clean']], ['Ngưỡng được chọn', 'Sau hình thái học'])
''')
markdown('## 10. Khớp ellipse và tâm đồng tử\nKhớp ellipse trên contour, vẽ đường bao xanh và tâm đỏ. Chuyển tọa độ về ảnh gốc qua hệ số thu nhỏ. Phản xạ hoặc mí mắt che có thể làm tâm lệch. Không xuất tọa độ khi không có vùng hợp lệ.')
result_code = chunk('overlay =', 'return metrics, stages')
result_code = result_code.replace("metrics['processing_ms'] = round((time.perf_counter()-start)*1000,2)", "# Không tính thời gian giữa các cell vì bao gồm thời gian người dùng thao tác.")
code(result_code + "\nshow([frame, overlay], ['Ảnh trước xử lý', 'Ứng viên đồng tử'])\ndisplay(metrics)")
markdown('## 11. Thí nghiệm nhiễu có ảnh tham chiếu\nTạo nhiễu Gaussian σ=20 và muối tiêu 4% trên ảnh xám đã thu nhỏ từ **ảnh gốc**. So sánh trung vị và Gaussian 5×5. PSNR chỉ đo sai khác với ảnh trước khi thêm nhiễu; không đo độ chính xác tâm hoặc chất lượng của ảnh mắt lý tưởng. Thí nghiệm này độc lập với CONDITION đã chọn phía trên.')
code('''
reference_frame = cv2.resize(original_image, (w, h))
reference = cv2.cvtColor(reference_frame, cv2.COLOR_BGR2GRAY)
rng = np.random.default_rng(42)
noisy_gaussian = np.clip(reference.astype(np.float32) + rng.normal(0, 20, reference.shape), 0, 255).astype(np.uint8)
noisy_impulse = reference.copy()
random_values = rng.random(reference.shape)
noisy_impulse[random_values < .02] = 0
noisy_impulse[random_values > .98] = 255
noise_records = []
for noise_name, noisy in [('Gaussian', noisy_gaussian), ('Muối tiêu', noisy_impulse)]:
    filtered_median = cv2.medianBlur(noisy, 5)
    filtered_gaussian = cv2.GaussianBlur(noisy, (5, 5), 0)
    record = {'noise': noise_name,
              'input_psnr_db': round(cv2.PSNR(reference, noisy), 2),
              'median_psnr_db': round(cv2.PSNR(reference, filtered_median), 2),
              'gaussian_psnr_db': round(cv2.PSNR(reference, filtered_gaussian), 2)}
    noise_records.append(record)
    show([reference, noisy, filtered_median, filtered_gaussian],
         ['Tham chiếu', noise_name, 'Trung vị 5×5', 'Gaussian 5×5'], columns=2)
    print(record)
''')
markdown('## 12. Hàm tổng hợp để xử lý nhiều ảnh\nHàm bên dưới gom đúng các bước vừa trình bày, cùng tham số với `analyze` trong `eye_tracking.py`. Mã được giữ ngay trong notebook để có thể chạy độc lập với file Python. Phần đo thời gian ở đây chỉ bao gồm xử lý trong hàm, không gồm đọc ảnh và vẽ biểu đồ.')
code(functions['analyze'])
code('''
image_paths = sorted(p for p in DATA_DIR.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png'})
batch_records, batch_images, batch_titles = [], [], []
for path in image_paths:
    batch_metrics, batch_stages = analyze(read_image(path), threshold=THRESHOLD)
    batch_records.append({'file': path.name, **batch_metrics})
    batch_images.append(batch_stages['result'])
    batch_titles.append(path.stem)
if batch_images:
    show(batch_images, batch_titles, columns=2)
    for row in batch_records:
        print(row['file'], 'ứng viên:', row['detected'], 'ms:', row['processing_ms'])
else:
    print('Không có ảnh trong thư mục data.')
''')
markdown('## 13. Lưu kết quả\nLưu PNG các bước của ảnh và điều kiện đang chọn cùng số đo trong `output/notebook`. Đây là thư mục riêng, không ghi đè kết quả demo HTML. Chạy lại cùng tên ảnh và điều kiện sẽ cập nhật kết quả notebook tương ứng.')
code('''
NOTEBOOK_OUTPUT = ROOT / 'output' / 'notebook' / Path(IMAGE_NAME).stem / CONDITION
NOTEBOOK_OUTPUT.mkdir(parents=True, exist_ok=True)
for name, img in stages.items():
    ok, encoded = cv2.imencode('.png', img)
    if not ok:
        raise RuntimeError(f'Không mã hóa được bước {name}')
    encoded.tofile(str(NOTEBOOK_OUTPUT / f'{name}.png'))
(NOTEBOOK_OUTPUT / 'metrics.json').write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding='utf-8')
if batch_records:
    fields = list(dict.fromkeys(key for row in batch_records for key in row))
    with (NOTEBOOK_OUTPUT / 'batch_metrics.csv').open('w', newline='', encoding='utf-8-sig') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(batch_records)
print('Đã lưu kết quả trong output/notebook.')
''')
markdown('## Kết luận khi trình bày\nNotebook minh họa được hiệu chỉnh mức sáng, giảm nhiễu, tăng tương phản, phân đoạn và trích đặc trưng hình dạng. Kết quả trên tám ảnh chưa đủ để khẳng định hiệu quả tổng quát. Vùng cháy sáng, phản xạ lớn và che khuất vẫn là hạn chế. Bước tiếp theo là bổ sung dữ liệu có nhãn tâm, kiểm thử nhiều điều kiện và hiệu chuẩn điểm nhìn.')

for index, cell in enumerate(cells):
    cell['id'] = f'eye-dip-{index:02d}'
notebook = {'cells': cells, 'metadata': {'kernelspec': {'display_name': 'Python 3 (ipykernel)', 'language': 'python', 'name': 'python3'}, 'language_info': {'name': 'python', 'version': '3.12'}}, 'nbformat': 4, 'nbformat_minor': 5}
destination = ROOT / 'Xu_ly_anh_mat_DIP.ipynb'
destination.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'Built {destination.name}: {len(cells)} cells')
