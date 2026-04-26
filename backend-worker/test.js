const https = require('https');
https.get('https://backend-worker.laoto.workers.dev/api/metruyenchu/debug_cover', (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log(res.statusCode, data));
});
