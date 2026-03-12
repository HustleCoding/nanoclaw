import Database from 'better-sqlite3';
import path from 'path';
const DB_PATH = process.env.DB_PATH
    ?? path.resolve(import.meta.dirname, '../../store/messages.db');
let db;
let dbWrite;
export function getDb() {
    if (!db) {
        db = new Database(DB_PATH, { readonly: true });
    }
    return db;
}
export function getWriteDb() {
    if (!dbWrite) {
        dbWrite = new Database(DB_PATH);
    }
    return dbWrite;
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
export function getUsageSummary(since) {
    const row = getDb()
        .prepare(`SELECT
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?`)
        .get(since);
    return row;
}
export function getUsageByGroup(since) {
    return getDb()
        .prepare(`SELECT
        group_folder,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?
      GROUP BY group_folder ORDER BY total_cost DESC`)
        .all(since);
}
export function getUsageDailyTrend(since) {
    return getDb()
        .prepare(`SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?
      GROUP BY DATE(created_at) ORDER BY date DESC`)
        .all(since);
}
export function getUsageByModel(since) {
    return getDb()
        .prepare(`SELECT
        COALESCE(model, 'unknown') AS model,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?
      GROUP BY model ORDER BY total_cost DESC`)
        .all(since);
}
export function setGroupModel(folder, model) {
    getWriteDb()
        .prepare(`UPDATE registered_groups SET model = ? WHERE folder = ?`)
        .run(model, folder);
}
export function getTodos(groupFolder) {
    return getDb()
        .prepare('SELECT * FROM todos WHERE group_folder = ? ORDER BY created_at DESC')
        .all(groupFolder);
}
export function getRecentUsage(limit = 20) {
    return getDb()
        .prepare(`SELECT * FROM api_usage ORDER BY created_at DESC LIMIT ?`)
        .all(limit);
}
