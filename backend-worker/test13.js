const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const res = await fetch(`https://r.jina.ai/${DOMAIN}/thien-co-cac-hanh-tau-nguoi-de-ta-lam-co-dong-nguoi-qua-duong`, {
        headers: { 
            'User-Agent': UA,
            'X-Return-Format': 'html'
        }
    });
    const text = await res.text();
    const inputMatches = text.match(/<input[^>]+>/gi);
    console.log("Inputs:", inputMatches);
    
    // Check if the script with `var bid = ` exists
    const scriptMatches = text.match(/var\s+bid\s*=/gi);
    console.log("var bid found?", !!scriptMatches);
}
test();
