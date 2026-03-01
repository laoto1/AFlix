import { connect, Connection } from '@tidbcloud/serverless';
import { Env } from '../index';

let _conn: Connection | null = null;

export function getDbConnection(env: Env): Connection {
    if (!_conn) {
        _conn = connect({
            host: env.TIDB_HOST,
            username: env.TIDB_USER,
            password: env.TIDB_PASSWORD,
            database: env.TIDB_DATABASE
        });
    }
    return _conn;
}
