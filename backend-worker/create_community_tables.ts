import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from web directory
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

async function main() {
    console.log('Connecting to TiDB...');
    const conn = connect({
        host: process.env.TIDB_HOST,
        username: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DATABASE
    });

    console.log('Executing CREATE TABLE queries...');
    
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS community_novels (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            description TEXT,
            cover_url TEXT,
            categories JSON,
            status VARCHAR(50) DEFAULT 'ongoing',
            view_count BIGINT DEFAULT 0,
            like_count BIGINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS community_chapters (
            id VARCHAR(36) PRIMARY KEY,
            novel_id VARCHAR(36) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content_text LONGTEXT NOT NULL,
            order_index INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (novel_id, order_index)
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS community_novel_views (
            novel_id VARCHAR(36) NOT NULL,
            viewer_hash VARCHAR(128) NOT NULL,
            view_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (novel_id, viewer_hash, view_date)
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS community_novel_likes (
            novel_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (novel_id, user_id)
        )
    `);
    
    console.log('Tables created successfully.');
}

main().catch(console.error);
