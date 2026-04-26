const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const res = await fetch(`${DOMAIN}/thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong/chuong-01-fENzj_S26iMg`, {
        headers: { 'User-Agent': UA }
    });
    const text = await res.text();
    const links = text.match(/<a[^>]+href="[^"]+"[^>]*>.*?<\/a>/g);
    console.log(links ? links.filter(l => l.includes('chuong-02') || l.includes('chuong-0')) : null);
}
test();
