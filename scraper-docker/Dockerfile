# STV Chapter Scraper — Playwright + xvfb
FROM node:20-slim

# Install xvfb and Playwright/Chromium system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    fonts-noto-cjk \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package.json ./
RUN npm install --production

# Install Playwright Chromium browser
RUN npx playwright install chromium

COPY server.js entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Entrypoint adds /etc/hosts entry and starts xvfb + node
ENTRYPOINT ["./entrypoint.sh"]
