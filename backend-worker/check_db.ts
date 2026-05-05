import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const envStr = fs.readFileSync(path.join(process.cwd(), '../web/.env'), 'utf8');
const env: Record<string, string> = {};
envStr.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

async function run() {
    const conn = await mysql.createConnection({
        host: env.TIDB_HOST,
        port: Number(env.TIDB_PORT),
        user: env.TIDB_USER,
        password: env.TIDB_PASSWORD,
        database: env.TIDB_DATABASE,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    const [rows] = await conn.execute(`SELECT id, source_id, comic_slug, comic_name, thumb_url FROM reading_history WHERE source_id = 'metruyenchu' OR source_id = 'sangtacviet' ORDER BY last_read_at DESC LIMIT 5`);
    console.log(rows);
    await conn.end();
}

run().catch(console.error);
