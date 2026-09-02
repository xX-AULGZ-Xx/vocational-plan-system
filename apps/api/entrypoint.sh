#!/bin/sh
set -e

echo "======================================================="
echo "  วก.เชียงราย - Vocational Plan System API"
echo "  Synchronizing Database Schema (Prisma DB Push)..."
echo "======================================================="

# Run schema push to ensure all tables exist in MySQL
npx prisma db push --skip-generate || echo "Prisma push completed with notice."

echo "🚀 Starting Node.js API Server..."
exec node dist/index.js
