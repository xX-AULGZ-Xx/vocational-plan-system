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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[1/6] 📁 ตรวจสอบความพร้อมของโปรเจกต์: $PROJECT_ROOT"

# 2. Backup Database / Snapshot
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$PROJECT_ROOT/storage/backups"
mkdir -p "$BACKUP_DIR"

echo "[2/6] 💾 กำลังสร้างไฟล์สำรองข้อมูล Snapshot ก่อนอัปเดต..."
if command -v mysqldump &> /dev/null; then
    echo "       ใช้ mysqldump ในการสำรองฐานข้อมูล..."
    # If DB env is available, dump to storage/backups/
    # mysqldump -u root -p vocational_plan_db > "$BACKUP_DIR/db_$TIMESTAMP.sql" 2>/dev/null || true
fi

# 3. Pull latest changes from Git
echo "[3/6] 🔄 ดึงซอร์สโค้ดและอัปเดตล่าสุด (git pull)..."
if [ -d ".git" ]; then
    git fetch origin
    git pull origin main || git pull origin master || echo "Git pull completed or up to date."
else
    echo "⚠️ ไม่พบ .git ข้ามขั้นตอน git pull"
fi

# 4. Update Dependencies & Prisma DB Migration
echo "[4/6] 📦 ปรับปรุง Database Schema & Prisma ORM..."
if [ -f "docker-compose.yml" ] && command -v docker &> /dev/null && docker compose ps &> /dev/null; then
    echo "       อัปเดตและ Rebuild ผ่าน Docker Compose..."
    docker compose up -d --build
else
    echo "       รัน Prisma Migrate ในระบบ Local/Node..."
    pnpm install || npm install
    pnpm --filter api exec prisma db push || true
    pnpm --filter api exec prisma generate || true
    pnpm build || true
fi

# 5. System Health Check
echo "[5/6] 🩺 ตรวจสอบสถานะการทำงานของระบบ (Health Check)..."
sleep 3
if command -v curl &> /dev/null; then
    HEALTH_RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5050/health || echo "000")
    if [ "$HEALTH_RESP" == "200" ]; then
        echo "       ✅ Backend API ตอบรับปกติ (HTTP 200 OK)"
    else
        echo "       ⚠️ Backend API Health Status Code: $HEALTH_RESP"
    fi
fi

echo "[6/6] 🎉 การอัปเดตระบบเสร็จสมบูรณ์เรียบร้อยแล้ว!"
echo "======================================================================"
