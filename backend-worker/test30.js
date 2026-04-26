const fs = require('fs');
(async () => {
    const url = 'https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn';
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    fs.writeFileSync('mtc_home_new.html', text);
    console.log("Written!");
})();
