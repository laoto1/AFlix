const cheerio=require('cheerio'); 
const axios=require('axios'); 
async function listGenres() { 
    try { 
        let html = (await axios.get('https://nettruyenar.com/tim-truyen', {headers:{'User-Agent':'Mozilla/5.0'}})).data; 
        let $ = cheerio.load(html); 
        let arr = $('.right-side.cmszone a').toArray().map(x => ({ 
            handle: $(x).attr('href').split('/').pop(), 
            title: $(x).text() 
        })); 
        console.log("Success! Found genres:");
        console.log(arr.slice(0,5)); 
    } catch(e) { 
        console.log("Error:", e.message); 
    } 
} 
listGenres();
