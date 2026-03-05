const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// ── Browser singleton ──
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.isConnected()) {
        console.log('[Browser] Launching Chromium (headed via xvfb)...');
        browserInstance = await chromium.launch({
            headless: false,  // headed mode needed to bypass STV anti-bot
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
            ],
        });
        console.log('[Browser] Chromium launched.');
    }
    return browserInstance;
}

// ── Chapter Fetcher ──
async function fetchChapter(host, bookid, chapterId) {
    const browser = await getBrowser();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const exts = (host === 'dich' || host === 'sangtac') ? '1140%5E-16777216%5E-1383213' : '';

    try {
        const url = `https://sangtacviet.vip/truyen/${host}/1/${bookid}/${chapterId}/`;
        console.log(`[Fetch] Navigating: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Execute XHR inside the browser context
        const result = await page.evaluate(({ bookid, host, chapterId, exts }) => {
            return new Promise((resolve) => {
                const apiUrl = `/index.php?bookid=${bookid}&h=${host}&c=${chapterId}&ngmar=readc&sajax=readchapter&sty=1${exts ? '&exts=' + exts : ''}`;
                let attempts = 0;
                const maxAttempts = 8;

                function doFetch() {
                    attempts++;
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', apiUrl, true);
                    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4 && xhr.status === 200) {
                            try {
                                let text = xhr.responseText;
                                const jsonStart = text.indexOf('{"');
                                if (jsonStart > 0) text = text.substring(jsonStart);
                                const data = JSON.parse(text);

                                if (data.code === '0' || data.code === 0) {
                                    resolve(data);
                                } else if ((data.code === '7' || data.code === 7) && attempts < maxAttempts) {
                                    const waitTime = Math.max(parseInt(data.time || 1000), 100);
                                    setTimeout(doFetch, waitTime);
                                } else {
                                    resolve(data);
                                }
                            } catch (e) {
                                resolve({ error: 'parse_error', message: e.message });
                            }
                        }
                    };
                    xhr.send('rescan=true&k=');
                }

                doFetch();
                setTimeout(() => resolve({ error: 'timeout', attempts }), 45000);
            });
        }, { bookid, host, chapterId, exts });

        console.log(`[Fetch] Code: ${result?.code}, Content length: ${(result?.data || result?.content || result?.c || '').length}`);
        return result;
    } finally {
        await page.close();
        await context.close();
    }
}

// ── API Routes ──
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'STV Chapter Scraper (Playwright)' });
});

app.get('/api/sangtacviet', async (req, res) => {
    const { action, host, bookid, chapterId } = req.query;

    if (action !== 'chapter') {
        return res.status(400).json({ error: 'This service only handles action=chapter' });
    }
    if (!host || !bookid || !chapterId) {
        return res.status(400).json({ error: 'Missing host, bookid, or chapterId' });
    }

    try {
        const data = await fetchChapter(host, bookid, chapterId);

        if (data && (data.code === '0' || data.code === 0)) {
            return res.json({
                status: 'success',
                data: {
                    item: {
                        _id: chapterId,
                        name: data.chaptername || data.cn || `Chương ${chapterId}`,
                        book_name: data.bookname || data.bn || '',
                        content: data.data || data.content || data.c || '',
                    },
                },
            });
        }

        return res.json({
            status: 'error',
            error: data?.err || data?.error || 'Failed to fetch chapter',
            code: data?.code,
        });
    } catch (err) {
        console.error('[Error]', err.message);
        return res.status(500).json({ error: 'Internal error', details: err.message });
    }
});

// ── Start server ──
app.listen(PORT, '0.0.0.0', () => {
    console.log(`STV Chapter Scraper listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (browserInstance) await browserInstance.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    if (browserInstance) await browserInstance.close();
    process.exit(0);
});
