(async () => {
    const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/toan-dan-tro-choi-tu-zombie-tan-the-bat-dau-treo-may").then(r => r.text());
    const coverMatch = data.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    console.log("og:image", coverMatch ? coverMatch[1] : null);
    
    const imgMatch = data.match(/class="book-info-pic"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
    console.log("book-info-pic", imgMatch ? imgMatch[1] : null);
})();
