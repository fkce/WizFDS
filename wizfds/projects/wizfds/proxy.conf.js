const { URL } = require('url');

const PROXY_CONFIG = [
  {
  context: ['/api', '/logout', '/register', '/login'],
    target: 'https://fliszer.vdl.pl',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    cookieDomainRewrite: 'localhost',
    onProxyRes: function (proxyRes, req, res) {
      // Normalize redirect Location headers
      const location = proxyRes.headers['location'];
      if (location && (location.startsWith('http://') || location.startsWith('https://'))) {
        try {
          const u = new URL(location);
          // Keep the path in the same origin so the dev-server proxy will handle the follow-up request
          proxyRes.headers['location'] = u.pathname + (u.search || '') + (u.hash || '');
        } catch (e) {
          // ignore parse errors
        }
      }

      // Relax cookies so auth works on http://localhost (strip Secure; set SameSite=Lax)
      const setCookie = proxyRes.headers['set-cookie'];
      if (setCookie && Array.isArray(setCookie)) {
        proxyRes.headers['set-cookie'] = setCookie.map((c) => {
          let v = c.replace(/;\s*Secure/gi, '');
          if (/;\s*SameSite=/i.test(v)) {
            v = v.replace(/;\s*SameSite=[^;]*/i, '; SameSite=Lax');
          } else {
            v = v + '; SameSite=Lax';
          }
          return v;
        });
      }
    }
  }
];

module.exports = PROXY_CONFIG;
