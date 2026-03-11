import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getChats } from '../db.js';
const router = Router();
const STORE_DIR = process.env.STORE_DIR
    ?? path.resolve(import.meta.dirname, '../../../store');
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
router.get('/', (_req, res) => {
    const pidFile = path.join(STORE_DIR, 'nanoclaw.pid');
    let running = false;
    let pid = null;
    let uptime = null;
    try {
        const pidStr = fs.readFileSync(pidFile, 'utf-8').trim();
        pid = parseInt(pidStr, 10);
        running = isProcessRunning(pid);
        if (running) {
            const stat = fs.statSync(pidFile);
            uptime = Math.floor((Date.now() - stat.mtimeMs) / 1000);
        }
    }
    catch {
        running = false;
    }
    // Get connected channels from recent chat activity
    const chats = getChats();
    const channelSet = new Set();
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
function runSystemctl(action) {
    try {
        execSync(`systemctl --user ${action} nanoclaw`, {
            timeout: 10000,
            env: { ...process.env, XDG_RUNTIME_DIR: `/run/user/${process.getuid()}` },
        });
        return { ok: true, message: `Service ${action} successful` };
    }
    catch (err) {
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
