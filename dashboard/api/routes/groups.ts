import { Router } from 'express';
import { getGroups, setGroupModel } from '../db.js';

const VALID_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

const router = Router();

router.get('/', (_req, res) => {
  const groups = getGroups();
  res.json(groups);
});

router.put('/:folder/model', (req, res) => {
  const { folder } = req.params;
  const { model } = req.body;

  if (model !== null && !VALID_MODELS.includes(model)) {
    res.status(400).json({ error: `Invalid model. Valid: ${VALID_MODELS.join(', ')}` });
    return;
  }

  setGroupModel(folder, model || null);
  res.json({ ok: true, model: model || null });
});

export default router;
