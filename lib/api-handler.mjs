export function endpoint(action) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) allowed.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    if (process.env.VERCEL_URL) allowed.push(`https://${process.env.VERCEL_URL}`);
    // Accept the page calling its own HTTPS API, including deployment and custom domains.
    // Do not trust forwarded-host headers or allow every *.vercel.app origin.
    const sameOrigin = typeof req.headers.host === 'string' && origin === `https://${req.headers.host}`;
    if (origin && !sameOrigin && !allowed.includes(origin)) return res.status(403).json({ error: '허용되지 않은 출처입니다.' });
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).end();
    }
    try { await action(req, res); }
    catch (error) { res.status(error.status === 404 ? 404 : 503).json({ error: error.message }); }
  };
}
