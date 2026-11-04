@echo off
chcp 65001 >nul
title VORA Restaurant KDS - Staff Console & Ngrok Tunnel
cd /d "%~dp0"

echo ======================================================================
echo    🍽️  VORA RESTAURANT - KHỞI ĐỘNG HỆ THỐNG PHỤC VỤ (STAFF KDS)
echo ======================================================================
echo [*] Đang khởi chạy máy chủ giao diện và tự động tạo đường hầm Ngrok...
echo [*] Link công khai và mã QR quét cho điện thoại sẽ xuất hiện bên dưới.
echo ======================================================================
echo.

npm run dev

pause

