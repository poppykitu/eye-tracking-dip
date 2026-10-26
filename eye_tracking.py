"""DIP pupil localization on close-up eye images. No trained model required."""
from pathlib import Path
import argparse
import base64
import csv
import json
import math
import time
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent


def histogram_panel(before, after):
    panel = np.full((400, 768, 3), 10, np.uint8)
    histograms = [cv2.calcHist([im], [0], None, [256], [0,256]).ravel() for im in (before,after)]
    maximum = max(float(h.max()) for h in histograms)
    for hist, color, label, ypos in zip(histograms, [(190,90,20),(30,150,30)], ['Input grayscale','After gamma + median'], [25,50]):
        points = np.array([[int(40+i*2.6),int(355-v/maximum*280)] for i,v in enumerate(hist)],np.int32)
        cv2.polylines(panel,[points],False,color,2)
        cv2.putText(panel,label,(40,ypos),cv2.FONT_HERSHEY_SIMPLEX,.55,color,1)
    cv2.line(panel,(40,355),(705,355),(90,90,90),1)
    for i in [0,64,128,192,255]:
        cv2.putText(panel,str(i),(int(35+i*2.6),380),cv2.FONT_HERSHEY_SIMPLEX,.45,(160,160,160),1)
    return panel


def read_image(path):
    image = cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f'Cannot read image: {path}')
    return image


def noise_experiment(image, seed=42):
    """Known reference allows PSNR on synthetic noise only, not real quality."""
    h,w=image.shape[:2]
    reference=cv2.cvtColor(cv2.resize(image,(1024,round(h*1024/w))),cv2.COLOR_BGR2GRAY)
    rng=np.random.default_rng(seed)
    gaussian=np.clip(reference.astype(np.float32)+rng.normal(0,20,reference.shape),0,255).astype(np.uint8)
    impulses=reference.copy()
    random=rng.random(reference.shape)
    impulses[random<.02]=0
    impulses[random>.98]=255
    output=[]
    for kind,noisy in [('Gaussian sigma=20',gaussian),('Salt pepper 4%',impulses)]:
        median=cv2.medianBlur(noisy,5)
        gaussian_filtered=cv2.GaussianBlur(noisy,(5,5),0)
        metrics={'noise':kind,'input_psnr_db':round(cv2.PSNR(reference,noisy),2),
                 'median_psnr_db':round(cv2.PSNR(reference,median),2),
                 'gaussian_psnr_db':round(cv2.PSNR(reference,gaussian_filtered),2)}
        tiles=[]
        for label,im in [('Reference',reference),('Noisy',noisy),('Median 5x5',median),('Gaussian 5x5',gaussian_filtered)]:
            tile=cv2.cvtColor(cv2.resize(im,(400,225)),cv2.COLOR_GRAY2BGR)
            tile=cv2.copyMakeBorder(tile,35,0,0,0,cv2.BORDER_CONSTANT,value=(240,240,240))
            cv2.putText(tile,label,(10,25),cv2.FONT_HERSHEY_SIMPLEX,.65,(30,30,30),1)
            tiles.append(tile)
        panel=np.hstack(tiles)
        encoded=cv2.imencode('.jpg',panel)[1]
        output.append({'metrics':metrics,'image':'data:image/jpeg;base64,'+base64.b64encode(encoded).decode('ascii')})
    return output


def analyze(image, threshold=None):
    """Fixed broad ROI assumes a single close-up eye, as in supplied samples.

    Threshold red channel: brown iris is brighter than blue/black pupil here.
    This is a visible-light sample-specific choice, not an IR calibration.
    """
    start = time.perf_counter()
    h0, w0 = image.shape[:2]
    scale = min(1.0, 1024 / w0)
    frame = cv2.resize(image, (round(w0 * scale), round(h0 * scale)))
    h, w = frame.shape[:2]
    x0, y0, x1, y1 = int(.18*w), int(.20*h), int(.87*w), int(.85*h)
    input_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    median = float(np.median(input_gray))
    gamma = float(np.clip(math.log(130/255)/math.log(max(1, min(254, median))/255), .4, 1.4)) if not 90 <= median <= 170 else 1.0
    lut = np.array([round(255*(i/255)**gamma) for i in range(256)], dtype=np.uint8)
    balanced = cv2.LUT(frame, lut)
    denoised = cv2.medianBlur(balanced, 5)
    roi = denoised[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    red = roi[:, :, 2]
    smooth = cv2.GaussianBlur(red, (7, 7), 0)
    low, high = np.percentile(smooth, (2, 98))
    enhanced = np.clip((smooth.astype(np.float32)-low)*255/max(1, high-low), 0, 255).astype(np.uint8)
    rh, rw = gray.shape
    # In these visible-light color samples, brown iris/eyelid pixels can be
    # as dark as the pupil in R alone. Reject their positive R-B chroma.
    # Disable this gate on near-neutral images (e.g. monochrome IR).
    red_blue = red.astype(np.int16) - roi[:, :, 0].astype(np.int16)
    use_color_gate = bool(np.percentile(red_blue, 75) > 20)
    color_gate = ((red_blue <= 8) & (gray < 200)).astype(np.uint8) * 255 if use_color_gate else np.full_like(gray, 255)
    values = [threshold] if threshold is not None else list(range(5, 101, 5))
    best = None
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    for t in values:
        _, binary = cv2.threshold(enhanced, t, 255, cv2.THRESH_BINARY_INV)
        binary = cv2.bitwise_and(binary, color_gate)
        clean = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
        clean = cv2.morphologyEx(clean, cv2.MORPH_OPEN, kernel)
        contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            area = cv2.contourArea(c)
            fraction = area/(rh*rw)
            if not .018 < fraction < .13 or len(c) < 5:
                continue
            x, y, cw, ch = cv2.boundingRect(c)
            if x <= 1 or y <= 1 or x+cw >= rw-1 or y+ch >= rh-1:
                continue
            perimeter = cv2.arcLength(c, True)
            circularity = 4*math.pi*area/max(perimeter**2, 1)
            solidity = area/max(cv2.contourArea(cv2.convexHull(c)), 1)
            ellipse = cv2.fitEllipse(c)
            (cx, cy), (a, b), angle = ellipse
            aspect = min(a,b)/max(a,b)
            if aspect < .4 or solidity < .65 or circularity < .3:
                continue
            mask = np.zeros_like(gray)
            cv2.drawContours(mask, [c], -1, 255, -1)
            darkness = 1-float(cv2.mean(enhanced, mask=mask)[0])/255
            score = .45*circularity + .25*solidity + .2*aspect + .1*darkness
            if best is None or score > best['score']:
                best = dict(score=score, contour=c, ellipse=ellipse, threshold=t,
                            area=area, circularity=circularity, solidity=solidity,
                            aspect=aspect, binary=binary, clean=clean)
    overlay = frame.copy()
    cv2.rectangle(overlay, (x0,y0), (x1,y1), (255,180,0), 2)
    residual = input_gray.astype(np.float32)-cv2.medianBlur(input_gray, 5).astype(np.float32)
    noise_proxy = float(np.median(np.abs(residual))/.6745)
    metrics = {'detected': best is not None, 'source_width': w0, 'source_height': h0,
               'median_intensity': round(median,2), 'gamma': round(gamma,3),
               'bright_clip_percent': round(float(np.mean(input_gray>=250))*100,2),
               'dark_clip_percent': round(float(np.mean(input_gray<=5))*100,2),
               'noise_proxy': round(noise_proxy,2), 'color_gate': use_color_gate}
    if best:
        (cx, cy), axes, angle = best['ellipse']
        center = (cx+x0, cy+y0)
        cv2.ellipse(overlay, (center, axes, angle), (0,255,0), 2)
        cv2.drawMarker(overlay, tuple(round(v) for v in center), (0,0,255), cv2.MARKER_CROSS, 20, 2)
        cv2.putText(overlay, f'Pupil candidate ({center[0]/scale:.0f}, {center[1]/scale:.0f})', (20,35), cv2.FONT_HERSHEY_SIMPLEX, .7, (0,170,0), 2)
        metrics.update(center_x=round(center[0]/scale,2), center_y=round(center[1]/scale,2),
                       normalized_x=round(center[0]/w,4), normalized_y=round(center[1]/h,4),
                       area_px=round(best['area']/scale**2,2),
                       circularity=round(best['circularity'],4), solidity=round(best['solidity'],4),
                       axis_ratio=round(best['aspect'],4), threshold=best['threshold'],
                       selection_score=round(best['score'],4))
        binary, clean = best['binary'], best['clean']
    else:
        _, binary = cv2.threshold(enhanced, threshold if threshold is not None else 50, 255, cv2.THRESH_BINARY_INV)
        binary = cv2.bitwise_and(binary, color_gate)
        clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        cv2.putText(overlay, 'NO VALID CANDIDATE', (20,35), cv2.FONT_HERSHEY_SIMPLEX, .8, (0,0,255), 2)
    metrics['processing_ms'] = round((time.perf_counter()-start)*1000,2)
    stages = {'original':frame, 'balanced':balanced, 'denoised':denoised,
              'histogram':histogram_panel(input_gray,cv2.cvtColor(denoised,cv2.COLOR_BGR2GRAY)),
              'gray':gray, 'red':red, 'enhanced':enhanced,
              'binary':binary, 'clean':clean, 'result':overlay}
    return metrics, stages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT/'data')
    parser.add_argument('--output', type=Path, default=ROOT/'output')
    parser.add_argument('--threshold', type=int, help='Fixed threshold 0..255; default searches 5..100')
    args = parser.parse_args()
    if args.threshold is not None and not 0 <= args.threshold <= 255:
        parser.error('threshold must be 0..255')
    paths = sorted(p for p in args.input.iterdir() if p.suffix.lower() in {'.jpg','.jpeg','.png','.bmp'})
    if not paths:
        parser.error('No images found in input folder')
    args.output.mkdir(parents=True, exist_ok=True)
    results, records, experiments = [], [], []
    for path in paths:
        original = read_image(path)
        for experiment in noise_experiment(original):
            experiment['metrics']['file']=path.name
            experiments.append(experiment)
        variants = {'original': original,
                    'bright': np.clip(original.astype(np.float32)*1.35+35,0,255).astype(np.uint8),
                    'dark': np.clip(original.astype(np.float32)*.28,0,255).astype(np.uint8),
                    'noise': np.clip(original.astype(np.float32)+np.random.default_rng(42).normal(0,28,original.shape),0,255).astype(np.uint8)}
        folder = args.output/path.stem
        folder.mkdir(exist_ok=True)
        for condition, sample in variants.items():
            metrics, stages = analyze(sample, args.threshold)
            metrics = {'file':path.name, 'condition':condition, **metrics}
            records.append(metrics)
            encoded = {}
            target = folder if condition == 'original' else folder/condition
            target.mkdir(exist_ok=True)
            for name, img in stages.items():
                ok, png = cv2.imencode('.png', img)
                if not ok:
                    raise RuntimeError('PNG encoding failed')
                png.tofile(str(target/f'{name}.png'))
                display_img = img
                if name in {'gray', 'red', 'enhanced', 'binary', 'clean'}:
                    # Keep ROI pixels in full-frame coordinates for before/after.
                    fh, fw = stages['original'].shape[:2]
                    display_img = np.full((fh, fw), 12, dtype=np.uint8)
                    rx, ry = int(.18*fw), int(.20*fh)
                    display_img[ry:ry+img.shape[0], rx:rx+img.shape[1]] = img
                ok, jpg = cv2.imencode('.jpg', display_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
                encoded[name] = 'data:image/jpeg;base64,'+base64.b64encode(jpg).decode('ascii')
            results.append({'metrics':metrics, 'stages':encoded})
            print(json.dumps(metrics, ensure_ascii=True))
    fields = list(dict.fromkeys(k for r in records for k in r))
    with (args.output/'metrics.csv').open('w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    (args.output/'results.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    template = (ROOT/'report_template.html').read_text(encoding='utf-8')
    webcam_script = (ROOT/'webcam.js').read_text(encoding='utf-8')
    image_worker = (ROOT/'image_worker.js').read_text(encoding='utf-8')
    image_controls = (ROOT/'image_controls.js').read_text(encoding='utf-8')
    glasses_script = (ROOT/'glasses.js').read_text(encoding='utf-8')
    eye3d_script = (ROOT/'eye3d.js').read_text(encoding='utf-8')
    (args.output/'demo.html').write_text(template.replace('__RESULTS__',json.dumps(results)).replace('__NOISE_EVAL__',json.dumps(experiments)).replace('__WEBCAM_SCRIPT__',webcam_script).replace('__GLASSES_SCRIPT__',glasses_script).replace('__EYE3D_SCRIPT__',eye3d_script).replace('__IMAGE_WORKER__',image_worker).replace('__IMAGE_CONTROLS__',image_controls),encoding='utf-8')
    with (args.output/'noise_evaluation.csv').open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.DictWriter(f,fieldnames=list(experiments[0]['metrics']))
        writer.writeheader()
        writer.writerows(e['metrics'] for e in experiments)
    tiles=[]
    for result in results:
        if result['metrics']['condition'] != 'original':
            continue
        img=read_image(args.output/Path(result['metrics']['file']).stem/'result.png')
        tile=cv2.resize(img,(512,288))
        cv2.putText(tile,result['metrics']['file'],(8,275),cv2.FONT_HERSHEY_SIMPLEX,.4,(30,30,30),1)
        tiles.append(tile)
    while len(tiles)%2:
        tiles.append(np.zeros_like(tiles[0]))
    montage=np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)])
    cv2.imencode('.jpg',montage)[1].tofile(str(args.output/'overview.jpg'))
    print(f'Demo: {args.output / "demo.html"}')


if __name__ == '__main__':
    main()
