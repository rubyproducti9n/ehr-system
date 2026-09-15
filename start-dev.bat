@echo off
title EHR Platform - Development Server
cd /d "%~dp0"
echo Starting EHR Platform development server on http://localhost:3000 ...
npm run dev
pause
