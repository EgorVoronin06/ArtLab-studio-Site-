export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const apiOrigin = env.API_ORIGIN;
      if (!apiOrigin) {
        return new Response(
          JSON.stringify({
            message: 'API_ORIGIN is not configured'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          }
        );
      }

      const targetUrl = new URL(url.pathname.replace(/^\/api/, '') + url.search, apiOrigin);
      return fetch(new Request(targetUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  }
};
