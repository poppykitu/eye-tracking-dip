"""Cross-check a browser QA export with the Python evaluator (generated data only)."""
import json
import sys
import zipfile
from pathlib import Path
import cv2
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from evaluate_pupil import evaluate, read_annotations

root = Path('output/dataset_qa').resolve()
target = root / 'reviewed'
target.mkdir(exist_ok=True)
with zipfile.ZipFile(root / 'reviewed.zip') as archive:
    for name in archive.namelist():
        if not (target / name).resolve().is_relative_to(target):
            raise ValueError('Unsafe archive member')
    archive.extractall(target)
report = evaluate(target / 'annotations.json', target / 'predictions.json', root / 'python-report')
browser = json.loads((root / 'browser-report.json').read_text())
for key, expected in browser['summary'].items():
    if key in report['summary']:
        actual = report['summary'][key]
        assert actual == expected or abs(actual - expected) < 1e-12, (key, actual, expected)
with zipfile.ZipFile(root / 'capture.zip') as archive:
    labels = json.loads(archive.read('annotations.json'))
    for row in labels['images']:
        original = cv2.imdecode(np.frombuffer(archive.read(row['file']), np.uint8), cv2.IMREAD_COLOR)
        assert original.shape[:2] == (row['height'], row['width'])
        assert not row['reviewed'] and not row['polygon']
    draft = root / 'draft.json'
    draft.write_text(json.dumps(labels))
    try:
        read_annotations(draft)
    except ValueError as error:
        assert 'Unreviewed' in str(error)
    else:
        raise AssertionError('Draft accepted as evaluation reference')
print('PASS: ZIP readable by Python, dimensions preserved, draft rejected, browser and Python metrics match exactly.')
