import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getGroups, setGroupModel, getWriteDb } from '../db.js';

const DATA_DIR = process.env.DATA_DIR
  ?? path.resolve(import.meta.dirname, '../../../data');

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

router.post('/:folder/reset-session', (req, res) => {
  const { folder } = req.params;

  // Validate folder exists in registered_groups
  const groups = getGroups();
  const group = groups.find((g) => g.folder === folder);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Delete session transcript files
  const projectsDir = path.join(DATA_DIR, 'sessions', folder, '.claude', 'projects');
  let filesDeleted = 0;
  if (fs.existsSync(projectsDir)) {
    const walkAndDelete = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkAndDelete(fullPath);
        } else if (entry.name.endsWith('.jsonl')) {
          fs.unlinkSync(fullPath);
          filesDeleted++;
        }
      }
    };
    walkAndDelete(projectsDir);
  }

  // Clear session ID from DB
  getWriteDb().prepare('DELETE FROM sessions WHERE group_folder = ?').run(folder);

  res.json({ ok: true, filesDeleted });
});

export default router;
