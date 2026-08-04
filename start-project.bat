@echo off
title CreatorLens Full-Stack Runner
echo ===================================================
echo   Starting CreatorLens Full-Stack Application
echo ===================================================

echo.
echo [1/2] Starting Backend REST API Server (Port 5000)...
start "CreatorLens Backend Server" cmd /k "cd server && npm start"

echo.
echo [2/2] Starting Frontend HTTP Server (Port 3000)...
start "CreatorLens Frontend Server" cmd /k "npm run dev"

echo.
echo ===================================================
echo   Both servers are starting in separate windows!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:5000/api
echo ===================================================
echo.
pause
