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

    const [rows] = await conn.execute(`SELECT id, source_id, comic_slug FROM reading_history WHERE (source_id = 'metruyenchu' OR source_id = 'sangtacviet') AND (thumb_url IS NULL OR thumb_url = '')`);
    
    for (const row of (rows as any[])) {
        let cover = '';
        if (row.source_id === 'metruyenchu') {
            const res = await fetch(`https://backend-worker.laoto.workers.dev/api/metruyenchu?action=detail&bookid=${row.comic_slug}`);
            const data = await res.json() as any;
            cover = data?.data?.thumb_url || '';
        } else {
            const parts = row.comic_slug.split('|');
            if (parts.length > 1) {
                const res = await fetch(`https://backend-worker.laoto.workers.dev/api/sangtacviet?action=detail&host=${parts[0]}&bookid=${parts[1]}`);
                const data = await res.json() as any;
                cover = data?.data?.item?.thumb_url || '';
            }
        }

        if (cover) {
            console.log(`Updating ${row.comic_slug} with cover ${cover}`);
            await conn.execute('UPDATE reading_history SET thumb_url = ? WHERE id = ?', [cover, row.id]);
        }
    }

    console.log('Done!');
    await conn.end();
}

run().catch(console.error);
