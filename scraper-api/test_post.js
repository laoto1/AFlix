const axios = require('axios');
const DOMAIN = "https://test-cf.b4tsut0.workers.dev";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CHROME_HEADERS = {
    "Host": "sangtacviet.vip",
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
};

async function run() {
    try {
        const res1 = await axios.get(`${DOMAIN}/truyen/dich/1/43165/1/`, {
            headers: CHROME_HEADERS,
        });

        let cookies = res1.headers['set-cookie'] || [];
        let sessionCookies = [];
        cookies.forEach(str => {
            const parts = str.split(';');
            const pair = parts[0].trim();
            const [key, val] = pair.split('=');
            if (key !== '_gac' && key !== '_acx' && key !== '_ac') sessionCookies.push(pair);
        });

        const html = res1.data;
        let acxMatch = html.match(/_acx=([^;'"]+)/);
        let acx = acxMatch ? acxMatch[1] : "";

        let gacMatch = html.match(/document\.cookie\s*=\s*["']_gac=([^;'"]+)/);
        let gac = gacMatch ? gacMatch[1] : "";

        let acMatch = html.match(/document\.cookie\s*=\s*["']_ac=([^;'"]+)/);
        let ac = acMatch ? acMatch[1] : "";

        console.log("Cookies:", { gac, acx, ac, sessionCookies });

        let retries = 0;
        let res2;
        let postBody = "";
        let url = `${DOMAIN}/index.php?bookid=43165&h=dich&c=1&ngmar=readc&sajax=readchapter&sty=1&exts=1140%5E-16777216%5E-1383213`;

        while (retries < 3) {
            res2 = await axios.post(url, postBody, {
                headers: {
                    ...CHROME_HEADERS,
                    "Accept": "*/*",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Cookie": `cookieenabled=true; _acx=${acx}; _gac=${gac}; _ac=${ac}; ${sessionCookies.join("; ")}`,
                    "Referer": "https://sangtacviet.vip/truyen/dich/1/43165/1/",
                    "Origin": "https://sangtacviet.vip",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "X-Requested-With": "XmlHttpRequest"
                },
                timeout: 10000
            });

            console.log(`[Attempt ${retries + 1}] POST Status:`, res2.status);

            let dataObj = typeof res2.data === "string" ? null : res2.data;
            if (!dataObj) {
                try {
                    dataObj = JSON.parse(res2.data);
                } catch (e) { }
            }

            if (dataObj && (dataObj.code === 7 || dataObj.code === "7")) {
                console.log(`Code 7 received. Time: ${dataObj.time}. Retrying...`);
                let newCookies = res2.headers['set-cookie'] || [];
                newCookies.forEach(str => {
                    const parts = str.split(';');
                    const [key, val] = parts[0].trim().split('=');
                    if (key === '_ac') ac = val;
                });
                await new Promise(r => setTimeout(r, parseInt(dataObj.time || 50)));

                // Instead of full DOM reload, act like gotox() without exts
                url = `${DOMAIN}/index.php?bookid=43165&h=dich&c=1&ngmar=readc&sajax=readchapter&sty=1`;
                postBody = "rescan=true&k=";
                retries++;
            } else {
                break;
            }
        }

        console.log("FINAL POST headers:", res2.headers);
        if (typeof res2.data === 'string') {
            console.log("FINAL POST data snippet (HTML):", res2.data.substring(0, 500));
        } else {
            console.log("FINAL POST data snippet (JSON):", JSON.stringify(res2.data).substring(0, 500));
        }
    } catch (err) {
        if (err.response) {
            console.error("Error Status:", err.response.status);
            console.error("Error headers:", err.response.headers);
            console.error("Error Data snippet:", typeof err.response.data === 'string' ? err.response.data.substring(0, 500) : JSON.stringify(err.response.data).substring(0, 500));
        } else {
            console.error("Error:", err.message);
        }
    }
}
run();
