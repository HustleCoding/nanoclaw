import { Router } from 'express';
import { getMessages } from '../db.js';
const router = Router();
router.get('/:jid', (req, res) => {
    const jid = decodeURIComponent(req.params.jid);
    const before = req.query.before;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const messages = getMessages(jid, before, limit);
    res.json(messages);
});
export default router;
