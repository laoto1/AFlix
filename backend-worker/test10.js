const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const res = await fetch(`${DOMAIN}/thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong/chuong-01-fENzj_S26iMg`, {
        headers: { 'User-Agent': UA }
    });
    const text = await res.text();
    // Look for next_chap or prev_chap
    const nextPrevMatches = text.match(/next|prev|chap/gi);
    console.log("Matches:", nextPrevMatches?.slice(0, 20));
    
    // Output any JS scripts
    const scripts = text.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    console.log("Scripts:", scripts);
}
test();
