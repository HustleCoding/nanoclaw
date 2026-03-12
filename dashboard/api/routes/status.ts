import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getChats } from '../db.js';

const router = Router();

const STORE_DIR = process.env.STORE_DIR
  ?? path.resolve(import.meta.dirname, '../../../store');

const ENV_PATH = path.resolve(import.meta.dirname, '../../../.env');

function detectAuthMode(): { mode: string; label: string } {
  try {
    const env = fs.readFileSync(ENV_PATH, 'utf-8');
    if (/^CLAUDE_CODE_OAUTH_TOKEN\s*=/m.test(env)) {
      return { mode: 'oauth', label: 'Max Subscription' };
    }
    if (/^ANTHROPIC_API_KEY\s*=/m.test(env)) {
      return { mode: 'api-key', label: 'API Key' };
    }
  } catch { /* no .env */ }
  return { mode: 'none', label: 'Not configured' };
}

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

  const auth = detectAuthMode();

  res.json({
    running,
    pid,
    uptime,
    connectedChannels: Array.from(channelSet),
    authMode: auth.mode,
    authLabel: auth.label,
  });
});

function runSystemctl(action: string): { ok: boolean; message: string } {
  try {
    execSync(`systemctl --user ${action} nanoclaw`, {
      timeout: 10000,
      env: { ...process.env, XDG_RUNTIME_DIR: `/run/user/${process.getuid?.() ?? 1000}` },
    });
    return { ok: true, message: `Service ${action} successful` };
  } catch (err: any) {
    return { ok: false, message: err.stderr?.toString() || err.message };
  }
}

router.post('/restart', (_req, res) => {
  const result = runSystemctl('restart');
  res.json(result);
});

router.post('/stop', (_req, res) => {
  const result = runSystemctl('stop');
  res.json(result);
});

router.post('/start', (_req, res) => {
  const result = runSystemctl('start');
  res.json(result);
});

export default router;
