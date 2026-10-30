"""Create explicitly synthetic regression inputs. These are NOT real-eye labels."""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np


def create(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for angle in (0, .5, 1, 1.57):
        for cut in (1, .65, .35, -.3):
            y, x = np.indices((240, 320))
            u = np.cos(angle)*(x-160)+np.sin(angle)*(y-120)
            v = -np.sin(angle)*(x-160)+np.cos(angle)*(y-120)
            mask = (((u/35)**2+(v/24)**2 <= 1) & (v >= -cut*24)).astype(np.uint8)
            image = np.where(mask, 25, 150).astype(np.uint8)
            name = f"synthetic_{len(records):02d}.png"
            (output/name).write_bytes(cv2.imencode('.png', image)[1].tobytes())
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            records.append(dict(id=name, file=name, width=320, height=240, subject="synthetic01", session="geometry01", split="test",
                                state="visible" if cut == 1 else "occluded", polygon=contours[0][:, 0].tolist(), ellipse=dict(cx=160, cy=120, rx=35, ry=24, angle=angle)))
    for level in (20, 150):
        name = f"synthetic_absent_{level}.png"
        (output/name).write_bytes(cv2.imencode('.png', np.full((240,320), level, np.uint8))[1].tobytes())
        records.append(dict(id=name, file=name, width=320, height=240, subject="synthetic01", session="geometry01", split="test", state="absent", polygon=[], ellipse=None))
    payload = dict(schema="eye-pupil-annotations-v1", source="Generated synthetic geometric regression, NOT human annotations or public-dataset results", images=records)
    (output/'annotations.json').write_text(json.dumps(payload, indent=2), encoding='utf-8')
    return payload


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='output/evaluation_synthetic/inputs')
    create(parser.parse_args().output)
