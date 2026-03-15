#!/bin/bash

# ----------------------------
# Configuration
# ----------------------------
REMOTE_USER="root"
REMOTE_HOST="5.189.152.216"
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
# Parse Arguments
# ----------------------------
DEPLOY_TARGET="${1:-all}"

show_usage() {
    echo "Usage: $0 [target]"
    echo ""
    echo "Targets:"
    echo "  all       Deploy both backend and frontend (default)"
    echo "  backend   Deploy only backend"
    echo "  frontend  Deploy only frontend"
    echo ""
    echo "Examples:"
    echo "  $0           # Deploy everything"
    echo "  $0 all       # Deploy everything"
    echo "  $0 backend   # Deploy only backend"
    echo "  $0 frontend  # Deploy only frontend"
    exit 1
}

case "$DEPLOY_TARGET" in
    all|backend|frontend) ;;
    -h|--help) show_usage ;;
    *) echo "Error: Invalid target '$DEPLOY_TARGET'"; show_usage ;;
esac

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

log "🚀 Deployment target: $DEPLOY_TARGET"

# ----------------------------
# Build & Package Backend
# ----------------------------
build_backend() {
    log "Building backend..."
    cd "$BACKEND_DIR" || { log "Failed to enter backend directory"; exit 1; }
    npm run build:prod || { log "Backend build failed"; exit 1; }
    cd ..

    log "Packaging backend for deployment..."
    zip -r "$BACKEND_ZIP" \
        "$BACKEND_DIR/dist" \
        "$BACKEND_DIR/package.json" \
        "$BACKEND_DIR/package-lock.json" \
        "$BACKEND_DIR/migrations" \
        || { log "Failed to zip backend"; exit 1; }
}

# ----------------------------
# Build & Package Frontend
# ----------------------------
build_frontend() {
    log "Building frontend..."
    cd "$FRONTEND_DIR" || { log "Failed to enter frontend directory"; exit 1; }
    npm run build || { log "Frontend build failed"; exit 1; }
    cd ..

    log "Packaging frontend for deployment..."
    zip -r "$FRONTEND_ZIP" \
        "$FRONTEND_DIR/.next" \
        "$FRONTEND_DIR/package.json" \
        "$FRONTEND_DIR/package-lock.json" \
        "$FRONTEND_DIR/next.config.js" \
        || { log "Failed to zip frontend"; exit 1; }
}

# ----------------------------
# Execute Builds Based on Target
# ----------------------------
if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "backend" ]]; then
    build_backend
fi

if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "frontend" ]]; then
    build_frontend
fi

# ----------------------------
# Upload Files to Remote Server
# ----------------------------
log "Uploading deployment packages..."

if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "backend" ]]; then
    scp "$BACKEND_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/$BACKEND_ZIP" || { log "Upload failed for backend"; exit 1; }
fi

if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "frontend" ]]; then
    scp "$FRONTEND_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/$FRONTEND_ZIP" || { log "Upload failed for frontend"; exit 1; }
fi

scp "ecosystem.config.js" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PM2_CONFIG" || { log "Upload failed for ecosystem.config.js"; exit 1; }

# ----------------------------
# Clean up local zips
# ----------------------------
rm -f "$BACKEND_ZIP" "$FRONTEND_ZIP"

# ----------------------------
# Remote Commands: Extract, Install Dependencies, and Restart PM2
# ----------------------------
log "Setting up application on remote server..."

ssh "$REMOTE_USER@$REMOTE_HOST" bash -s -- "$DEPLOY_TARGET" <<'EOF'
set -e

DEPLOY_TARGET="$1"
REMOTE_APP_PATH="/app"
REMOTE_BACKEND_PATH="/app/backend"
REMOTE_FRONTEND_PATH="/app/frontend"
REMOTE_PM2_CONFIG="/app/ecosystem.config.js"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_ZIP="backend-deploy.zip"
FRONTEND_ZIP="frontend-deploy.zip"

cd "$REMOTE_APP_PATH"

# Stop PM2 processes
if [[ "$DEPLOY_TARGET" == "all" ]]; then
    echo "🛑 Stopping all PM2 processes..."
    pm2 delete "$REMOTE_PM2_CONFIG" 2>/dev/null || echo "No existing PM2 process found."
elif [[ "$DEPLOY_TARGET" == "backend" ]]; then
    echo "🛑 Stopping backend PM2 process..."
    pm2 delete erp-backend 2>/dev/null || echo "No existing backend process found."
elif [[ "$DEPLOY_TARGET" == "frontend" ]]; then
    echo "🛑 Stopping frontend PM2 process..."
    pm2 delete erp-frontend 2>/dev/null || echo "No existing frontend process found."
fi

# Extract and install backend
if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "backend" ]]; then
    echo "📦 Extracting backend..."
    if [ -f "$BACKEND_ZIP" ]; then
        unzip -o "$BACKEND_ZIP" -d /tmp/backend-extract
        cp -r /tmp/backend-extract/$BACKEND_DIR/* "$REMOTE_BACKEND_PATH/"
        rm -rf /tmp/backend-extract
        rm "$BACKEND_ZIP"
        echo "✅ Backend files extracted"

        echo "📥 Installing backend dependencies..."
        cd "$REMOTE_BACKEND_PATH"
        npm ci || npm install
        echo "✅ Backend dependencies installed"
    else
        echo "⚠️ $BACKEND_ZIP not found"
    fi
fi

# Extract and install frontend
if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "frontend" ]]; then
    echo "📦 Extracting frontend..."
    if [ -f "$FRONTEND_ZIP" ]; then
        unzip -o "$FRONTEND_ZIP" -d /tmp/frontend-extract
        cp -r /tmp/frontend-extract/$FRONTEND_DIR/* "$REMOTE_FRONTEND_PATH/"
        cp -r /tmp/frontend-extract/$FRONTEND_DIR/.next "$REMOTE_FRONTEND_PATH/"    
        rm -rf /tmp/frontend-extract
        rm "$FRONTEND_ZIP"
        echo "✅ Frontend files extracted"

        echo "📥 Installing frontend dependencies..."
        cd "$REMOTE_FRONTEND_PATH"
        npm ci || npm install
        echo "✅ Frontend dependencies installed"
    else
        echo "⚠️ $FRONTEND_ZIP not found"
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p "$REMOTE_APP_PATH/logs"

# Start/Restart PM2 processes
cd "$REMOTE_APP_PATH"
if [[ "$DEPLOY_TARGET" == "all" ]]; then
    echo "🚀 Starting all PM2 processes..."
    pm2 start "$REMOTE_PM2_CONFIG"
elif [[ "$DEPLOY_TARGET" == "backend" ]]; then
    echo "🚀 Starting backend PM2 process..."
    pm2 start "$REMOTE_PM2_CONFIG" --only erp-backend
elif [[ "$DEPLOY_TARGET" == "frontend" ]]; then
    echo "🚀 Starting frontend PM2 process..."
    pm2 start "$REMOTE_PM2_CONFIG" --only erp-frontend
fi
pm2 save

echo "✅ Deployment completed successfully on remote server."
EOF

log "🎉 Deployment of '$DEPLOY_TARGET' completed successfully!"
