const fs = require('fs');
const path = require('path');

function cleanTS(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Remove remaining Hono router generics
    content = content.replace(/const\s+(\w+)\s*=\s*new\s*Hono<\s*{[^}]*}\s*>\(\);?/g, "const $1 = express.Router();");
    
    // Remove (env: Env) usages
    content = content.replace(/\(env:\s*Env\)(\[\])?/g, "()");
    content = content.replace(/env:\s*Env,/g, "");
    
    // Remove env arguments from function signatures
    content = content.replace(/async\s+\(\s*env:\s*Env,\s*paths(\[\])?/g, "async (paths");
    content = content.replace(/async\s+\(\s*env:\s*Env,\s*/g, "async (");
    
    // Remove env arguments from function calls
    content = content.replace(/fetchPathsFallbacks\(env,\s*/g, "fetchPathsFallbacks(");

    // Remove random array typings
    content = content.replace(/paths\[\]/g, "paths");

    // Remove map typings
    content = content.replace(/new\s*Map<\s*string\s*,\s*string\s*>\s*\(\)/g, "new Map()");

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Cleaned ${filePath}`);
}

cleanTS(path.join(__dirname, 'api', 'nettruyen.js'));
cleanTS(path.join(__dirname, 'api', 'nhentai.js'));
