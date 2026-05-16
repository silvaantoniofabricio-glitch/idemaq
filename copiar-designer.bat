@echo off
cd /d "%~dp0"
echo ============================================
echo  Copiando entrega do Designer para src/
echo  Pasta: %CD%
echo ============================================
echo.
echo Origem:  idemaq-src\
echo Destino: src\
echo.
echo Os seguintes arquivos serao PRESERVADOS:
echo   - src\supabase.js
echo   - src\hooks\useOS.js
echo   - src\hooks\useUsuarios.js
echo   - src\assets\*
echo.
echo Pressione qualquer tecla para iniciar a copia...
pause >nul
echo.

xcopy "idemaq-src\*" "src\" /E /Y /I

echo.
echo ============================================
echo  Copia concluida!
echo  Agora rode reiniciar-dev.bat para subir o servidor.
echo ============================================
pause
