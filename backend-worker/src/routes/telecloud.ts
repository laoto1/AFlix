import { Hono } from 'hono';
import { Env } from '../index';
import { getDbConnection } from '../utils/db';
import { cache } from 'hono/cache';
import * as jwt from 'jsonwebtoken';

const app = new Hono<{ Bindings: Env }>();

// Generate a random UUID
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Security Middleware: Hybrid Auth (JWT or Admin Key)
// Applies to all write operations (POST, DELETE) and private endpoints
app.use('*', async (c, next) => {
    // We can leave GET /download/:id public so users can click links
    // But let's protect /upload_chunk, /finalize, /files, /files/:id
    const path = new URL(c.req.url).pathname;
    if (c.req.method === 'GET' && path.includes('/download/')) {
        return next();
    }

    const adminKey = c.req.header('x-admin-key');
    if (adminKey && adminKey === c.env.ADMIN_SECRET) {
        return next(); // Admin auth success
    }

    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            jwt.verify(token, c.env.JWT_SECRET);
            return next(); // User auth success
        } catch (err) {
            // Invalid JWT
        }
    }

    return c.json({ success: false, error: 'Unauthorized. Valid JWT or Admin Key required.' }, 401 as any);
});

// 1. Get files list (Cached for 15 seconds to reduce TiDB load)
app.get('/files', cache({ cacheName: 'telecloud-files', cacheControl: 'max-age=15' }), async (c) => {
    try {
        const db = getDbConnection(c.env);
        const results = await db.execute('SELECT * FROM telecloud_files ORDER BY created_at DESC');
        return c.json({ success: true, files: results });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500 as any);
    }
});

// 2. Upload a chunk directly to Telegram
app.post('/upload_chunk', async (c) => {
    try {
        const body = await c.req.parseBody();
        const chunk = body['chunk'] as File;

        if (!chunk) {
            return c.json({ success: false, error: 'No chunk provided' }, 400 as any);
        }

        const botToken = c.env.TELEGRAM_BOT_TOKEN;
        const chatId = c.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            return c.json({ success: false, error: 'Telegram credentials missing' }, 500 as any);
        }

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', chunk);

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const tgData = await tgRes.json() as any;

        if (!tgData.ok) {
            return c.json({ success: false, error: tgData.description }, 500 as any);
        }

        const fileId = tgData.result.document.file_id;
        return c.json({ success: true, file_id: fileId });

    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500 as any);
    }
});

// 3. Finalize upload (Save to DB)
app.post('/finalize', async (c) => {
    try {
        const body = await c.req.json();
        const { filename, size, mime_type, chunks } = body;

        if (!filename || !chunks || !Array.isArray(chunks)) {
            return c.json({ success: false, error: 'Invalid payload' }, 400 as any);
        }

        const id = uuidv4();
        const db = getDbConnection(c.env);

        await db.execute(
            'INSERT INTO telecloud_files (id, filename, size, mime_type, chunks) VALUES (?, ?, ?, ?, ?)',
            [id, filename, size, mime_type || '', JSON.stringify(chunks)]
        );

        return c.json({ success: true, id });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500 as any);
    }
});

// 4. Download file (Stream all chunks)
app.get('/download/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const db = getDbConnection(c.env);
        
        const results = await db.execute('SELECT * FROM telecloud_files WHERE id = ? LIMIT 1', [id]) as any[];
        
        if (!results || results.length === 0) {
            return c.json({ success: false, error: 'File not found' }, 404 as any);
        }
        
        const fileRecord = results[0];
        const chunks = JSON.parse(fileRecord.chunks as string) as string[];
        const botToken = c.env.TELEGRAM_BOT_TOKEN;

        // Create a ReadableStream that fetches chunks one by one and streams them
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for (const fileId of chunks) {
                        // 1. Cache the Telegram getFile API request to avoid hitting Bot API limits
                        const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
                        const cfCache = (caches as any).default;
                        let pathRes = await cfCache.match(new Request(getFileUrl));
                        
                        if (!pathRes) {
                            pathRes = await fetch(getFileUrl);
                            if (pathRes.ok) {
                                // Cache the file path for 50 minutes (Telegram links expire after ~1 hour)
                                const responseToCache = new Response(pathRes.clone().body, pathRes);
                                responseToCache.headers.set('Cache-Control', 'max-age=3000');
                                await cfCache.put(new Request(getFileUrl), responseToCache);
                            }
                        }

                        const pathData = await pathRes.json() as any;
                        
                        if (!pathData.ok) {
                            throw new Error('Failed to get file path from Telegram');
                        }
                        
                        const filePath = pathData.result.file_path;
                        const dlUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
                        
                        // Download chunk (proxy via Worker)
                        const chunkRes = await fetch(dlUrl);
                        if (!chunkRes.ok || !chunkRes.body) {
                            throw new Error('Failed to download chunk');
                        }

                        // Pipe chunk into the controller
                        const reader = chunkRes.body.getReader();
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            controller.enqueue(value);
                        }
                    }
                    controller.close();
                } catch (e: any) {
                    controller.error(e);
                }
            }
        });

        const encodedFilename = encodeURIComponent(fileRecord.filename as string).replace(/['()]/g, escape).replace(/\*/g, '%2A');
        
        return new Response(stream, {
            headers: {
                'Content-Type': (fileRecord.mime_type as string) || 'application/octet-stream',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': (fileRecord.size as number).toString(),
            }
        });

    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500 as any);
    }
});

// 5. Delete file
app.delete('/files/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const db = getDbConnection(c.env);
        await db.execute('DELETE FROM telecloud_files WHERE id = ?', [id]);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500 as any);
    }
});

export default app;
