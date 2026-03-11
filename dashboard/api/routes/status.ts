import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getChats } from '../db.js';

const router = Router();

const STORE_DIR = process.env.STORE_DIR
  ?? path.resolve(import.meta.dirname, '../../../store');

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

router.get('/', (_req, res) => {
  const pidFile = path.join(STORE_DIR, 'nanoclaw.pid');
  let running = false;
  let pid: number | null = null;
  let uptime: number | null = null;

  try {
    const pidStr = fs.readFileSync(pidFile, 'utf-8').trim();
    pid = parseInt(pidStr, 10);
    running = isProcessRunning(pid);
    if (running) {
      const stat = fs.statSync(pidFile);
      uptime = Math.floor((Date.now() - stat.mtimeMs) / 1000);
    }
  } catch {
    running = false;
  }

  // Get connected channels from recent chat activity
  const chats = getChats();
  const channelSet = new Set<string>();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const chat of chats) {
    if (chat.channel && chat.last_message_time > cutoff) {
      channelSet.add(chat.channel);
    }
  }

  res.json({
    running,
    pid,
    uptime,
    connectedChannels: Array.from(channelSet),
  });
});

export default router;
