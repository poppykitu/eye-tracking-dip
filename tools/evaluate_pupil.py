"""Evaluate visible segmentation separately from optional full-pupil ellipse labels."""
import argparse
import csv
import json
import math
from pathlib import Path
import cv2
import numpy as np


def decode_mask_rle(counts, width, height):
    size = width * height
    if not isinstance(counts, list) or not counts or len(counts) > size + 1:
        raise ValueError("Invalid mask RLE")
    mask = np.zeros(size, np.uint8)
    offset = 0
    for index, count in enumerate(counts):
        if not isinstance(count, int) or isinstance(count, bool) or count < 0 or offset + count > size:
            raise ValueError("Invalid mask RLE length")
        if index % 2:
            mask[offset:offset + count] = 1
        offset += count
    if offset != size:
        raise ValueError("Mask RLE dimensions differ from original image")
    return mask.reshape(height, width)


def read_annotations(path):
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    if data.get("schema") != "eye-pupil-annotations-v1" or not data.get("images"):
        raise ValueError("Expected non-empty eye-pupil-annotations-v1")
    seen, groups = set(), {}
    for row in data["images"]:
        if row.get("reviewed") is False:
            raise ValueError("Unreviewed annotation: " + str(row.get("id")))
        if not row.get("id") or row["id"] in seen:
            raise ValueError("Missing or duplicate annotation ID")
        seen.add(row["id"])
        for key in ("subject", "session"):
            if not str(row.get(key, "")).strip():
                raise ValueError(f"Missing {key}: {row['id']}")
        if row.get("split") not in ("tune", "test"):
            raise ValueError("Split must be tune or test")
        if row["subject"] in groups and groups[row["subject"]] != row["split"]:
            raise ValueError("Subject leakage between tune/test: " + row["subject"])
        groups[row["subject"]] = row["split"]
        if row.get("state") not in ("visible", "occluded", "absent", "unusable"):
            raise ValueError("Invalid visibility state")
        w, h = row.get("width", 0), row.get("height", 0)
        if not isinstance(w, int) or not isinstance(h, int) or min(w, h) < 1:
            raise ValueError("Invalid original image dimensions")
        polygon = row.get("polygon", [])
        rle_mask = decode_mask_rle(row["mask_rle"], w, h) if row.get("mask_rle") is not None else None
        if row["state"] in ("visible", "occluded") and len(polygon) < 3 and rle_mask is None and not row.get("reference_mask"):
            raise ValueError("Visible pupil requires a manually labeled polygon")
        if rle_mask is not None and row["state"] in ("visible", "occluded") and not np.any(rle_mask):
            raise ValueError("Positive reference mask cannot be empty")
        if rle_mask is not None and row["state"] == "absent" and np.any(rle_mask):
            raise ValueError("Absent reference mask must be empty")
        if row["state"] == "absent" and (polygon or row.get("ellipse")):
            raise ValueError("Absent pupil cannot have polygon or ellipse")
        if any(len(p) != 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in p) or not (0 <= p[0] < w and 0 <= p[1] < h) for p in polygon):
            raise ValueError("Polygon outside original image or invalid coordinates")
        e = row.get("ellipse")
        if e and (not all(isinstance(e.get(k), (int, float)) and math.isfinite(e[k]) for k in ("cx", "cy", "rx", "ry", "angle")) or min(e["rx"], e["ry"]) <= 0):
            raise ValueError("Invalid full ellipse annotation")
    return data["images"]


def overlap(a, b):
    intersection = int(np.count_nonzero(a & b))
    total = int(a.sum() + b.sum())
    union = int(np.count_nonzero(a | b))
    return (intersection / union if union else 1.0,
            2 * intersection / total if total else 1.0)


def ellipse_mask(e, width, height, processed_width=None, processed_height=None):
    y, x = np.indices((height, width), dtype=float)
    if processed_width:
        x = (x + .5) * processed_width / width - .5
        y = (y + .5) * processed_height / height - .5
    dx, dy = x - e["cx"], y - e["cy"]
    ca, sa = math.cos(e["angle"]), math.sin(e["angle"])
    return ((ca * dx + sa * dy) / e["rx"]) ** 2 + ((-sa * dx + ca * dy) / e["ry"]) ** 2 <= 1


def score_frame(gt, prediction, visible_mask, reference_mask=None):
    w, h = gt["width"], gt["height"]
    if visible_mask.shape != (h, w):
        raise ValueError("Prediction must use original image dimensions; no silent resizing")
    if gt["state"] == "unusable":
        return {"id": gt["id"], "split": gt["split"], "state": gt["state"], "condition": gt.get("condition", "unspecified"), "skipped": True}
    visible = np.zeros((h, w), np.uint8)
    if gt["polygon"]:
        cv2.fillPoly(visible, [np.rint(gt["polygon"]).astype(np.int32)], 1)
    if gt.get("mask_rle") is not None:
        visible = decode_mask_rle(gt["mask_rle"], w, h)
    if reference_mask is not None:
        if reference_mask.shape != (h, w):
            raise ValueError("Reference mask dimensions differ from original image")
        if gt["state"] == "absent" and np.any(reference_mask):
            raise ValueError("Absent reference mask must be empty")
        if gt["state"] in ("visible", "occluded") and not np.any(reference_mask):
            raise ValueError("Positive reference mask cannot be empty")
        visible = reference_mask
    positive, detected = gt["state"] != "absent", prediction.get("ellipse") is not None
    if bool(np.any(visible_mask)) != detected:
        raise ValueError("Prediction mask and detection disagree")
    iou, dice = overlap(visible.astype(bool), visible_mask.astype(bool))
    result = {"id": gt["id"], "subject": gt["subject"], "session": gt["session"], "split": gt["split"], "state": gt["state"], "skipped": False,
              "condition": gt.get("condition", "unspecified"), "annotation_source": gt.get("annotationSource", "user-supplied"), "positive": positive, "detected": detected, "center_reference_available": bool(gt.get("ellipse")), "outcome": ("TP" if detected else "FN") if positive else ("FP" if detected else "TN"),
              "visible_iou": iou, "visible_dice": dice, "center_error_px": None, "full_ellipse_iou": None,
              "ellipse_inferred": prediction.get("ellipse", {}).get("occluded", False) if detected else False}
    if positive and detected and gt.get("ellipse"):
        p, ref = prediction["ellipse"], gt["ellipse"]
        pw, ph = prediction["processedWidth"], prediction["processedHeight"]
        cx, cy = (p["cx"] + .5) * w / pw - .5, (p["cy"] + .5) * h / ph - .5
        result["center_error_px"] = math.hypot(cx - ref["cx"], cy - ref["cy"])
        result["full_ellipse_iou"] = overlap(ellipse_mask(ref, w, h), ellipse_mask(p, w, h, pw, ph))[0]
    return result


def summarize(rows):
    valid = [r for r in rows if not r["skipped"]]
    positives = [r for r in valid if r["positive"]]
    negative = [r for r in valid if not r["positive"]]
    errors = [r["center_error_px"] for r in positives if r["center_error_px"] is not None]
    ellipses = [r["full_ellipse_iou"] for r in positives if r["full_ellipse_iou"] is not None]
    mean = lambda a: float(np.mean(a)) if a else None
    return {"frames": len(rows), "evaluated": len(valid), "skipped": len(rows)-len(valid), "positive_frames": len(positives), "absent_frames": len(negative),
            "mean_visible_iou_positive_frames": mean([r["visible_iou"] for r in positives]),
            "mean_visible_dice_positive_frames": mean([r["visible_dice"] for r in positives]),
            "miss_rate": mean([not r["detected"] for r in positives]),
            "false_positive_rate_absent": mean([r["detected"] for r in negative]),
            "mean_center_error_px_detected_only": mean(errors), "center_evaluated_count": len(errors), "center_reference_count": sum(r["center_reference_available"] for r in positives),
            "mean_full_ellipse_iou_detected_only": mean(ellipses)}


def read_binary_mask(base, name):
    base = Path(base).resolve()
    path = (base / name).resolve()
    if not path.is_relative_to(base):
        raise ValueError("Mask outside dataset directory")
    mask = cv2.imdecode(np.frombuffer(path.read_bytes(), np.uint8), cv2.IMREAD_UNCHANGED)
    if mask is not None and mask.ndim == 3:
        if mask.shape[2] == 4 and not np.all(mask[:, :, 3] == 255):
            raise ValueError("Mask cannot be transparent")
        if not (np.array_equal(mask[:, :, 0], mask[:, :, 1]) and np.array_equal(mask[:, :, 1], mask[:, :, 2])):
            raise ValueError("Mask RGB channels differ")
        mask = mask[:, :, 0]
    if mask is None or mask.ndim != 2:
        raise ValueError("Mask must be grayscale")
    if not set(np.unique(mask)).issubset({0, 255}):
        raise ValueError("Mask must contain only 0 and 255")
    return mask > 0


def evaluate(annotations_path, predictions_path, output):
    annotations = read_annotations(annotations_path)
    predictions_path = Path(predictions_path).resolve()
    payload = json.loads(predictions_path.read_text(encoding="utf-8-sig"))
    if payload.get("schema") != "eye-pupil-predictions-v1":
        raise ValueError("Invalid prediction schema")
    entries = payload["images"]
    if len({p["id"] for p in entries}) != len(entries):
        raise ValueError("Duplicate prediction IDs")
    predictions = {p["id"]: p for p in entries}
    if set(predictions) != {a["id"] for a in annotations}:
        raise ValueError("Annotation and prediction IDs must match exactly")
    rows = []
    for gt in annotations:
        p = predictions[gt["id"]]
        if gt["state"] == "unusable":
            rows.append(score_frame(gt, p, np.zeros((gt["height"], gt["width"]), bool)))
            continue
        mask = read_binary_mask(predictions_path.parent, p["mask"])
        reference = read_binary_mask(Path(annotations_path).parent, gt["reference_mask"]) if gt.get("reference_mask") else None
        rows.append(score_frame(gt, p, mask, reference))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    report = {"schema": "eye-pupil-evaluation-v1", "annotation_source": json.loads(Path(annotations_path).read_text(encoding="utf-8-sig")).get("source", "User-supplied labels, not independently verified"), "scope": "Local labels only; approved predicted masks are not independent accuracy references. Empty/empty absent masks do not inflate foreground IoU.", "approved_prediction_count": sum(gt.get("annotationSource") == "prediction-reviewed" for gt in annotations), "approved_algorithm_count": sum(gt.get("annotationSource") == "algorithm-reviewed" for gt in annotations), "summary": summarize(rows),
              "by_state": {state: summarize([r for r in rows if r["state"] == state]) for state in sorted({r["state"] for r in rows})},
              "by_split": {split: summarize([r for r in rows if r["split"] == split]) for split in sorted({r["split"] for r in rows})},
              "by_condition": {condition: summarize([r for r in rows if r.get("condition", "unspecified") == condition]) for condition in sorted({r.get("condition", "unspecified") for r in rows})},
              "groups": {r["subject"]: r["split"] for r in annotations}, "rows": rows}
    (output / "evaluation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    fields = sorted(set().union(*(r.keys() for r in rows)))
    with (output / "evaluation.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotations", type=Path, required=True)
    parser.add_argument("--predictions", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("output/evaluation"))
    args = parser.parse_args()
    try:
        result = evaluate(args.annotations, args.predictions, args.output)
        print(json.dumps(result["summary"], ensure_ascii=True, indent=2))
    except (ValueError, OSError, KeyError) as error:
        parser.exit(2, str(error) + "\n")
