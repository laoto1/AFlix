const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    // bookId cho Thiên Cơ Các là 115119 (nhìn trong test HTML trước)
    const res = await fetch(`${DOMAIN}/get/listchap/115119?page=1`, {
        headers: { 'User-Agent': UA }
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 500));
}
test();
