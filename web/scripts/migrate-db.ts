import pool from '../netlify/functions/utils/db.js';

const run = async () => {
    try {
        console.log('Connecting to TiDB for migration...');

        // Drop the old history table
        await pool.query(`DROP TABLE IF EXISTS reading_history`);
        console.log('Dropped old reading_history table.');

        // Recreate it to track per-chapter progress
        await pool.query(`
            CREATE TABLE reading_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                source_id VARCHAR(50) NOT NULL,
                comic_slug VARCHAR(255) NOT NULL,
                comic_name VARCHAR(255) NOT NULL,
                chapter_id VARCHAR(50) NOT NULL,
                page_number INT DEFAULT 0,
                total_pages INT DEFAULT 0,
                thumb_url VARCHAR(500),
                last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY user_chapter_idx (user_id, source_id, comic_slug, chapter_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Created new reading_history table configured for per-chapter tracking.');

        console.log('Migration successful!');
    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        await pool.end();
    }
};

run();
