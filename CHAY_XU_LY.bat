@echo off
cd /d "%~dp0"
where uv >nul 2>nul
if errorlevel 1 (
  echo Can cai uv hoac dung Python theo huong dan README.md.
  pause
  exit /b 1
)
uv run --with-requirements requirements.txt python eye_tracking.py
if errorlevel 1 (
  echo Xu ly that bai. Xem thong bao loi phia tren.
  pause
  exit /b 1
)
start "" "%~dp0output\demo.html"
pause
