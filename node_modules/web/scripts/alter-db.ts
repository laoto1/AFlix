import pool from '../netlify/functions/utils/db.js';

const run = async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            console.log('Connecting to TiDB for migration...');
            // Test connection
            await pool.query('SELECT 1');
            break;
        } catch (err: any) {
            console.log(`TiDB not ready, retrying in 5s... (${retries} left)`);
            retries--;
            if (retries === 0) throw err;
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    try {
        await pool.query(`
                ALTER TABLE reading_history ADD COLUMN is_bookmarked BOOLEAN DEFAULT FALSE;
            `);
        console.log('Successfully added is_bookmarked to reading_history.');
    } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column is_bookmarked already exists, skipping.');
        } else {
            throw err;
        }
    }

    // Add profile fields to users (catch error if they already exist)
    try {
        await pool.query(`
                ALTER TABLE users 
                ADD COLUMN avatar_url VARCHAR(500),
                ADD COLUMN cover_url VARCHAR(500),
                ADD COLUMN display_name VARCHAR(100),
                ADD COLUMN bio TEXT;
            `);
        console.log('Successfully added profile columns to users.');
    } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Profile columns already exist, skipping.');
        } else {
            throw err;
        }
    }

    // Add avatar_frame_url to users (catch error if it already exists)
    try {
        await pool.query(`
                ALTER TABLE users 
                ADD COLUMN avatar_frame_url VARCHAR(500);
            `);
        console.log('Successfully added avatar_frame_url to users.');
    } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('avatar_frame_url column already exists, skipping.');
        } else {
            throw err;
        }
    }

    console.log('Migration successful!');
    await pool.end();
};

run();
