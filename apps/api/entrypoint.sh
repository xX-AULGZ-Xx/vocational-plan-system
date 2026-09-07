#!/bin/sh
set -e

echo "======================================================="
echo "  วก.เชียงราย - Vocational Plan System API"
echo "  Synchronizing Database Schema (Prisma DB Push)..."
echo "======================================================="

# Fallback DATABASE_URL if empty or missing
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="mysql://plan_user:plan_password@mysql:3306/vocational_plan_db"
fi

# Run schema push to ensure all tables exist in MySQL
npx prisma db push --skip-generate --accept-data-loss || echo "Prisma push completed with notice."

# Ensure storage directories exist with full permissions
mkdir -p /app/apps/api/storage/templates /app/apps/api/storage/exports /app/apps/api/storage/logos /app/apps/api/storage/uploads || true
chmod -R 777 /app/apps/api/storage 2>/dev/null || true

echo "🚀 Starting Node.js API Server..."
exec node dist/index.js
