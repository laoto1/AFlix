"""
SangTacViet Chapter Fetcher via Scrapling
Usage: python scrapling_chapter.py <host> <bookid> <chapterId>
Output: JSON to stdout
"""
import sys
import json
import re

def fetch_chapter(host: str, bookid: str, chapter_id: str) -> dict:
    """
    Try multiple approaches to fetch chapter content:
    1. StealthyFetcher with solve_cloudflare (best CF bypass)
    2. Fetcher with TLS impersonation (fallback, no browser)
    """
    
    url = f"https://sangtacviet.vip/truyen/{host}/1/{bookid}/{chapter_id}/"
    
    # ── Approach 1: StealthyFetcher (stealth browser, CF bypass) ──
    try:
        from scrapling.fetchers import StealthyFetcher
        
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            google_search=False,
            disable_resources=False,
            network_idle=True,
            wait=3,
        )
        
        # Check if page loaded
        if page and page.status in (200, 301, 302):
            # Try to find the chapter content XHR data
            # The page JS makes an XHR to readchapter — we need to wait for it
            # and then extract #maincontent
            main_content = page.css('#maincontent')
            if main_content:
                content_html = main_content[0].html
                if content_html and len(content_html) > 100:
                    # Get chapter name from title
                    title_el = page.css('title')
                    chapter_name = title_el[0].text.strip() if title_el else f"Chương {chapter_id}"
                    
                    return {
                        "status": "success",
                        "data": {
                            "item": {
                                "_id": chapter_id,
                                "name": chapter_name,
                                "book_name": "",
                                "content": content_html
                            }
                        }
                    }
            
            # If #maincontent is empty, the XHR hasn't fired yet
            # Try to extract the readchapter response from page scripts
            # or make the XHR call manually
            print("StealthyFetcher: page loaded but #maincontent empty, trying manual XHR approach", file=sys.stderr)
            
    except Exception as e:
        print(f"StealthyFetcher failed: {e}", file=sys.stderr)
    
    # ── Approach 2: StealthySession (persistent session, can execute JS) ──
    try:
        from scrapling.fetchers import StealthyFetcher
        
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            google_search=False,
            disable_resources=False,
            network_idle=True,
            wait=8,  # Wait longer for XHR to complete
        )
        
        if page and page.status in (200, 301, 302):
            main_content = page.css('#maincontent')
            if main_content:
                content_html = main_content[0].html
                if content_html and len(content_html) > 100:
                    title_el = page.css('title')
                    chapter_name = title_el[0].text.strip() if title_el else f"Chương {chapter_id}"
                    return {
                        "status": "success",
                        "data": {
                            "item": {
                                "_id": chapter_id,
                                "name": chapter_name,
                                "book_name": "",
                                "content": content_html
                            }
                        }
                    }
    except Exception as e:
        print(f"StealthyFetcher (long wait) failed: {e}", file=sys.stderr)
    
    # ── Approach 3: Fetcher with TLS impersonation (no browser, fast) ──
    try:
        from scrapling.fetchers import Fetcher
        
        # First fetch the page to get cookies
        page = Fetcher.get(url, stealthy_headers=True, follow_redirects=True)
        
        if page and page.status == 200:
            # Extract cookies from the response  
            # Then try the readchapter API directly
            exts = "&exts=1140%5E-16777216%5E-1383213" if host in ("dich", "sangtac") else ""
            api_url = f"https://sangtacviet.vip/index.php?bookid={bookid}&h={host}&c={chapter_id}&ngmar=readc&sajax=readchapter&sty=1{exts}"
            
            api_page = Fetcher.post(
                api_url,
                data="",
                stealthy_headers=True,
                follow_redirects=True,
            )
            
            if api_page and api_page.status == 200:
                try:
                    text = api_page.text
                    json_start = text.find('{"')
                    if json_start > 0:
                        text = text[json_start:]
                    data = json.loads(text)
                    if data.get("code") in ("0", 0):
                        return {
                            "status": "success",
                            "data": {
                                "item": {
                                    "_id": chapter_id,
                                    "name": data.get("chaptername", data.get("cn", f"Chương {chapter_id}")),
                                    "book_name": data.get("bookname", data.get("bn", "")),
                                    "content": data.get("data", data.get("content", data.get("c", "")))
                                }
                            }
                        }
                except json.JSONDecodeError:
                    pass        
    except Exception as e:
        print(f"Fetcher (HTTP) failed: {e}", file=sys.stderr)
    
    return {"status": "error", "error": "All approaches failed"}


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"status": "error", "error": "Usage: python scrapling_chapter.py <host> <bookid> <chapterId>"}))
        sys.exit(1)
    
    host = sys.argv[1]
    bookid = sys.argv[2]
    chapter_id = sys.argv[3]
    
    result = fetch_chapter(host, bookid, chapter_id)
    print(json.dumps(result, ensure_ascii=False))
