import { useState, useEffect } from 'react';
import { apiFetch, apiPost } from '../api-client';

interface Status {
  running: boolean;
  pid: number | null;
  uptime: number | null;
  connectedChannels: string[];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<Status>('/status');
      setStatus(data);
      setError('');
    } catch {
      setError('Failed to fetch status');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionPending(true);
    setActionMessage('');
    try {
      const result = await apiPost<{ ok: boolean; message: string }>(`/status/${action}`);
      setActionMessage(result.message);
      // Wait a moment for the service to change state, then refresh
      setTimeout(fetchStatus, 2000);
    } catch {
      setActionMessage(`Failed to ${action} service`);
    }
    setActionPending(false);
  };

  if (error) return <div className="error">{error}</div>;
  if (!status) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h2>Agent Status</h2>
      <div className="status-grid">
        <div className="card">
          <div className="card-label">Service</div>
          <div className={`badge ${status.running ? 'badge-green' : 'badge-red'}`}>
            {status.running ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="card">
          <div className="card-label">PID</div>
          <div className="card-value">{status.pid ?? '-'}</div>
        </div>
        <div className="card">
          <div className="card-label">Uptime</div>
          <div className="card-value">
            {status.uptime !== null ? formatUptime(status.uptime) : '-'}
          </div>
        </div>
        <div className="card">
          <div className="card-label">Channels</div>
          <div className="card-value">
            {status.connectedChannels.length > 0
              ? status.connectedChannels.join(', ')
              : 'None'}
          </div>
        </div>
      </div>

      <div className="controls">
        <h3>Service Controls</h3>
        <div className="control-buttons">
          {status.running ? (
            <>
              <button
                className="btn btn-warning"
                onClick={() => handleAction('restart')}
                disabled={actionPending}
              >
                {actionPending ? 'Restarting...' : 'Restart'}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction('stop')}
                disabled={actionPending}
              >
                {actionPending ? 'Stopping...' : 'Stop'}
              </button>
            </>
          ) : (
            <button
              className="btn btn-success"
              onClick={() => handleAction('start')}
              disabled={actionPending}
            >
              {actionPending ? 'Starting...' : 'Start'}
            </button>
          )}
        </div>
        {actionMessage && (
          <div className="action-message">{actionMessage}</div>
        )}
      </div>
    </div>
  );
}
