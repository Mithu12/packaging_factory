FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Force devDependencies even when the build platform sets NODE_ENV=production —
# Next.js build needs typescript, tailwindcss, postcss, eslint, and @types/*.
RUN npm install --include=dev

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

EXPOSE 3001

CMD ["npm", "start"]
