const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const nettruyenRouter = require('./nettruyen').nettruyen || require('./nettruyen');
const nhentaiRouter = require('./nhentai').nhentai || require('./nhentai');
const sangtacvietRouter = require('./sangtacviet').sangtacviet || require('./sangtacviet');

const app = express();
app.use(cors());

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Flix Scraper API (Netlify) is running' });
});

// Mount specialized scrapers
app.use('/api/nettruyen', nettruyenRouter);
app.use('/api/nhentai', nhentaiRouter);
app.use('/api/sangtacviet', sangtacvietRouter);

// Export for Netlify serverless
module.exports.handler = serverless(app);

// For local testing
if (process.env.NODE_ENV === 'development') {
    const port = 3001;
    app.listen(port, () => console.log(`Local Express server running on port ${port}`));
}
