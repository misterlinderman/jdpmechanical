# FPB Tracker API — Chromium is required for Puppeteer to render Avery 5160 sticker PDFs.
# Frontend is deployed separately (e.g. Vercel); this image is API-only.

FROM node:20-bookworm-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/ ./
RUN npm run build

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
