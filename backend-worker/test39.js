(async () => {
    const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/danh-sach/truyen-ngon-tinh-ngan").then(r => r.text());
    const cheerio = require('cheerio');
    const $ = cheerio.load(data);
    const items = [];
    $('a.cover').each((_, el) => {
        const title = $(el).attr('title');
        const src = $(el).find('img').attr('src');
        const dataSrc = $(el).find('img').attr('data-src');
        const dataBg = $(el).find('img').attr('data-bg');
        items.push({title, src, dataSrc, dataBg});
    });
    console.log(items.slice(0, 2));
})();
