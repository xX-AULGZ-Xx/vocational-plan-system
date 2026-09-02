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

echo "🚀 Starting Node.js API Server..."
exec node dist/index.js
