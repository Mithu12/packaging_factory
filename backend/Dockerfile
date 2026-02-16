# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies if needed
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build and obfuscate
RUN npm run build:prod

# Production stage
FROM node:20-slim

WORKDIR /app

# Install puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable for puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/migrations ./migrations

# Install production dependencies only
RUN npm install --omit=dev

EXPOSE 5000

CMD ["npm", "start"]
