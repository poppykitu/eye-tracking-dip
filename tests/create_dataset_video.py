"""Generate a seekable local video fixture; requires ffmpeg, never a real camera."""
import os
import shutil
import subprocess
from pathlib import Path
import cv2

exe = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not exe:
    bundled = Path(os.environ.get('LOCALAPPDATA', '.')) / 'ms-playwright'
    exe = next(bundled.glob('ffmpeg-*/ffmpeg-win64.exe'), None)
if not exe:
    raise SystemExit('Set FFMPEG_BINARY or install ffmpeg for the optional video-file test.')
output = Path('output/dataset_qa')
output.mkdir(parents=True, exist_ok=True)
image = cv2.imread('tests/fixtures/pupil_clear_notch_input.png')
jpeg = cv2.imencode('.jpg', image)[1].tobytes()
subprocess.run([str(exe), '-hide_banner', '-loglevel', 'error', '-y',
                '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '5', '-i', 'pipe:0',
                '-c:v', 'libvpx-vp9', str(output / 'video.webm')], input=jpeg * 10, check=True)
print('Generated two-second QA video; this is not a test-accuracy dataset.')
