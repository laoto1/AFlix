(async () => {
    const cheerio = require('cheerio');
    
    async function test(path) {
        try {
            const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/" + path).then(r => r.text());
            const $ = cheerio.load(data);
            const items = [];
            $('a.cover').each((_, el) => items.push($(el).attr('title')));
            console.log(path, items.length);
        } catch(e) {
            console.log(path, "ERROR");
        }
    }

    await test("the-loai/tien-hiep,kiem-hiep");
    await test("the-loai/tien-hiep+kiem-hiep");
    await test("tim-kiem-nang-cao");
    await test("search?q=&category=tien-hiep");
})();
