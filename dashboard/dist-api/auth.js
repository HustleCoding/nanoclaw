const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || '';
export function authMiddleware(req, res, next) {
    if (!DASHBOARD_SECRET) {
        res.status(500).json({ error: 'DASHBOARD_SECRET not configured' });
        return;
    }
    const header = req.headers.authorization;
    if (!header || header !== `Bearer ${DASHBOARD_SECRET}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
