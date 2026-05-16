@echo off
cd /d "%~dp0"
echo ============================================
echo  Reiniciando ambiente de dev do Idemaq
echo  Pasta: %CD%
echo ============================================
echo.
echo [1/3] Matando servidores Node antigos...
taskkill /F /IM node.exe 2>nul
if errorlevel 1 (
  echo      Nada para matar - ok.
) else (
  echo      Servidores antigos finalizados.
)
echo.

echo [2/3] Limpando cache do Vite...
if exist node_modules\.vite (
  rmdir /s /q node_modules\.vite
  echo      Cache apagado.
) else (
  echo      Nao havia cache - ok.
)
echo.

echo [3/3] Subindo o servidor de dev...
echo.
echo ============================================
echo  Aguarde aparecer: Local: http://localhost:5173/
echo  Depois abra esse endereco no navegador.
echo  Para parar o servidor: feche essa janela ou Ctrl+C
echo ============================================
echo.
call npm.cmd run dev
pause
