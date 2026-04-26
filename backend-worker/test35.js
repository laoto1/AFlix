(async () => {
    const url = "https://metruyenchu.com.vn/media/book/tu-zombie-tan-the-bat-dau-treo-may.jpg";
    
    // Test 1: Referer = url
    let r1 = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': url
        }
    });
    console.log("R1 status:", r1.status);

    // Test 2: Referer = domain
    let r2 = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://metruyenchu.com.vn/'
        }
    });
    console.log("R2 status:", r2.status);
})();
