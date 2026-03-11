import { useState, useEffect, Fragment } from 'react';
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

function statusBadge(status: string) {
  const cls =
    status === 'active'
      ? 'badge-green'
      : status === 'paused'
      ? 'badge-yellow'
      : 'badge-grey';
  return <span className={`badge ${cls}`}>{status}</span>;
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

  return (
    <div>
      <h2>Tasks</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Prompt</th>
              <th>Schedule</th>
              <th>Next run</th>
              <th>Last run</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <Fragment key={t.id}>
                <tr
                  className="clickable"
                  onClick={() => toggleExpand(t.id)}
                >
                  <td className="mono">{t.group_folder}</td>
                  <td className="truncate">{t.prompt}</td>
                  <td className="mono">
                    {t.schedule_type}: {t.schedule_value}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {t.next_run
                      ? new Date(t.next_run).toLocaleString()
                      : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {t.last_run
                      ? new Date(t.last_run).toLocaleString()
                      : '—'}
                  </td>
                  <td>{statusBadge(t.status)}</td>
                </tr>

                {expanded === t.id && (
                  <tr key={`${t.id}-logs`}>
                    <td colSpan={6} className="task-expand-cell">
                      <div className="task-logs">
                        <div className="task-logs-title">Run history</div>
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
                                  <td style={{ color: 'var(--text-muted)' }}>
                                    {new Date(l.run_at).toLocaleString()}
                                  </td>
                                  <td className="mono">
                                    {(l.duration_ms / 1000).toFixed(1)}s
                                  </td>
                                  <td>{statusBadge(l.status)}</td>
                                  <td className="truncate">
                                    {l.error || l.result || '—'}
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
              </Fragment>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No scheduled tasks
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
