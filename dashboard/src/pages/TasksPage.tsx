import { useState, useEffect } from 'react';
import { apiFetch } from '../api-client';

interface Task {
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

interface TaskRunLog {
  id: number;
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result: string | null;
  error: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logs, setLogs] = useState<TaskRunLog[]>([]);

  useEffect(() => {
    apiFetch<Task[]>('/tasks').then(setTasks).catch(console.error);
  }, []);

  const toggleExpand = async (taskId: string) => {
    if (expanded === taskId) {
      setExpanded(null);
      return;
    }
    setExpanded(taskId);
    const data = await apiFetch<TaskRunLog[]>(`/tasks/${taskId}/logs`);
    setLogs(data);
  };

  const statusBadge = (status: string) => {
    const cls = status === 'active' ? 'badge-green' : status === 'paused' ? 'badge-yellow' : 'badge-grey';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div>
      <h2>Scheduled Tasks</h2>
      <table>
        <thead>
          <tr>
            <th>Group</th>
            <th>Prompt</th>
            <th>Schedule</th>
            <th>Next Run</th>
            <th>Last Run</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <>
              <tr
                key={t.id}
                className="clickable"
                onClick={() => toggleExpand(t.id)}
              >
                <td className="mono">{t.group_folder}</td>
                <td className="truncate">{t.prompt}</td>
                <td className="mono">{t.schedule_type}: {t.schedule_value}</td>
                <td>{t.next_run ? new Date(t.next_run).toLocaleString() : '-'}</td>
                <td>{t.last_run ? new Date(t.last_run).toLocaleString() : '-'}</td>
                <td>{statusBadge(t.status)}</td>
              </tr>
              {expanded === t.id && (
                <tr key={`${t.id}-logs`}>
                  <td colSpan={6}>
                    <div className="task-logs">
                      <h4>Run History</h4>
                      {logs.length === 0 ? (
                        <p className="empty">No runs yet</p>
                      ) : (
                        <table className="inner-table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Duration</th>
                              <th>Status</th>
                              <th>Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((l) => (
                              <tr key={l.id}>
                                <td>{new Date(l.run_at).toLocaleString()}</td>
                                <td>{(l.duration_ms / 1000).toFixed(1)}s</td>
                                <td>{statusBadge(l.status)}</td>
                                <td className="truncate">
                                  {l.error || l.result || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={6} className="empty">No scheduled tasks</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
