const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const res = await fetch(`https://r.jina.ai/${DOMAIN}/thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong`, {
        headers: { 
            'User-Agent': UA,
            'X-Return-Format': 'html'
        }
    });
    console.log(res.status);
    const text = await res.text();
    const bidMatch = text.match(/bid[\s"':=]*(\d+)/i);
    console.log("bidMatch:", bidMatch);
    console.log("Raw output snippet:", text.substring(0, 500));
}
test();
