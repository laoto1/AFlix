class OGRewriter {
    constructor(private metaTags: Record<string, string>, private title: string) {}
    
    element(element: any) {
        if (element.tagName === 'title') {
            element.setInnerContent(this.title);
            return;
        }

        const prop = element.getAttribute('property') || element.getAttribute('name');
        if (prop && this.metaTags[prop]) {
            element.setAttribute('content', this.metaTags[prop].replace(/"/g, '&quot;'));
        }
    }
}

export default {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        try {
            const url = new URL(request.url);
            
            // Fetch the static asset (Cloudflare Workers Assets handles SPA fallback)
            const response = await env.ASSETS.fetch(request);
            
            // Only rewrite HTML for /movie/ routes
            if (!url.pathname.startsWith('/movie/')) {
                return response;
            }

            const clonedResponse = new Response(response.body, response);
            const pathSegments = url.pathname.split('/').filter(Boolean);
            
            if (pathSegments.length >= 3 && pathSegments[0] === 'movie') {
                const sourceId = pathSegments[1];
                const slug = pathSegments[2];
                const ep = url.searchParams.get('ep');
                
                let movieName = '';
                let description = 'Xem phim, Đọc truyên tranh, tiểu thuyết trực tuyến';
                let posterUrl = 'https://i.ibb.co/TqNn8by1/3in1.gif?q=80&w=1200&auto=format&fit=crop';

                if (sourceId === 'kkphim') {
                    const res = await fetch(`https://phimapi.com/phim/${slug}`).then(r => r.json() as any);
                    if (res?.movie) {
                        movieName = res.movie.name;
                        if (res.movie.origin_name && res.movie.origin_name !== res.movie.name) {
                            movieName += ` (${res.movie.origin_name})`;
                        }
                        if (ep) {
                            const epName = ep.replace(/-/g, ' ').replace(/^tap/i, 'Tập');
                            movieName = `Đang xem ${epName} - ${movieName}`;
                        }
                        description = res.movie.content?.replace(/<[^>]*>?/gm, '').substring(0, 200) || description;
                        posterUrl = res.movie.poster_url || res.movie.thumb_url;
                        if (posterUrl && !posterUrl.startsWith('http')) posterUrl = `https://phimimg.com/${posterUrl}`;
                    }
                } else if (sourceId === 'thepy') {
                    let epName = ep ? ep.replace(/-/g, ' ').replace(/^tap/i, 'Tập') : '';
                    movieName = epName ? `Đang xem ${epName} - Phim ${slug.replace(/-/g, ' ')}` : `Phim ${slug.replace(/-/g, ' ')}`;
                }
                
                if (movieName) {
                    // @ts-ignore
                    return new HTMLRewriter()
                        .on('title, meta', new OGRewriter({
                            'og:title': movieName,
                            'twitter:title': movieName,
                            'og:description': description,
                            'twitter:description': description,
                            'og:image': posterUrl,
                            'twitter:image': posterUrl,
                            'og:url': url.toString()
                        }, movieName))
                        .transform(clonedResponse);
                }
            }
            
            return clonedResponse;
        } catch (e: any) {
            return new Response(`Worker Error: ${e.message}\n${e.stack}`, { status: 500 });
        }
    }
}
