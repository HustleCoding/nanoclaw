import { useState, useEffect } from 'react';
import { apiFetch } from '../api-client';

interface Status {
  running: boolean;
  pid: number | null;
  uptime: number | null;
  connectedChannels: string[];
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<Status>('/status');
      setStatus(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch status');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

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
    </div>
  );
}
