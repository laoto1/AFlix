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

    console.log('Executing CREATE TABLE query...');
    const result = await conn.execute(`
        CREATE TABLE IF NOT EXISTS telecloud_files (
            id VARCHAR(36) PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            size BIGINT NOT NULL,
            mime_type VARCHAR(100),
            chunks JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log('Table created or already exists.', result);
}

main().catch(console.error);
