import { Hono } from 'hono';
import { getDbConnection } from '../utils/db';
import { Env } from '../index';

const chunking = new Hono<{ Bindings: Env }>();

chunking.post('/', async (c) => {
    const BOT_TOKEN = c.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = c.env.TELEGRAM_CHAT_ID;
    
    if (!BOT_TOKEN || !CHAT_ID) {
        return c.json({ error: 'Telegram configuration is missing' }, 500);
    }

    try {
        const body = await c.req.json();
        const { fileName, fileHash, totalChunks, chunkIndex, base64Data } = body;

        if (!base64Data || chunkIndex === undefined) {
            return c.json({ error: 'Missing logic payload' }, 400);
        }

        // Keep mock response for Telegram large payload chunking
        const mockFileId = `telegram_file_id_${fileHash}_${chunkIndex}_${Date.now()}`;

        // Save reference to TiDB
        const db = getDbConnection(c.env);
        await db.execute(
            'INSERT INTO media_chunks (file_hash, chunk_index, telegram_file_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE telegram_file_id = VALUES(telegram_file_id)',
            [fileHash, chunkIndex, mockFileId]
        );

        return c.json({
            message: `Chunk ${chunkIndex} of ${totalChunks} uploaded.`,
            telegramFileId: mockFileId
        }, 200);
    } catch (err: any) {
        console.error('Upload Error:', err);
        return c.json({ error: 'Failed to upload chunk', details: err.message }, 500);
    }
});

export default chunking;
