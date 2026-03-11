import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH
  ?? path.resolve(import.meta.dirname, '../../store/messages.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

// --- Types (mirrored from NanoClaw src/types.ts) ---

export interface RegisteredGroupRow {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern: string;
  added_at: string;
  container_config: string | null;
  requires_trigger: number | null;
  is_main: number | null;
}

export interface MessageRow {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: number;
  is_bot_message: number;
}

export interface TaskRow {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  context_mode: string;
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
  status: string;
  created_at: string;
}

export interface TaskRunLogRow {
  id: number;
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result: string | null;
  error: string | null;
}

export interface ChatRow {
  jid: string;
  name: string;
  last_message_time: string;
  channel: string | null;
  is_group: number;
}

// --- Query functions ---

export function getGroups(): RegisteredGroupRow[] {
  return getDb()
    .prepare('SELECT * FROM registered_groups ORDER BY added_at DESC')
    .all() as RegisteredGroupRow[];
}

export function getMessages(
  jid: string,
  before: string | undefined,
  limit: number = 50,
): MessageRow[] {
  if (before) {
    return getDb()
      .prepare(
        `SELECT * FROM (
          SELECT * FROM messages WHERE chat_jid = ? AND timestamp < ?
          ORDER BY timestamp DESC LIMIT ?
        ) ORDER BY timestamp ASC`,
      )
      .all(jid, before, limit) as MessageRow[];
  }
  return getDb()
    .prepare(
      `SELECT * FROM (
        SELECT * FROM messages WHERE chat_jid = ?
        ORDER BY timestamp DESC LIMIT ?
      ) ORDER BY timestamp ASC`,
    )
    .all(jid, limit) as MessageRow[];
}

export function getTasks(): TaskRow[] {
  return getDb()
    .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
    .all() as TaskRow[];
}

export function getTaskRunLogs(taskId: string): TaskRunLogRow[] {
  return getDb()
    .prepare('SELECT * FROM task_run_logs WHERE task_id = ? ORDER BY run_at DESC LIMIT 50')
    .all(taskId) as TaskRunLogRow[];
}

export function getChats(): ChatRow[] {
  return getDb()
    .prepare(`SELECT * FROM chats WHERE jid != '__group_sync__' ORDER BY last_message_time DESC`)
    .all() as ChatRow[];
}
