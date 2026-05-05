import { Hono } from 'hono';
import { Env } from '../index';

const tmdb = new Hono<{ Bindings: Env }>();

tmdb.get('/credits/:type/:id', async (c) => {
    const { type, id } = c.req.param();
    const apiKey = c.env.TMDB_API_KEY;

    if (!apiKey) {
        return c.json({ error: 'TMDB API key is missing' }, 500);
    }

    try {
        const isBearer = apiKey.length > 50; 
        const headers: Record<string, string> = {
            'Accept': 'application/json'
        };
        
        let url = `https://api.themoviedb.org/3/${type}/${id}/credits?language=vi-VN`;
        
        if (isBearer) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            url += `&api_key=${apiKey}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`TMDB returned ${res.status}`);
        }
        
        const data = await res.json();
        return c.json({ status: 'success', data });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

export default tmdb;
