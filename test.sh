#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting E2E Test Workflow..."

# Cleanup function to kill background processes on exit
cleanup() {
    echo "🧹 Cleaning up background processes..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# 1. Setup Test Database
echo "📦 Setting up Test Database (erp_test)..."
cd e2e_testing
npx tsx scripts/test-db-setup.ts
cd ..

# 2. Start Backend in Background
echo "🔌 Starting Backend (Port 3002)..."
cd backend
# Manual command construction to avoid polluting package.json
# We use cross-env from backend's deps or just set env vars inline (linux)
NODE_ENV=test PORT=3002 DB_NAME=erp_test npx tsx src/index.ts &
BACKEND_PID=$!
cd ..

# 3. Start Frontend in Background
echo "🖥️ Starting Frontend (Port 3003)..."
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:3002/api PORT=3003 npm run dev &
FRONTEND_PID=$!
cd ..

# 4. Wait for services to be ready
echo "⏳ Waiting for services to start..."
MAX_RETRIES=30
count=0
echo "Waiting for Backend..."
until curl -s http://localhost:3002/health > /dev/null; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $MAX_RETRIES ]; then
        echo "❌ Backend failed to start within $MAX_RETRIES seconds"
        exit 1
    fi
done
echo "✅ Backend is ready!"

echo "Waiting for Frontend to compile..."
sleep 5 

# 5. Run Playwright Tests
echo "🎭 Running Playwright Tests..."
cd e2e_testing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing E2E dependencies..."
    npm install
fi

BASE_URL=http://localhost:3003 npx playwright test

echo "✅ E2E Tests Completed Successfully!"
