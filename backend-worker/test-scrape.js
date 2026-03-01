const axios = require('axios');
const cheerio = require('cheerio');

async function testNettruyen() {
    try {
        const res = await axios.get('https://nettruyenviet1.com/tim-truyen?sort=15', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        console.log('Nettruyen title:', $('title').text());
        console.log('Nettruyen items count (selector 1):', $('.items .item, .ModuleContent .items .item').length);
        console.log('Nettruyen items count (selector 2):', $('.item').length);
        const firstTitle = $('.items .item').first().find('figcaption h3 a, .jtip').text().trim();
        console.log('Nettruyen first item title:', firstTitle);
    } catch(e) { console.log('Nettruyen error:', e.message); }
}

async function testNhentai() {
    try {
        const res = await axios.get('https://nhentai.net/?page=1', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        console.log('Nhentai title:', $('title').text());
        console.log('Nhentai gallery count:', $('.gallery').length);
    } catch(e) { 
        console.log('Nhentai error:', e.response ? `HTTP ${e.response.status} ${e.response.statusText}` : e.message); 
        console.log('Headers:', e.response ? e.response.headers : 'No response');
    }
}

testNettruyen();
testNhentai();
