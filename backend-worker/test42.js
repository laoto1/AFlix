(async () => {
    const data = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/danh-sach/truyen-ngon-tinh-nguoc").then(r => r.text());
    require('fs').writeFileSync('test42.html', data);
})();
