# ✅ Stable LTS Node (recommended)
FROM node:20-bullseye-slim

# ✅ Install Chromium + required libraries for Puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libglib2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-6 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxrender1 \
  libxshmfence1 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# ✅ App directory
WORKDIR /app

# ✅ Install dependencies first (better Docker caching)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# ✅ Copy project
COPY . .

# ✅ Puppeteer: don't download bundled chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# ✅ This is the chromium binary we installed above
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ✅ Optional: good for production
ENV NODE_ENV=production

# ✅ Expose the port your Express server uses
# (change if you run on 5000 etc.)
EXPOSE 3000

# ✅ Start your server
CMD ["npm", "start"]
