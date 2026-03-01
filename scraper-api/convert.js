const fs = require('fs');
const path = require('path');

function convertHonoToExpress(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Imports
    content = content.replace(/import\s+{\s*Hono\s*}\s+from\s+['"]hono['"];?/, "const express = require('express');");
    content = content.replace(/import\s+{\s*load\s*}\s+from\s+['"]cheerio['"];?/, "const cheerio = require('cheerio');");
    content = content.replace(/import\s+cheerio\s+from\s+['"]cheerio['"];?/, "const cheerio = require('cheerio');");

    // 2. Router Init
    content = content.replace(/export\s+const\s+(\w+Route)\s*=\s*new\s*Hono\(\);?/, "const $1 = express.Router();");
    content = content.replace(/const\s+(\w+Route)\s*=\s*new\s*Hono\(\);?/, "const $1 = express.Router();");

    // 3. get/post handlers
    content = content.replace(/\.get\(\s*['"](.*?)['"]\s*,\s*async\s*\(\s*c\s*\)\s*=>\s*{/g, ".get('$1', async (req, res) => {");

    // 4. Request parsing
    content = content.replace(/c\.req\.query\(\)/g, "req.query");
    
    // 5. Response output
    content = content.replace(/return\s+c\.json\((.*?)\);/g, "return res.json($1);");
    
    // 6. cheerio load
    content = content.replace(/load\(/g, "cheerio.load(");

    // 7. Env parsing (specifically for env.NETTRUYEN_DOMAINS)
    content = content.replace(/c\.env\.NETTRUYEN_DOMAINS/g, "process.env.NETTRUYEN_DOMAINS || 'nettruyenviet1.com,nettruyenar.com,nettruyentr.com,nettruyench.com'");

    // 8. Exports
    content += "\nmodule.exports = " + (filePath.includes('nettruyen') ? 'nettruyenRoute;' : 'nhentaiRoute;');

    // 9. Fix TypeScript type annotations (strip basic ones out)
    content = content.replace(/:\s*any/g, "");
    content = content.replace(/:\s*string/g, "");
    content = content.replace(/:\s*number/g, "");
    content = content.replace(/:\s*boolean/g, "");

    // 10. Fix export statement at bottom if the regex missed it
    content = content.replace(/export\s*{\s*\w+Route\s*}\s*;/g, "");

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Converted ${filePath}`);
}

convertHonoToExpress(path.join(__dirname, 'api', 'nettruyen.js'));
convertHonoToExpress(path.join(__dirname, 'api', 'nhentai.js'));
