(async () => {
    const urls = [
        "truyen-ngon-tinh-ngan",
        "truyen-ngon-tinh-hay",
        "truyen-ngon-tinh-18",
        "truyen-ngon-tinh-hoan",
        "truyen-ngon-tinh-nguoc",
        "truyen-ngon-tinh-sung",
        "truyen-ngon-tinh-hai-huoc",
        "truyen-ngon-tinh-sac",
        "truyen-dam-my-hay",
        "truyen-dam-my-hai",
        "truyen-dam-my-h",
        "truyen-teen-hay",
        "truyen-kiem-hiep-hay",
        "truyen-tien-hiep-hay"
    ];
    const cheerio = require('cheerio');
    for (const u of urls) {
        try {
            const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/danh-sach/" + u).then(r => r.text());
            const $ = cheerio.load(data);
            const items = [];
            $('a.cover').each((_, el) => items.push($(el).attr('title')));
            console.log(u, items.length);
        } catch (e) {
            console.log(u, "ERROR");
        }
    }
})();
