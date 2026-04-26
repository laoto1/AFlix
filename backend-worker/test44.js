(async () => {
    const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/tim-kiem-nang-cao").then(r => r.text());
    require('fs').writeFileSync('test43.html', data);
})();
