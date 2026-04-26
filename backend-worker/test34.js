(async () => {
    const res = await fetch("https://api.codetabs.com/v1/proxy?quest=https://metruyenchu.com.vn/danh-sach/truyen-hot");
    const text = await res.text();
    require('fs').writeFileSync('test_hot.html', text);
})();
