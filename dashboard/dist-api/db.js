import Database from 'better-sqlite3';
import path from 'path';
const DB_PATH = process.env.DB_PATH
    ?? path.resolve(import.meta.dirname, '../../store/messages.db');
let db;
export function getDb() {
    if (!db) {
        db = new Database(DB_PATH, { readonly: true });
    }
    return db;
}
// --- Query functions ---
export function getGroups() {
    return getDb()
        .prepare('SELECT * FROM registered_groups ORDER BY added_at DESC')
        .all();
}
export function getMessages(jid, before, limit = 50) {
    if (before) {
        return getDb()
            .prepare(`SELECT * FROM (
          SELECT * FROM messages WHERE chat_jid = ? AND timestamp < ?
          ORDER BY timestamp DESC LIMIT ?
        ) ORDER BY timestamp ASC`)
            .all(jid, before, limit);
    }
    return getDb()
        .prepare(`SELECT * FROM (
        SELECT * FROM messages WHERE chat_jid = ?
        ORDER BY timestamp DESC LIMIT ?
      ) ORDER BY timestamp ASC`)
        .all(jid, limit);
}
export function searchMessages(query, limit = 50) {
    return getDb()
        .prepare(`SELECT m.*, COALESCE(c.name, m.chat_jid) AS chat_name
       FROM messages m LEFT JOIN chats c ON c.jid = m.chat_jid
       WHERE m.content LIKE ?
       ORDER BY m.timestamp DESC LIMIT ?`)
        .all(`%${query}%`, limit);
}
export function getTasks() {
    return getDb()
        .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
        .all();
}
export function getTaskRunLogs(taskId) {
    return getDb()
        .prepare('SELECT * FROM task_run_logs WHERE task_id = ? ORDER BY run_at DESC LIMIT 50')
        .all(taskId);
}
export function getChats() {
    return getDb()
        .prepare(`SELECT * FROM chats WHERE jid != '__group_sync__' ORDER BY last_message_time DESC`)
        .all();
}
