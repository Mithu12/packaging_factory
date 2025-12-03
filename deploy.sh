#!/bin/bash

# ----------------------------
# Configuration
# ----------------------------
REMOTE_USER="root"
REMOTE_HOST="109.199.118.157"
REMOTE_APP_PATH="/app"
REMOTE_BACKEND_PATH="/app/backend"
REMOTE_FRONTEND_PATH="/app/frontend"
REMOTE_PM2_CONFIG="/app/ecosystem.config.js"

BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# Temporary zip files
BACKEND_ZIP="backend-deploy.zip"
FRONTEND_ZIP="frontend-deploy.zip"

# ----------------------------
# Helper: Log messages
# ----------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ----------------------------
# Check dependencies
# ----------------------------
for cmd in npm scp ssh zip unzip; do
    if ! command -v $cmd &> /dev/null; then
        log "Error: $cmd is not installed."
        exit 1
    fi
done

# ----------------------------
# Build Backend
# ----------------------------
log "Building backend..."
cd "$BACKEND_DIR" || { log "Failed to enter backend directory"; exit 1; }
npm run build:prod || { log "Backend build failed"; exit 1; }
cd ..

# ----------------------------
# Build Frontend
# ----------------------------
log "Building frontend..."
cd "$FRONTEND_DIR" || { log "Failed to enter frontend directory"; exit 1; }
npm run build || { log "Frontend build failed"; exit 1; }
cd ..

# ----------------------------
# Package Backend (dist + package files + migrations)
# ----------------------------
log "Packaging backend for deployment..."
zip -r "$BACKEND_ZIP" \
    "$BACKEND_DIR/dist" \
    "$BACKEND_DIR/package.json" \
    "$BACKEND_DIR/package-lock.json" \
    "$BACKEND_DIR/migrations" \
    || { log "Failed to zip backend"; exit 1; }

# ----------------------------
# Package Frontend (dist + package files + vite config)
# ----------------------------
log "Packaging frontend for deployment..."
zip -r "$FRONTEND_ZIP" \
    "$FRONTEND_DIR/dist" \
    "$FRONTEND_DIR/package.json" \
    "$FRONTEND_DIR/package-lock.json" \
    "$FRONTEND_DIR/vite.config.ts" \
    || { log "Failed to zip frontend"; exit 1; }

# ----------------------------
# Upload Files to Remote Server
# ----------------------------
log "Uploading deployment packages..."
scp "$BACKEND_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/$BACKEND_ZIP" || { log "Upload failed for backend"; exit 1; }
scp "$FRONTEND_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/$FRONTEND_ZIP" || { log "Upload failed for frontend"; exit 1; }
scp "ecosystem.config.js" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PM2_CONFIG" || { log "Upload failed for ecosystem.config.js"; exit 1; }

# ----------------------------
# Clean up local zips
# ----------------------------
rm -f "$BACKEND_ZIP" "$FRONTEND_ZIP"

# ----------------------------
# Remote Commands: Extract, Install Dependencies, and Start PM2
# ----------------------------
log "Setting up application on remote server..."

ssh "$REMOTE_USER@$REMOTE_HOST" bash -s <<EOF
set -e

cd "$REMOTE_APP_PATH"

echo "🛑 Stopping existing PM2 processes..."
pm2 delete "$REMOTE_PM2_CONFIG" 2>/dev/null || echo "No existing PM2 process found."

# Extract backend
echo "📦 Extracting backend..."
if [ -f "$BACKEND_ZIP" ]; then
    unzip -o "$BACKEND_ZIP" -d /tmp/backend-extract
    # Move files to correct location (strip the backend/ prefix)
    cp -r /tmp/backend-extract/$BACKEND_DIR/* "$REMOTE_BACKEND_PATH/"
    rm -rf /tmp/backend-extract
    rm "$BACKEND_ZIP"
    echo "✅ Backend files extracted"
else
    echo "⚠️ $BACKEND_ZIP not found"
fi

# Extract frontend
echo "📦 Extracting frontend..."
if [ -f "$FRONTEND_ZIP" ]; then
    unzip -o "$FRONTEND_ZIP" -d /tmp/frontend-extract
    # Move files to correct location (strip the frontend/ prefix)
    cp -r /tmp/frontend-extract/$FRONTEND_DIR/* "$REMOTE_FRONTEND_PATH/"
    rm -rf /tmp/frontend-extract
    rm "$FRONTEND_ZIP"
    echo "✅ Frontend files extracted"
else
    echo "⚠️ $FRONTEND_ZIP not found"
fi

# Install backend dependencies
echo "📥 Installing backend dependencies..."
cd "$REMOTE_BACKEND_PATH"
npm ci --omit=dev || npm install --omit=dev
echo "✅ Backend dependencies installed"

# Install frontend dependencies
echo "📥 Installing frontend dependencies..."
cd "$REMOTE_FRONTEND_PATH"
npm ci --omit=dev || npm install --omit=dev
echo "✅ Frontend dependencies installed"

# Create logs directory if it doesn't exist
mkdir -p "$REMOTE_APP_PATH/logs"

# Start PM2
echo "🚀 Starting PM2 processes..."
cd "$REMOTE_APP_PATH"
pm2 start "$REMOTE_PM2_CONFIG"
pm2 save

echo "✅ Deployment completed successfully on remote server."
EOF

log "🎉 Deployment completed successfully!"
