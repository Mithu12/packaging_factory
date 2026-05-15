FROM node:20-slim

WORKDIR /app

# Install puppeteer system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
# Force devDependencies even when the build platform sets NODE_ENV=production —
# the build needs tsc, tsx, tsc-alias, and the @types/* packages.
RUN npm install --include=dev

COPY . .

RUN npm run build:prod

EXPOSE 5000

CMD ["npm", "start"]
