import { Router } from 'express';
import { getGroups } from '../db.js';
const router = Router();
router.get('/', (_req, res) => {
    const groups = getGroups();
    res.json(groups);
});
export default router;
