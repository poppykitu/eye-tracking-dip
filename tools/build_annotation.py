"""Build an offline annotation page, reusing the exact live DIP functions."""
import re


def function_source(source, name):
    declarations = list(re.finditer(r'^function (\w+)\(', source, re.M))
    for index, match in enumerate(declarations):
        if match.group(1) == name:
            end = declarations[index + 1].start() if index + 1 < len(declarations) else len(source)
            return source[match.start():end]
    raise ValueError('Missing algorithm function: ' + name)


def render_annotation(root):
    webcam = (root / 'webcam.js').read_text(encoding='utf-8')
    glasses = (root / 'glasses.js').read_text(encoding='utf-8')
    names = ['hist', 'quantile', 'median3', 'gaussian3', 'gaussianPreThreshold',
             'morph3', 'otsu', 'applyEyeTone', 'enhanceLiveContrast', 'findLivePupil', 'computeVideoFrame']
    worker = (root / 'ellipse_geometry.js').read_text(encoding='utf-8') + '\n'
    worker += '\n'.join(function_source(webcam, name) for name in names)
    worker += '\n' + '\n'.join(function_source(glasses, name) for name in
                              ['glassesPhotometricContrast', 'assessPupilFrame', 'detectGlassesPupil'])
    template = (root / 'annotation_tool.html').read_text(encoding='utf-8')
    for marker, source in {
        '__DATASET_COMMON__': (root / 'dataset_common.js').read_text(encoding='utf-8'),
        '__ANNOTATION_EDITOR__': (root / 'annotation_editor.js').read_text(encoding='utf-8'),
        '__ANNOTATION_ALGORITHM__': (root / 'annotation_algorithm.js').read_text(encoding='utf-8'),
        '__ANNOTATION_ALGORITHM_SOURCE__': worker,
    }.items():
        template = template.replace(marker, source)
    return template
