import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"tools"))
from evaluate_pupil import read_annotations, score_frame, summarize, overlap, ellipse_mask


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
