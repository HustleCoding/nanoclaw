import { useState, useEffect } from 'react';
import { apiFetch, apiPost } from '../api-client';

interface Integration {
  id: string;
  name: string;
  enabled: boolean;
  detail?: string;
}

interface Status {
  running: boolean;
  pid: number | null;
  uptime: number | null;
  connectedChannels: string[];
  authMode: string;
  authLabel: string;
  integrations: Integration[];
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
      <h2>Status</h2>

      {/* Stat strip */}
      <div className="stat-row">
        <div className="stat-item">
          <span className="stat-label">Service</span>
          <span className={`badge ${status.running ? 'badge-green' : 'badge-red'}`}>
            {status.running ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">PID</span>
          <span className="stat-value mono">{status.pid ?? '—'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Uptime</span>
          <span className="stat-value">
            {status.uptime !== null ? formatUptime(status.uptime) : '—'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Auth</span>
          <span className={`badge ${status.authMode === 'oauth' ? 'badge-green' : status.authMode === 'api-key' ? 'badge-yellow' : 'badge-red'}`}>
            {status.authLabel}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Channels</span>
          <span className="stat-value" style={{ fontSize: '0.875rem' }}>
            {status.connectedChannels.length > 0
              ? status.connectedChannels.join(', ')
              : '—'}
          </span>
        </div>
      </div>

      {/* Integrations */}
      <div className="integrations-section">
        <h3>Integrations</h3>
        <div className="integrations-grid">
          {status.integrations.map((i) => (
            <div key={i.id} className="integration-item">
              <span className={`badge ${i.enabled ? 'badge-green' : 'badge-dim'}`}>
                {i.name}
              </span>
              {i.detail && <span className="integration-detail">{i.detail}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Inline controls */}
      <div className="service-controls">
        <span className="service-controls-label">Controls</span>
        {status.running ? (
          <>
            <button
              className="btn btn-warning"
              onClick={() => handleAction('restart')}
              disabled={actionPending}
            >
              {actionPending ? 'Restarting…' : 'Restart'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleAction('stop')}
              disabled={actionPending}
            >
              {actionPending ? 'Stopping…' : 'Stop'}
            </button>
          </>
        ) : (
          <button
            className="btn btn-success"
            onClick={() => handleAction('start')}
            disabled={actionPending}
          >
            {actionPending ? 'Starting…' : 'Start'}
          </button>
        )}
        {actionMessage && (
          <span className="action-message">{actionMessage}</span>
        )}
      </div>
    </div>
  );
}
