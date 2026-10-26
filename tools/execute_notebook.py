"""Execute the teaching notebook and retain its real outputs for delivery."""
from pathlib import Path
import nbformat
from nbclient import NotebookClient

root = Path(__file__).resolve().parents[1]
path = root / 'Xu_ly_anh_mat_DIP.ipynb'
notebook = nbformat.read(path, as_version=4)
nbformat.validate(notebook)
NotebookClient(notebook, timeout=180, kernel_name='python3', resources={'metadata': {'path': str(root)}}).execute()
nbformat.validate(notebook)
errors = [output for cell in notebook.cells if cell.cell_type == 'code' for output in cell.outputs if output.output_type == 'error']
if errors:
    raise RuntimeError(f'{len(errors)} notebook cell errors')
nbformat.write(notebook, path)
print(f'PASS: {sum(c.cell_type == "code" for c in notebook.cells)} code cells executed; outputs saved.')
