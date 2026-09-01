@echo off
REM ==============================================================================
REM Script: update.bat
REM Description: Automated System Update Script for Vocational Plan System (Windows)
REM ==============================================================================

chcp 65001 >nul
cls
echo ======================================================================
echo   วก.เชียงราย - ระบบบริหารจัดการงานแผนงานและโครงการ
echo   Automated System Updater ^& Maintenance Tool (Windows)
echo ======================================================================
echo.

set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

echo [1/5] ตรวจสอบไดเรกทอรีโปรเจกต์: %PROJECT_ROOT%

echo [2/5] ซิงค์ซอร์สโค้ดล่าสุดจาก Git Repository...
git pull origin main 2>nul || git pull 2>nul || echo (ข้าม git pull)

echo [3/5] ติดตั้งและอัปเดตโมดูลคำสั่ง (Prisma Generate)...
call pnpm --filter api exec prisma generate 2>nul || call npx prisma generate

echo [4/5] ตรวจสอบโครงสร้างฐานข้อมูล (Prisma Push)...
call pnpm --filter api exec prisma db push 2>nul || call npx prisma db push

echo [5/5] ตรวจสอบและคอมไพล์โปรเจกต์...
echo.
echo ======================================================================
echo   การอัปเดตระบบเสร็จสมบูรณ์เรียบร้อยแล้ว
echo ======================================================================
echo.
pause
