#!/bin/bash

# Configuration
REMOTE_USER="deploy"
REMOTE_HOST="62.84.176.38" # From existing deploy.sh
REMOTE_APP_PATH="/app/erp"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

set -e

log "🚀 Starting Docker Deployment for ERP System"

# 1. Build Images locally
log "Building ERP images..."
docker compose build

# 2. Transfer Images to Remote Server
log "Transferring erp-backend image..."
docker save erp-backend | ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "docker load"

log "Transferring erp-frontend image..."
docker save erp-frontend | ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "docker load"

# 3. Transfer docker-compose-prod.yml
log "Transferring configuration files..."
scp -p 2244 docker-compose-prod.yml "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/docker-compose.yml"

# 4. Run on Remote Server
log "Starting containers on remote server..."
ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_APP_PATH && docker compose -f docker-compose.yml up -d"

log "✅ ERP System Deployment completed successfully!"
