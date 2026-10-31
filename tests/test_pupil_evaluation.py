import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"tools"))
from evaluate_pupil import read_annotations, score_frame, summarize, overlap, ellipse_mask, decode_mask_rle


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.gt=dict(id="one", file="one.png", width=20,height=20,subject="person1",session="session1",split="test",state="visible",polygon=[[5,5],[14,5],[14,14],[5,14]],ellipse=None)
        self.pred=dict(id="one", processedWidth=20,processedHeight=20,ellipse=dict(cx=9.5,cy=9.5,rx=5,ry=5,angle=0))
        self.mask=np.zeros((20,20),bool);self.mask[5:15,5:15]=True
    def test_perfect_visible_mask(self):
        r=score_frame(self.gt,self.pred,self.mask)
        self.assertEqual(r["visible_iou"],1);self.assertEqual(r["visible_dice"],1)
    def test_shifted_mask(self):
        r=score_frame(self.gt,self.pred,np.roll(self.mask,2,axis=1))
        self.assertAlmostEqual(r["visible_iou"],80/120);self.assertAlmostEqual(r["visible_dice"],.8)
    def test_empty_absent_does_not_inflate_positive_iou(self):
        miss=score_frame(self.gt,{**self.pred,"ellipse":None},np.zeros_like(self.mask))
        absent=score_frame({**self.gt,"state":"absent","polygon":[]},{**self.pred,"ellipse":None},np.zeros_like(self.mask))
        report=summarize([miss,absent]);self.assertEqual(report["mean_visible_iou_positive_frames"],0);self.assertEqual(report["miss_rate"],1);self.assertEqual(report["false_positive_rate_absent"],0)
    def test_occluded_has_no_center_without_full_ellipse_label(self):
        r=score_frame({**self.gt,"state":"occluded"},self.pred,self.mask);self.assertIsNone(r["center_error_px"])
    def test_missing_detection_center_is_not_zero_error(self):
        r=score_frame({**self.gt,"ellipse":self.pred["ellipse"]},{**self.pred,"ellipse":None},np.zeros_like(self.mask));self.assertIsNone(r["center_error_px"]);self.assertEqual(r["outcome"],"FN")
    def test_dimension_mismatch(self):
        with self.assertRaises(ValueError):score_frame(self.gt,self.pred,np.zeros((10,10),bool))
    def test_exported_reference_mask_used_exactly(self):
        reference = self.mask.copy()
        reference[5, 5] = False
        row = score_frame(self.gt, self.pred, reference, reference)
        self.assertEqual(row['visible_iou'], 1)
        self.assertEqual(row['visible_dice'], 1)
    def test_absent_reference_cannot_contain_foreground(self):
        with self.assertRaisesRegex(ValueError, 'Absent reference'):
            score_frame({**self.gt, 'state': 'absent', 'polygon': []},
                        self.pred, self.mask, self.mask)
    def test_unreviewed_capture_is_not_ground_truth(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'labels.json'
            f.write_text(json.dumps(dict(schema='eye-pupil-annotations-v1', images=[{**self.gt, 'reviewed': False}])))
            with self.assertRaisesRegex(ValueError, 'Unreviewed'):
                read_annotations(f)
    def test_binary_rle_exact_pixels_and_invalid_length(self):
        self.assertEqual(decode_mask_rle([2, 3, 1], 3, 2).tolist(), [[0, 0, 1], [1, 1, 0]])
        with self.assertRaises(ValueError):
            decode_mask_rle([2, 3], 3, 2)
    def test_approved_mask_without_polygon_is_evaluated(self):
        row = {**self.gt, 'polygon': [], 'reviewed': True,
               'annotationSource': 'prediction-reviewed',
               'mask_rle': [105] + [10, 10] * 9 + [10, 105]}
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'labels.json'
            f.write_text(json.dumps(dict(schema='eye-pupil-annotations-v1', images=[row])))
            read_annotations(f)
        result = score_frame(row, self.pred, self.mask)
        self.assertEqual(result['visible_iou'], 1)
        self.assertEqual(result['annotation_source'], 'prediction-reviewed')
        self.assertIsNone(result['center_error_px'])
    def test_ellipse_label_does_not_require_segmentation_mask(self):
        gt = {**self.gt, 'labelType': 'ellipse', 'polygon': [], 'ellipse': self.pred['ellipse']}
        row = score_frame(gt, self.pred, None)
        self.assertEqual(row['ellipse_iou'], 1)
        self.assertEqual(row['center_error_px'], 0)
        self.assertIsNone(row['visible_iou'])
    def test_ellipse_misses_are_zero_iou_not_zero_center_error(self):
        gt = {**self.gt, 'labelType': 'ellipse', 'polygon': [], 'ellipse': self.pred['ellipse']}
        row = score_frame(gt, {**self.pred, 'ellipse': None}, None)
        self.assertEqual(summarize([row])['mean_ellipse_iou_positive_frames'], 0)
        self.assertIsNone(row['center_error_px'])
        self.assertIsNone(summarize([row])['mean_visible_iou_positive_frames'])
    def test_ellipse_json_without_polygon_is_readable(self):
        gt = {**self.gt, 'labelType': 'ellipse', 'ellipse': self.pred['ellipse'], 'reviewed': True}
        del gt['polygon']
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'labels.json'
            f.write_text(json.dumps(dict(schema='eye-pupil-annotations-v1', images=[gt])))
            self.assertEqual(read_annotations(f)[0]['ellipse'], self.pred['ellipse'])
    def test_false_positive_absent(self):
        r=score_frame({**self.gt,"state":"absent","polygon":[]},self.pred,self.mask);self.assertEqual(r["outcome"],"FP");self.assertEqual(summarize([r])["false_positive_rate_absent"],1)
    def test_unusable_not_scored(self):
        self.assertEqual(summarize([score_frame({**self.gt,"state":"unusable"},self.pred,self.mask)])["evaluated"],0)
    def test_subject_split_leakage(self):
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'labels.json';f.write_text(json.dumps(dict(schema="eye-pupil-annotations-v1",images=[self.gt,{**self.gt,"id":"two","split":"tune"}])))
            with self.assertRaisesRegex(ValueError,"leakage"):read_annotations(f)
    def test_ellipse_coordinate_scaling(self):
        e=dict(cx=9.5,cy=9.5,rx=5,ry=3,angle=.4)
        self.assertGreater(ellipse_mask(e,40,40,20,20).sum(),ellipse_mask(e,20,20).sum()*3.5)


if __name__=='__main__':unittest.main()
