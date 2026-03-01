const fs = require('fs');
const path = require('path');

const files = ['nettruyen.ts', 'nhentai.ts', 'nhentai-tags.ts'];

for (const file of files) {
  const sourcePath = path.join(__dirname, '../web/netlify/functions', file);
  let content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Replace imports
  content = content.replace("import { Handler } from '@netlify/functions';", "import { Hono } from 'hono';\nimport { Env } from '../index';");
  
  // Replace handler signature
  let appName = file.replace('.ts', '').replace('-', '_');
  content = content.replace(
      "export const handler: Handler = async (event) => {", 
      `const ${appName} = new Hono<{ Bindings: Env }>();\n\n${appName}.get('/', async (c) => {\n    const event = { queryStringParameters: c.req.query(), path: c.req.path };`
  );
  
  // Fix getDomains environment variables (injecting c.env) for nettruyen
  if (file === 'nettruyen.ts') {
      content = content.replace("const getDomains = (): string[] => {", "const getDomains = (env: Env): string[] => {");
      content = content.replace("const envDomains = process.env.NETTRUYEN_DOMAINS;", "const envDomains = env.NETTRUYEN_DOMAINS;");
      
      // Update the calls
      content = content.replace(/const domains = getDomains\(\);/g, "const domains = getDomains((c as any).env);");
      
      // Since `fetchWithFailover` and `fetchFixedPath` are outside the handler but called inside, 
      // we need to pass `c.env` down to them.
      content = content.replace(
          "const fetchWithFailover = async (", 
          "const fetchWithFailover = async (\n    env: Env,"
      );
      content = content.replace(
          "const fetchFixedPath = async (", 
          "const fetchFixedPath = async (\n    env: Env,"
      );
      
      // Now update the internal getDomains() calls in those functions
      content = content.replace(/const domains = getDomains\(\);/g, "const domains = getDomains(env);");
      
      // Now update where they are called inside the route
      content = content.replace(/await fetchPathsFallbacks\(/g, "await fetchPathsFallbacks(c.env, ");
      content = content.replace(/const fetchPathsFallbacks = async \(/g, "const fetchPathsFallbacks = async (env: Env, ");
      
      content = content.replace(/await fetchWithFailover\(/g, "await fetchWithFailover(env, "); // Inside fetchPathsFallbacks
      // Inside detail and chapter
      content = content.replace(/await fetchWithFailover\(\s*\(cp\)/g, "await fetchWithFailover(c.env, (cp)");
      // Categories call
      content = content.replace(/await fetchFixedPath\('\/', headers\);/g, "await fetchFixedPath(c.env, '/', headers);");
  }
  
  // Fix nhentai-tags ID query and general parsing
  if (file === 'nhentai-tags.ts') {
      content = content.replace("const searchPages = Math.min(parseInt(event.queryStringParameters?.pages || '15'), 30);", 
                               "const searchPages = Math.min(parseInt(c.req.query('pages') || '15'), 30);");
  }

  // Replace old Netlify Return blocks
  // Regex needs to handle multiline safely
  
  // 1. JSON stringify with explicit headers
  content = content.replace(/return\s*{\s*statusCode:\s*(\d+),\s*headers:\s*{[^}]+},\s*body:\s*JSON\.stringify\(([\s\S]*?)\)\s*};/g, "return c.json($2, $1 as any);");
  
  // 2. JSON stringify without explicit headers
  content = content.replace(/return\s*{\s*statusCode:\s*(\d+),\s*body:\s*JSON\.stringify\(([\s\S]*?)\)\s*};/g, "return c.json($2, $1 as any);");
  
  // 3. String responses (errors)
  content = content.replace(/return\s*{\s*statusCode:\s*(\d+),\s*body:\s*'([^']+)'\s*};/g, "return c.text('$2', $1 as any);");

  // Export the Hono app
  content += `\nexport default ${appName};\n`;
  
  fs.writeFileSync(path.join(__dirname, 'src/routes', file), content);
}
console.log("Ported Scraping APIs to Hono");
