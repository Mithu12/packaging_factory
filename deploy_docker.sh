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
# ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_APP_PATH/images"

log "Transferring erp-backend image..."
docker save -o erp-backend.tar erp-backend
scp -P 2244 erp-backend.tar "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/images/erp-backend.tar"
ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "docker load -i $REMOTE_APP_PATH/images/erp-backend.tar && rm $REMOTE_APP_PATH/images/erp-backend.tar"
rm erp-backend.tar

log "Transferring erp-frontend image..."
docker save -o erp-frontend.tar erp-frontend
scp -P 2244 erp-frontend.tar "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/images/erp-frontend.tar"
ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "docker load -i $REMOTE_APP_PATH/images/erp-frontend.tar && rm $REMOTE_APP_PATH/images/erp-frontend.tar"
rm erp-frontend.tar

# 3. Transfer docker-compose-prod.yml
# log "Transferring configuration files..."
# scp -P 2244 docker-compose-prod.yml "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_PATH/docker-compose.yml"

# # 4. Run on Remote Server
# log "Starting containers on remote server..."
# ssh -p 2244 "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_APP_PATH && docker compose -f docker-compose.yml up -d"

log "✅ ERP System Deployment completed successfully!"
