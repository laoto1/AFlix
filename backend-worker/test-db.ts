import { connect } from '@tidbcloud/serverless';

async function main() {
    const conn = connect({
        host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
        username: '3t4pehrLoQRtKrH.root',
        password: '0Kooyu5MbL9ra688',
        database: 'test'
    });

    try {
        const result = await conn.execute('SELECT * FROM users LIMIT 1');
        console.log('--- SELECT QUERY RESULT ---');
        console.log(JSON.stringify(result, null, 2));
        
        const existing = await conn.execute('SELECT * FROM users WHERE username = ? OR email = ?', ['laoto2', 'laoto2']);
        console.log('--- USER QUERY RESULT ---');
        console.log(JSON.stringify(existing, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
