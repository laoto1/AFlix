import pool from '../netlify/functions/utils/db.js';

const run = async () => {
    try {
        console.log('Connecting to TiDB...');

        // Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('users table ready.');

        // History Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reading_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                source_id VARCHAR(50) NOT NULL,
                comic_slug VARCHAR(255) NOT NULL,
                comic_name VARCHAR(255) NOT NULL,
                chapter_id VARCHAR(50) NOT NULL,
                page_number INT DEFAULT 0,
                total_pages INT DEFAULT 0,
                is_bookmarked BOOLEAN DEFAULT FALSE,
                thumb_url VARCHAR(500),
                last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY user_chapter_idx (user_id, source_id, comic_slug, chapter_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('reading_history table ready.');

        // Bookmarks (Library) Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                source_id VARCHAR(50) NOT NULL,
                comic_slug VARCHAR(255) NOT NULL,
                comic_name VARCHAR(255) NOT NULL,
                thumb_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY user_bookmark_idx (user_id, source_id, comic_slug),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('bookmarks table ready.');

        // Telegram Chunks Table (For future media storage)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS media_chunks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                file_hash VARCHAR(100) NOT NULL,
                chunk_index INT NOT NULL,
                telegram_file_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY hash_chunk_idx (file_hash, chunk_index)
            )
        `);
        console.log('media_chunks table ready.');

        console.log('Database initialization successful!');
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        await pool.end();
    }
};

run();
