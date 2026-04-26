const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const res = await fetch(`${DOMAIN}/tim-kiem?tu-khoa=thien-co-cac`, {
        headers: { 'User-Agent': UA }
    });
    const text = await res.text();
    // find the first item block
    const match = text.match(/<div class="itemupdate">([\s\S]*?)<\/div>/);
    console.log(match ? match[1] : "No item");
}
test();
