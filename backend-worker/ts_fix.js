const fs = require('fs');

const files = ['auth.ts', 'bookmarks.ts', 'history.ts', 'profile.ts'];

files.forEach(f => {
    let c = fs.readFileSync('src/routes/' + f, 'utf8');
    
    // Fix Env types
    c = c.split('new Hono<{ Bindings: Env }>()').join('new Hono<{ Variables: { userId: number }, Bindings: Env }>()');
    
    // Fix DB generic Types
    c = c.split('result.rows').join('(result as any).rows');
    c = c.split('result.lastInsertId').join('(result as any).lastInsertId');
    
    // Fix DB types in "existing" query
    c = c.split('existing.rows').join('(existing as any).rows');
    
    fs.writeFileSync('src/routes/' + f, c);
});

// Fix nhentai-tags imports
let ntg = fs.readFileSync('src/routes/nhentai-tags.ts', 'utf8');
ntg = ntg.split("import axios from 'axios';").join("import axios from 'axios';\nimport { Hono } from 'hono';\nimport { Env } from '../index';");
fs.writeFileSync('src/routes/nhentai-tags.ts', ntg);

// Fix nettruyen.ts out-of-scope issues
let net = fs.readFileSync('src/routes/nettruyen.ts', 'utf8');
net = net.split('const domains = getDomains((c as any).env);').join('const domains = getDomains(env);');
net = net.split('await fetchPathsFallbacks(c.env,').join('await fetchPathsFallbacks(event.env,'); // wait, c is available there.
fs.writeFileSync('src/routes/nettruyen.ts', net);

console.log('Fixed typescript issues');
