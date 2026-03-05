"""patchright HEADED mode — matching the original working Playwright setup"""
import json
import asyncio
from patchright.async_api import async_playwright

async def fetch_chapter():
    host, bookid, chapter_id = "dich", "43165", "1"
    url = f"https://sangtacviet.vip/truyen/{host}/1/{bookid}/{chapter_id}/"
    exts = "1140%5E-16777216%5E-1383213"
    
    async with async_playwright() as p:
        # HEADED mode (like the original working Playwright test)
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print(f"1. Navigating to: {url}")
        response = await page.goto(url, wait_until="networkidle", timeout=30000)
        print(f"   Status: {response.status if response else 'N/A'}")
        await page.wait_for_timeout(3000)
        
        # Create manual XHR
        print("\n2. Manual XHR POST readchapter...")
        result = await page.evaluate("""
            (args) => {
                return new Promise((resolve) => {
                    const {bookid, host, chapterId, exts} = args;
                    const apiUrl = `/index.php?bookid=${bookid}&h=${host}&c=${chapterId}&ngmar=readc&sajax=readchapter&sty=1&exts=${exts}`;
                    
                    let attempts = 0;
                    const maxAttempts = 5;
                    
                    function doFetch() {
                        attempts++;
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', apiUrl, true);
                        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                        xhr.onreadystatechange = function() {
                            if (xhr.readyState === 4 && xhr.status === 200) {
                                try {
                                    let text = xhr.responseText;
                                    const jsonStart = text.indexOf('{"');
                                    if (jsonStart > 0) text = text.substring(jsonStart);
                                    const data = JSON.parse(text);
                                    
                                    if (data.code === "0" || data.code === 0) {
                                        resolve(data);
                                    } else if ((data.code === "7" || data.code === 7) && attempts < maxAttempts) {
                                        const waitTime = Math.max(parseInt(data.time || 1000), 100);
                                        console.log(`Code 7, attempt ${attempts}, waiting ${waitTime}ms...`);
                                        setTimeout(doFetch, waitTime);
                                    } else {
                                        resolve(data);
                                    }
                                } catch(e) {
                                    resolve({error: 'parse_error', message: e.message, raw: xhr.responseText.substring(0, 500)});
                                }
                            }
                        };
                        xhr.send("rescan=true&k=");
                    }
                    
                    doFetch();
                    setTimeout(() => resolve({error: 'timeout', attempts}), 60000);
                });
            }
        """, {"bookid": bookid, "host": host, "chapterId": chapter_id, "exts": exts})
        
        print(f"\n3. Result:")
        if isinstance(result, dict):
            code = result.get("code")
            print(f"   Code: {code}")
            
            if str(code) in ("0",):
                content = result.get("data", result.get("content", result.get("c", "")))
                print(f"\n*** SUCCESS! ***")
                print(f"Chapter: {result.get('chaptername', result.get('cn', 'N/A'))}")
                print(f"Book: {result.get('bookname', result.get('bn', 'N/A'))}")
                print(f"Content length: {len(content)}")
                if content:
                    print(f"Preview: {content[:200]}")
            elif result.get("error"):
                print(f"Error: {result}")
            else:
                print(f"Full: {json.dumps(result, ensure_ascii=False)[:500]}")
        
        await browser.close()

asyncio.run(fetch_chapter())
