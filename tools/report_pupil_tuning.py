"""Render a local tuning report after tools/tune_pupil.cjs completes.

Requires matplotlib in addition to requirements.txt. No input images are published.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from evaluate_pupil import evaluate


def mean(values):
    return float(np.mean(values)) if values else None


def full_ellipse(e, pw, ph, w, h):
    c, s = np.cos(e['angle']), np.sin(e['angle'])
    rotation = np.array([[c, -s], [s, c]])
    scale = np.diag([w/pw, h/ph])
    covariance = scale @ rotation @ np.diag([e['rx']**2, e['ry']**2]) @ rotation.T @ scale
    values, vectors = np.linalg.eigh(covariance)
    axis = vectors[:, 1]
    return dict(cx=(e['cx']+.5)*w/pw-.5, cy=(e['cy']+.5)*h/ph-.5,
                rx=float(np.sqrt(values[1])), ry=float(np.sqrt(values[0])),
                angle=float(np.arctan2(axis[1], axis[0])))


def draw_ellipse(image, ellipse, color, thickness=2):
    if not ellipse:
        return
    cv2.ellipse(image, (round(ellipse['cx']), round(ellipse['cy'])),
                (round(ellipse['rx']), round(ellipse['ry'])), ellipse['angle']*180/np.pi,
                0, 360, color, thickness, cv2.LINE_AA)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--experiment', type=Path, required=True)
    args = parser.parse_args()
    root = args.experiment.resolve()
    search = root/'search'
    data = root/'dataset'
    summary = json.loads((search/'summary.json').read_text())
    labels = json.loads((data/'annotations.json').read_text())['images']
    lookup = {r['id']: r for r in labels}
    original = evaluate(data/'annotations.json', data/'predictions.json', root/'baseline-captured')
    rerun = evaluate(data/'annotations.json', root/'baseline-rerun/predictions.json', root/'baseline-rerun')
    top_reports = []
    for item in summary['top'][:5]:
        folder = search/f"top-{item['rank']}"
        report = evaluate(data/'annotations.json', folder/'predictions.json', folder)
        assert abs(report['summary']['mean_ellipse_iou_positive_frames']-item['meanIoU']) < 1e-12
        top_reports.append(report)
    # Browser rerun provides the final independently executed score and latency.
    best = evaluate(data/'annotations.json', root/'best-browser/predictions.json', root/'best-browser')
    assert abs(best['summary']['mean_ellipse_iou_positive_frames']-summary['top'][0]['meanIoU']) < 1e-12
    default = evaluate(data/'annotations.json', root/'default-browser/predictions.json', root/'default-browser')
    all_results = json.loads((search/'search-results.json').read_text())['results']
    ranked = sorted(all_results, key=lambda r: (-r['meanIoU'], r['missRate'], r['centerError']))
    manual_ids = {r['id'] for r in labels if r.get('annotationSource') == 'manual-reviewed'}
    def manual_score(report):
        return mean([r['ellipse_iou'] for r in report['rows'] if r['id'] in manual_ids and not r['skipped'] and r['positive']])
    names = ['Lúc thu (đã lưu)', 'Chạy lại cấu hình lúc thu', 'Mặc định demo', 'Tốt nhất đã thử']
    reports = [original, rerun, default, best]
    table = []
    for name, report in zip(names, reports):
        s = report['summary']
        table.append((name, s['mean_ellipse_iou_positive_frames'], manual_score(report),
                      s['mean_center_error_px_detected_only'], s['miss_rate']))
    fig, ax = plt.subplots(figsize=(10, 4.6))
    values = [100*r[1] for r in table]
    bars = ax.bar(range(4), values, color=['#a3acb7', '#6e8ca8', '#ce9e52', '#29947c'])
    ax.set_xticks(range(4), names, fontsize=10)
    ax.set_ylabel('IoU ellipse trung bình (%)')
    ax.set_ylim(0, 105)
    ax.grid(axis='y', alpha=.2)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x()+bar.get_width()/2, value+1, f'{value:.2f}%', ha='center')
    ax.set_title(f"Tinh chỉnh trên {len(labels)} ảnh có nhãn — không phải test độc lập")
    fig.tight_layout(); fig.savefig(root/'score-comparison.png', dpi=180); plt.close(fig)
    before = {r['id']: r for r in rerun['rows']}
    after = {r['id']: r for r in best['rows']}
    ids = [r['id'] for r in labels]
    fig, axes = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
    axes[0].plot(range(len(ids)), [before[i]['ellipse_iou'] for i in ids], 'o-', label='Cấu hình lúc thu (chạy lại)', ms=3)
    axes[0].plot(range(len(ids)), [after[i]['ellipse_iou'] for i in ids], 'o-', label='Tốt nhất đã thử', ms=3)
    axes[0].set_ylabel('IoU ellipse'); axes[0].set_ylim(0, 1.05); axes[0].legend()
    axes[1].plot(range(len(ids)), [before[i]['center_error_px'] if before[i]['center_error_px'] is not None else np.nan for i in ids], 'o-', ms=3)
    axes[1].plot(range(len(ids)), [after[i]['center_error_px'] if after[i]['center_error_px'] is not None else np.nan for i in ids], 'o-', ms=3)
    axes[1].set_ylabel('Sai số tâm (px ảnh gốc)'); axes[1].set_xlabel('Chỉ số ảnh trong bộ nhãn')
    for ax in axes: ax.grid(alpha=.2)
    fig.tight_layout(); fig.savefig(root/'per-frame-comparison.png', dpi=180); plt.close(fig)
    pred_before = {p['id']: p for p in json.loads((root/'baseline-rerun/predictions.json').read_text())['images']}
    pred_after = {p['id']: p for p in json.loads((root/'best-browser/predictions.json').read_text())['images']}
    changes = sorted(ids, key=lambda i: after[i]['ellipse_iou']-before[i]['ellipse_iou'])
    worst_after = min(ids, key=lambda i: after[i]['ellipse_iou'])
    selected = list(dict.fromkeys(changes[-3:][::-1]+[worst_after]+changes[:4]))
    tiles = []
    for ident in selected:
        label = lookup[ident]
        image = cv2.imread(str(data/label['file']))
        draw_ellipse(image, label['ellipse'], (255, 230, 40), 2)
        for predictions, color in [(pred_before, (0, 150, 255)), (pred_after, (40, 245, 70))]:
            p = predictions[ident]
            if p['ellipse']:
                e = full_ellipse(p['ellipse'], p['processedWidth'], p['processedHeight'], label['width'], label['height'])
                draw_ellipse(image, e, color, 2)
        image = cv2.resize(image, (240, 320))
        tile = np.full((350, 240, 3), 245, np.uint8); tile[30:] = image
        title = f"{ident[-5:]}: {before[ident]['ellipse_iou']:.3f} -> {after[ident]['ellipse_iou']:.3f}"
        cv2.putText(tile, title, (5, 21), cv2.FONT_HERSHEY_SIMPLEX, .43, (30, 30, 30), 1, cv2.LINE_AA)
        tiles.append(tile)
    while len(tiles)%4: tiles.append(np.full_like(tiles[0], 245))
    cv2.imwrite(str(root/'ellipse-comparison.jpg'), np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)]))
    settings = summary['top'][0]['settings']
    lines = ['# Kết quả tìm cấu hình xử lý ảnh', '',
             f"Đã thử **{summary['configurations']} cấu hình** trên **{len(labels)} ảnh**; chọn theo IoU ellipse trung bình cao nhất, sau đó tỷ lệ mất dấu và sai số tâm.", '',
             'Đây là kết quả tinh chỉnh trên chính bộ ảnh người dùng cung cấp, không phải điểm test độc lập hay kết quả trên bộ dữ liệu công bố.', '', 'Các phép lọc nhiễu được so bằng chất lượng ellipse cuối cùng. Không có ảnh sạch tham chiếu nên không tính PSNR/SSIM hay khẳng định khôi phục chi tiết ảnh.', '',
             f"Bộ có {len(manual_ids)} nhãn chỉnh tay và {len(labels)-len(manual_ids)} nhãn duyệt từ dự đoán; tất cả cùng một người/phiên và đều có đồng tử. Không đo được báo nhầm khi thiếu ảnh âm.", '',
             '## So sánh', '', '| Cấu hình | IoU 29 ảnh | IoU nhãn chỉnh tay | Sai số tâm (px gốc) | Mất dấu |', '|---|---:|---:|---:|---:|']
    for name, iou, manual, error, miss in table:
        lines.append(f'| {name} | {100*iou:.2f}% | {100*manual:.2f}% | {error:.3f} | {100*miss:.2f}% |')
    before_good = sum(before[i]['ellipse_iou'] >= .8 for i in ids)
    after_good = sum(after[i]['ellipse_iou'] >= .8 for i in ids)
    worst = after[worst_after]
    lines += ['', f'Số ảnh IoU ≥ 0,8: **{before_good}/{len(ids)} → {after_good}/{len(ids)}**. Mất dấu chỉ có nghĩa không xuất ellipse; xuất một ellipse sai vị trí vẫn là lỗi định vị dù tỷ lệ mất dấu bằng 0.', '',
              f"Ảnh cần kiểm tra kỹ: `{worst_after}` — IoU sau tinh chỉnh {worst['ellipse_iou']:.3f}, sai số tâm {worst['center_error_px']:.2f} px. Ảnh được giữ nguyên trong mọi phép tính; không tự sửa hoặc bỏ nhãn. Nên xem lại trạng thái visible/occluded/unusable ở các ảnh mí che nặng."]
    gain = 100*(table[-1][1]-table[1][1]); error_drop = table[1][3]-table[-1][3]
    lines += ['', f'So với chạy lại cấu hình lúc thu: IoU tăng **{gain:.2f} điểm phần trăm**, sai số tâm giảm **{error_drop:.3f} px**.', '',
              'Kết quả dự đoán đã lưu lúc thu và chạy lại PNG gốc có khác biệt nhỏ; báo cáo giữ hai mốc riêng. Cả quá trình tìm kiếm và chạy lại trình duyệt dùng đúng hàm DIP hiện tại; đã đối chiếu 5 cấu hình đầu với evaluator Python.', '',
              '## Cấu hình tốt nhất trong phạm vi đã thử', '', '```json', json.dumps(settings, ensure_ascii=False, indent=2), '```', '',
              '## 10 cấu hình đứng đầu', '', '| Hạng | IoU | IoU chỉnh tay | Sai số tâm | Mất dấu | Pha tìm kiếm |', '|---:|---:|---:|---:|---:|---|']
    for i, r in enumerate(ranked[:10],1):
        lines.append(f"| {i} | {100*r['meanIoU']:.3f}% | {100*r['manualIoU']:.3f}% | {r['centerError']:.3f} px | {100*r['missRate']:.1f}% | {r['phase']} |")
    baseline_settings = summary['baseline']['settings']
    lines += ['', '## Tác động từng thay đổi riêng', '',
              'Giữ nguyên cấu hình lúc thu, chỉ thay nhóm được ghi ở mỗi dòng. Đây không phải so sánh các cấu hình tốt nhất tùy ý.', '',
              '| Thay đổi so với lúc thu | IoU ellipse | Sai số tâm | Mất dấu |', '|---|---:|---:|---:|']
    changes = [('Không đổi', {}), ('Đổi sang kênh đỏ', {'red': True}),
               ('Bật trung vị 3×3', {'medianEnabled': True}),
               ('Bật Gaussian 3×3', {'gaussianEnabled': True}),
               ('Bật cả trung vị và Gaussian', {'medianEnabled': True, 'gaussianEnabled': True}),
               ('Tắt blur trước ngưỡng', {'preBlur': False}),
               ('Blur 3×3, sigma 0,8', {'preBlur': True, 'preBlurSize': 3, 'preBlurSigma': .8}),
               ('Blur 7×7, sigma 1,6', {'preBlur': True, 'preBlurSize': 7, 'preBlurSigma': 1.6}),
               ('Blur 11×11, sigma 2,5', {'preBlur': True, 'preBlurSize': 11, 'preBlurSigma': 2.5})]
    for title, change in changes:
        expected = {**baseline_settings, **change}
        item = next((r for r in all_results if r['settings'] == expected), None)
        if item:
            lines.append(f"| {title} | {100*item['meanIoU']:.3f}% | {item['centerError']:.3f} px | {100*item['missRate']:.1f}% |")
    lines += ['', '## Phạm vi tìm kiếm', '',
              '- Kênh xám/đỏ; bật/tắt trung vị 3×3 và Gaussian 3×3.',
              '- Blur bổ sung: tắt hoặc kernel 3/5/7/9/11, sigma 0,8/1,2/1,6/2/2,5.',
              '- Tương phản: mức đen 0/20/30/42/50/60, trắng 100/117/135/160/200, gamma 0,8/1,2/1,7/2,2; thêm trường hợp tắt.',
              '- Gamma đầu vào: tắt, tự động hoặc 0,6/0,8/1/1,2/1,5/2.',
              '- Ngưỡng tự động; thủ công 0–255 bước 8 rồi tinh chỉnh ±9 quanh các kết quả tốt; rà lại tương tác kênh/lọc/blur.',
              '- Tìm kiếm theo nhiều pha trên các cấu hình tốt, không quét mọi tổ hợp có thể; không khẳng định tối ưu toàn cục.', '',
              '## Hình minh họa', '', '![So sánh điểm](score-comparison.png)', '', '![Từng ảnh](per-frame-comparison.png)', '',
              'Ảnh dưới: nhãn tham chiếu màu cyan, cấu hình lúc thu màu cam, cấu hình tốt nhất màu xanh lá; gồm các ảnh cải thiện nhiều, ảnh còn kém nhất và ảnh giảm điểm.', '', '![Ellipse](ellipse-comparison.jpg)', '',
              '## Tệp dùng lại', '',
              '- `search/best-settings.json`: dùng với `tools/benchmark_pupil.cjs --settings ...`.',
              '- `search/ranking.csv`: toàn bộ cấu hình và điểm; `search/search-results.json`: từng ảnh của từng cấu hình.',
              '- `best-browser/evaluation.csv` và `.json`: kết quả cuối được chạy lại trong trình duyệt và chấm bằng Python.', '',
              'Để đánh giá độc lập, giữ cấu hình này cố định và thu thêm một bộ khác. Không dùng lại điểm của bộ đã tinh chỉnh làm khả năng tổng quát. Không thay cấu hình mặc định demo trong thí nghiệm này.']
    (root/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('Report:', root/'REPORT.md')


if __name__ == '__main__':
    main()
