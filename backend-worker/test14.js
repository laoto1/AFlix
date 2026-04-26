const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const bookid = 'thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong';
    const url = `https://r.jina.ai/${DOMAIN}/${bookid}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'X-Return-Format': 'html' } });
    const data = await res.text();
    console.log("Starts with:", data.substring(0, 100));
}
test();
