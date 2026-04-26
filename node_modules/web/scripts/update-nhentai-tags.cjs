/**
 * Nhentai Tags Updater
 * 
 * Scrapes nhentai.net for ALL tags across categories (tags, artists, characters, parodies, groups).
 * Iterates through every page of each category's "popular" endpoint to build a comprehensive dataset.
 * 
 * Result is saved to public/nhentai-tags.json (~3-5MB) and served as a static CDN asset.
 * 
 * If scraping fails entirely, falls back to the existing cached file.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const TYPES = ['tags', 'artists', 'characters', 'parodies', 'groups'];
const CONCURRENT_REQUESTS = 5;
const DELAY_BETWEEN_BATCHES_MS = 300;
const REQUEST_TIMEOUT_MS = 15000;
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'nhentai-tags.json');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Detect the total number of pages for a given type's popular listing.
 */
async function getLastPage(type) {
    const url = `https://nhentai.net/${type}/popular`;
    try {
        const res = await axios.get(url, { headers, timeout: REQUEST_TIMEOUT_MS });
        const $ = cheerio.load(res.data);

        // Check for a "last" page link
        const lastLink = $('a.last').attr('href');
        if (lastLink) {
            const match = lastLink.match(/page=(\d+)/);
            if (match) return parseInt(match[1]);
        }

        // Fallback: check numbered page links
        let maxPage = 1;
        $('a.page').each((_, el) => {
            const href = $(el).attr('href');
            const match = href?.match(/page=(\d+)/);
            if (match) maxPage = Math.max(maxPage, parseInt(match[1]));
        });
        return maxPage;
    } catch (e) {
        console.warn(`  ⚠ Could not detect last page for "${type}": ${e.message}`);
        return 1;
    }
}

/**
 * Scrape a single page of a given type's popular listing.
 */
async function scrapePage(type, page) {
    const url = `https://nhentai.net/${type}/popular?page=${page}`;
    try {
        const res = await axios.get(url, { headers, timeout: REQUEST_TIMEOUT_MS });
        const $ = cheerio.load(res.data);
        const tags = [];

        $('.tag').each((_, el) => {
            const name = $(el).find('.name').text().trim();
            const countText = $(el).find('.count').text().trim();
            if (name) {
                tags.push({
                    _id: name,
                    name: name,
                    slug: name.replace(/ /g, '-'),
                    type,
                    count: countText,
                });
            }
        });

        return tags;
    } catch (e) {
        // Individual page failures are not fatal
        return [];
    }
}

/**
 * Scrape ALL pages for one type. Uses batched concurrency.
 */
async function scrapeType(type) {
    const lastPage = await getLastPage(type);
    console.log(`  📄 ${type}: ${lastPage} page(s) detected`);

    const allTags = [];
    const seenSlugs = new Set();
    let failedBatches = 0;

    const totalBatches = Math.ceil(lastPage / CONCURRENT_REQUESTS);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const startPage = batchIdx * CONCURRENT_REQUESTS + 1;
        const endPage = Math.min(startPage + CONCURRENT_REQUESTS - 1, lastPage);

        const promises = [];
        for (let page = startPage; page <= endPage; page++) {
            promises.push(scrapePage(type, page));
        }

        const results = await Promise.all(promises);
        let batchEmpty = true;
        for (const tags of results) {
            for (const tag of tags) {
                batchEmpty = false;
                if (!seenSlugs.has(tag.slug)) {
                    seenSlugs.add(tag.slug);
                    allTags.push(tag);
                }
            }
        }

        if (batchEmpty) {
            failedBatches++;
            // If 3 consecutive empty batches, likely hit Cloudflare or end of data
            if (failedBatches >= 3) {
                console.log(`  ⚠ Stopped early at batch ${batchIdx + 1}/${totalBatches} (3 consecutive empty batches)`);
                break;
            }
        } else {
            failedBatches = 0;
        }

        // Progress indicator
        if ((batchIdx + 1) % 10 === 0 || batchIdx === totalBatches - 1) {
            console.log(`  ⏳ ${type}: batch ${batchIdx + 1}/${totalBatches} (${allTags.length} tags so far)`);
        }

        if (batchIdx < totalBatches - 1) {
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    console.log(`  ✅ ${type}: ${allTags.length} unique tags scraped`);
    return allTags;
}

async function main() {
    console.log('🔄 Starting nhentai tags update...');
    console.log(`   Output: ${OUTPUT_PATH}`);

    const groupedItems = {};
    let totalCount = 0;

    for (const type of TYPES) {
        console.log(`\n📁 Scraping "${type}"...`);
        try {
            groupedItems[type] = await scrapeType(type);
            totalCount += groupedItems[type].length;
        } catch (e) {
            console.error(`  ❌ Failed to scrape "${type}": ${e.message}`);
            groupedItems[type] = [];
        }
        // Wait between types to be polite
        await sleep(1000);
    }

    if (totalCount === 0) {
        console.error('\n❌ No tags scraped at all. Keeping existing cached file (if any).');
        process.exit(0); // Don't fail the build
    }

    const output = {
        status: 'success',
        updatedAt: new Date().toISOString(),
        data: {
            items: groupedItems
        }
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
    const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);

    console.log(`\n🎉 Done! Total: ${totalCount} tags. File size: ${fileSizeKB} KB`);
    console.log(`   Breakdown: ${TYPES.map(t => `${t}=${groupedItems[t].length}`).join(', ')}`);
}

main().catch(err => {
    console.error('❌ Tag update script failed:', err.message);
    // Don't crash the build — the existing cached file will be used
    process.exit(0);
});
