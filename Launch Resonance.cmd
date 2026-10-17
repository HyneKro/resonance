@echo off
cd /d "%~dp0"
if exist "desktop-build\Resonance-win32-x64\Resonance.exe.icon-update" (
  copy /y "desktop-build\Resonance-win32-x64\Resonance.exe.icon-update" "desktop-build\Resonance-win32-x64\Resonance.exe" >nul 2>&1
  if not errorlevel 1 del "desktop-build\Resonance-win32-x64\Resonance.exe.icon-update"
)
if exist "desktop-build\Resonance-win32-x64\Resonance.exe" (
  start "" "desktop-build\Resonance-win32-x64\Resonance.exe"
) else (
  start "" "node_modules\electron\dist\electron.exe" .
)
