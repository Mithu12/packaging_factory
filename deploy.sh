#!/bin/bash

# ----------------------------
# Configuration
# ----------------------------
REMOTE_USER="root"
REMOTE_HOST="128.199.200.234"
REMOTE_BACKEND_PATH="/home/erp/erp-system/backend"
REMOTE_FRONTEND_PATH="/home/erp/erp-system/frontend"
REMOTE_PM2_CONFIG="/home/erp/erp-system/ecosystem.config.js"

BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

BACKEND_ZIP="backend/dist.zip"
FRONTEND_ZIP="frontend/dist.zip"

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

# Zip backend dist contents only
log "Zipping backend dist..."
cd dist || { log "Backend dist folder missing"; exit 1; }
zip -r "../../$BACKEND_ZIP" . || { log "Failed to zip backend"; exit 1; }
cd ../../

# ----------------------------
# Build Frontend
# ----------------------------
log "Building frontend..."
cd "$FRONTEND_DIR" || { log "Failed to enter frontend directory"; exit 1; }
npm run build || { log "Frontend build failed"; exit 1; }

# Zip frontend dist contents only
log "Zipping frontend dist..."
cd dist || { log "Frontend dist folder missing"; exit 1; }
zip -r "../../$FRONTEND_ZIP" . || { log "Failed to zip frontend"; exit 1; }
cd ../../

# ----------------------------
# Upload Files to Remote Server
# ----------------------------
log "Uploading backend and frontend zip files..."
scp "$BACKEND_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_BACKEND_PATH/dist.zip" || { log "Upload failed for backend"; exit 1; }
scp "$FRONTEND_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_FRONTEND_PATH/dist.zip" || { log "Upload failed for frontend"; exit 1; }

# ----------------------------
# Clean up local zips
# ----------------------------
rm -f "$BACKEND_ZIP" "$FRONTEND_ZIP"

# ----------------------------
# Remote Commands: Extract + Restart PM2
# ----------------------------
log "Extracting and restarting PM2 on remote server..."

ssh "$REMOTE_USER@$REMOTE_HOST" bash -s <<EOF
set -e

cleanup_directory() {
    local dir="\$1"
    cd "\$dir" || return
    if [ -f "dist.zip" ]; then
        rm -rf dist
        unzip dist.zip -d dist
        rm dist.zip
        echo "✅ Extracted dist in \$dir"
    else
        echo "⚠️ dist.zip not found in \$dir"
    fi
    cd ..
}

echo "🛑 Stopping existing PM2 processes..."
pm2 delete "$REMOTE_PM2_CONFIG" || echo "No existing PM2 process found."

cleanup_directory "$REMOTE_BACKEND_PATH"
cleanup_directory "$REMOTE_FRONTEND_PATH"

echo "🚀 Starting PM2 processes..."
pm2 start "$REMOTE_PM2_CONFIG" || echo "PM2 start failed."

echo "✅ Deployment completed successfully on remote server."
EOF

log "🎉 Deployment completed successfully!"
