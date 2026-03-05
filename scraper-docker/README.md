# STV Chapter Scraper (Docker)

Standalone chapter scraper for SangTacViet using Playwright headed Chromium.

## How it works

1. Express server receives `GET /api/sangtacviet?action=chapter&host=X&bookid=Y&chapterId=Z`
2. Playwright opens the STV chapter page through real Cloudflare
3. Creates manual XHR inside the browser context to fetch chapter JSON
4. Handles Code 7 retries automatically
5. Returns chapter content as JSON

## Deploy to Railway

1. **Create a Railway project**: https://railway.app/new
2. **Connect this directory** as a new service (or use Docker deploy)
3. Railway auto-detects the Dockerfile and builds
4. **Copy the Railway public URL** (e.g., `https://stv-scraper-production.up.railway.app`)
5. **Set CF Worker env var**: `STV_CHAPTER_API=https://stv-scraper-production.up.railway.app`

## Local testing

```bash
# Build
docker build -t stv-scraper .

# Run (--add-host adds the DNS override)
docker run -p 8080:8080 --add-host=sangtacviet.vip:104.21.0.1 stv-scraper

# Test
curl "http://localhost:8080/api/sangtacviet?action=chapter&host=dich&bookid=43165&chapterId=1"
```

## Files

- `server.js` — Express + Playwright chapter fetcher
- `Dockerfile` — node:20-slim + xvfb + Playwright Chromium
- `entrypoint.sh` — Runtime /etc/hosts + xvfb startup
- `railway.json` — Railway deployment config
