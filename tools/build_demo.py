"""Rebuild browser scripts using the existing embedded static-image results.
This does not rerun the Python image experiment or rewrite its PNGs.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
output=ROOT/'output/demo.html'
if not output.exists():
    raise SystemExit('Run eye_tracking.py once to generate static image results first.')
old=output.read_text(encoding='utf-8')
def embedded(prefix):
    start=old.index(prefix)+len(prefix)
    value,_=json.JSONDecoder().raw_decode(old[start:].lstrip())
    return value
results=embedded('const allData=')
noise=embedded('const noiseData=')
template=(ROOT/'report_template.html').read_text(encoding='utf-8')
for marker,file in {'__ELLIPSE_GEOMETRY__':'ellipse_geometry.js','__WEBCAM_SCRIPT__':'webcam.js','__GLASSES_SCRIPT__':'glasses.js','__RECONSTRUCTION_SCRIPT__':'eye_reconstruction.js','__EYE3D_SCRIPT__':'eye3d.js','__IMAGE_WORKER__':'image_worker.js','__IMAGE_CONTROLS__':'image_controls.js','__DATASET_COMMON__':'dataset_common.js','__DATASET_CAPTURE__':'dataset_capture.js'}.items():
    template=template.replace(marker,(ROOT/file).read_text(encoding='utf-8'))
template=template.replace('__RESULTS__',json.dumps(results)).replace('__NOISE_EVAL__',json.dumps(noise))
output.write_text(template,encoding='utf-8')
(ROOT/'output/annotate.html').write_text((ROOT/'annotation_tool.html').read_text(encoding='utf-8').replace('__DATASET_COMMON__',(ROOT/'dataset_common.js').read_text(encoding='utf-8')).replace('__ANNOTATION_EDITOR__',(ROOT/'annotation_editor.js').read_text(encoding='utf-8')),encoding='utf-8')
print('Rebuilt demo and annotation tool; static image experiments preserved.')
