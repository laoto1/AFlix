const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const res = await fetch(`${DOMAIN}/thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong/chuong-01-fENzj_S26iMg`, {
        headers: { 'User-Agent': UA }
    });
    const text = await res.text();
    const bidMatch = text.match(/bid[\s"':=]*(\d+)/i);
    console.log("bidMatch:", bidMatch);
    
    // Let's also look at all <input> tags
    const inputMatches = text.match(/<input[^>]+>/g);
    console.log("Inputs:", inputMatches);
    
    // See if the novel title or description is here
    const novelTitle = text.match(/<a[^>]+href="[^"]+thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong"[^>]*>([^<]+)<\/a>/i);
    console.log("Novel Title:", novelTitle ? novelTitle[1] : null);
}
test();
