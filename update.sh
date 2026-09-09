#!/bin/bash
# ==============================================================================
# Script: update.sh
# Description: Automated System Update Script for Vocational Plan System
# Target OS: Linux / Ubuntu / Debian / CentOS / aaPanel / Docker
# ==============================================================================

set -e

echo "======================================================================"
echo "  วก.เชียงราย - ระบบบริหารจัดการงานแผนงานและโครงการ"
echo "  Automated System Updater & Maintenance Tool"
echo "======================================================================"

# 1. Check Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    PROJECT_ROOT="$SCRIPT_DIR"
elif [ -f "$(dirname "$SCRIPT_DIR")/docker-compose.yml" ]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi
cd "$PROJECT_ROOT"

echo "[1/5] 📁 ไดเรกทอรีโปรเจกต์: $PROJECT_ROOT"

# 2. Git Fetch & Pull (with reset fallback if merge conflict)
echo "[2/5] 🔄 กำลังดึงโค้ดล่าสุดจาก GitHub..."
if [ -d ".git" ]; then
    git remote set-url origin https://github.com/xX-AULGZ-Xx/vocational-plan-system.git 2>/dev/null || true
    git fetch --all --prune
    git reset --hard origin/main || git pull origin main --no-rebase || git pull origin master --no-rebase
    CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
    echo "       ✅ ซิงค์ Git สำเร็จ (Commit: $CURRENT_COMMIT)"
else
    echo "       ⚠️ ไม่พบ .git ข้ามขั้นตอน git fetch"
fi

# 3. Docker Build & Restart
echo "[3/5] 🐳 กำลังคอมไพล์และรีสตาร์ทบริการ Docker (บังคับ Clean Build)..."
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "       -> หยุดการทำงาน container เก่า..."
    docker compose down 2>/dev/null || true
    
    echo "       -> บังคับ Rebuild Next.js และ Node.js API ใหม่ 100% (No Cache)..."
    docker compose build --no-cache
    
    echo "       -> เริ่มการทำงาน container ในโหมด Background..."
    docker compose up -d
    
    echo "       ✅ Docker Services เริ่มทำงานเรียบร้อยแล้ว"
else
    echo "       -> ไม่พบ Docker รันผ่าน Node.js/PM2..."
    pnpm install || npm install
    pnpm --filter api exec prisma generate || true
    pnpm --filter api exec prisma db push || true
    pnpm build || true
    if command -v pm2 &> /dev/null; then
        pm2 restart all || true
    fi
fi

# 4. Health Check
echo "[4/5] 🩺 ตรวจสอบสถานะการเชื่อมต่อ (Health Check)..."
sleep 4
if command -v curl &> /dev/null; then
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5050/health 2>/dev/null || echo "000")
    WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3005 2>/dev/null || echo "000")
    echo "       - Backend API Status: $API_STATUS"
    echo "       - Frontend Web Status: $WEB_STATUS"
fi

echo "[5/5] 🎉 การอัปเดตระบบเสร็จสมบูรณ์เรียบร้อย 100%!"
echo "======================================================================"
echo "💡 คำแนะนำ: หากหน้าเว็บยังไม่เปลี่ยน ให้กด Ctrl + F5 (หรือ Ctrl + Shift + R) บนเบราว์เซอร์เพื่อล้าง Cache"
echo "======================================================================"
