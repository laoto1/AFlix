const { chromium } = require('playwright');

async function run() {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8' },
        ignoreHTTPSErrors: true
    });

    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await context.newPage();

    // Block only the worst ad domains, let everything else through
    await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.includes('renamereptiliantrance') || url.includes('o6z2a2kq8f')) {
            await route.abort().catch(() => { });
        } else {
            await route.continue().catch(() => { });
        }
    });

    // Intercept the readchapter response
    let chapterData = null;
    page.on('response', async (response) => {
        if (response.url().includes('sajax=readchapter')) {
            try {
                const text = await response.text();
                console.log('[XHR RESP] Status:', response.status(), 'Len:', text.length);
                let jsonStr = text;
                const jsonStart = text.indexOf('{"');
                if (jsonStart > 0) jsonStr = text.substring(jsonStart);
                chapterData = JSON.parse(jsonStr);
                console.log('[XHR RESP] Code:', chapterData.code);
                if (chapterData.code === "0" || chapterData.code === 0) {
                    console.log('[XHR RESP] SUCCESS! Chapter:', chapterData.chaptername);
                    console.log('[XHR RESP] Content length:', (chapterData.data || '').length);
                    console.log('[XHR RESP] Preview:', (chapterData.data || '').substring(0, 200));
                } else {
                    console.log('[XHR RESP] Data:', JSON.stringify(chapterData).substring(0, 300));
                }
            } catch (e) { }
        }
    });

    console.log('1. Navigate...');
    await page.goto('https://sangtacviet.vip/truyen/dich/1/43165/1/', {
        waitUntil: 'load',
        timeout: 30000
    }).catch(e => console.log('Nav error:', e.message.substring(0, 100)));

    // Wait for the inline scripts to run (they set up chapterfetcher.open etc)
    await page.waitForTimeout(3000);

    console.log('2. Check XHR state and manually send...');
    const sendResult = await page.evaluate(() => {
        if (typeof chapterfetcher === 'undefined') return { error: 'chapterfetcher not defined' };
        if (chapterfetcher.readyState !== 1) return { error: 'readyState is ' + chapterfetcher.readyState };

        // The XHR was opened but never sent. Manually send it.
        try {
            chapterfetcher.send('');
            return { sent: true };
        } catch (e) {
            return { error: e.message };
        }
    });
    console.log('Send result:', JSON.stringify(sendResult));

    // Wait for the response
    console.log('3. Waiting for response...');
    await page.waitForTimeout(5000);

    // Check if we got data
    if (chapterData) {
        if (chapterData.code === "0" || chapterData.code === 0) {
            console.log('\n=== SUCCESS ===');
            console.log('Chapter:', chapterData.chaptername);
            console.log('Book:', chapterData.bookname);
            console.log('Content length:', (chapterData.data || '').length);
            console.log('Content preview:', (chapterData.data || '').substring(0, 300));
        } else if (chapterData.code === 7 || chapterData.code === "7") {
            console.log('\nCode 7 - need to retry...');
            await page.waitForTimeout(parseInt(chapterData.time || 100));

            // Manually trigger gotox() which the page already has defined
            const retryResult = await page.evaluate(() => {
                return new Promise((resolve) => {
                    try {
                        if (typeof gotox === 'function') {
                            // Override onreadystatechange to capture the result
                            var origHandler = chapterfetcher.onreadystatechange;
                            chapterfetcher.onreadystatechange = function () {
                                if (chapterfetcher.readyState === 4 && chapterfetcher.status === 200) {
                                    resolve({
                                        status: chapterfetcher.status,
                                        text: chapterfetcher.responseText.substring(0, 2000)
                                    });
                                }
                                if (origHandler) origHandler.call(this);
                            };
                            gotox();
                        } else {
                            resolve({ error: 'gotox not defined' });
                        }
                    } catch (e) {
                        resolve({ error: e.message });
                    }
                });
            });
            console.log('Retry result:', JSON.stringify(retryResult).substring(0, 500));
        } else {
            console.log('\nError:', JSON.stringify(chapterData).substring(0, 500));
        }
    } else {
        // XHR interceptor didn't catch it, check the page state
        console.log('No XHR data intercepted, checking page...');
        const info = await page.evaluate(() => {
            const el = document.querySelector('[id^="cld-"]') || document.getElementById('maincontent');
            return {
                readyState: typeof chapterfetcher !== 'undefined' ? chapterfetcher.readyState : 'N/A',
                status: typeof chapterfetcher !== 'undefined' ? chapterfetcher.status : 'N/A',
                responseText: typeof chapterfetcher !== 'undefined' ? chapterfetcher.responseText?.substring(0, 500) : 'N/A',
                content: el ? el.innerHTML.substring(0, 300) : 'NOT FOUND'
            };
        });
        console.log('Page state:', JSON.stringify(info, null, 2));
    }

    await browser.close();
}

run().catch(e => {
    console.error('Fatal error:', e.message);
    process.exit(1);
});
