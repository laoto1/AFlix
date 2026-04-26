(async () => {
    const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/danh-sach/truyen-ngon-tinh-ngan").then(r => r.text());
    const cheerio = require('cheerio');
    const $ = cheerio.load(data);
    const items = [];
    $('a.cover').each((_, el) => {
        const title = $(el).attr('title');
        items.push(title);
    });
    console.log(items.length, items.slice(0, 3));
})();
