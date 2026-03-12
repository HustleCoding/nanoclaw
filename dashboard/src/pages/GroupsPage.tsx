import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiPost, apiPut } from '../api-client';

interface Group {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern: string;
  added_at: string;
  requires_trigger: number | null;
  is_main: number | null;
  model: string | null;
}

const MODEL_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [resetting, setResetting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<Group[]>('/groups').then(setGroups).catch(console.error);
  }, []);

  const handleModelChange = async (folder: string, model: string) => {
    try {
      await apiPut(`/groups/${encodeURIComponent(folder)}/model`, {
        model: model || null,
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.folder === folder ? { ...g, model: model || null } : g,
        ),
      );
    } catch (err) {
      console.error('Failed to update model', err);
    }
  };

  const handleResetSession = async (folder: string) => {
    if (!confirm(`Reset session for "${folder}"? This clears conversation memory but keeps tasks and settings.`)) {
      return;
    }
    setResetting(folder);
    try {
      await apiPost(`/groups/${encodeURIComponent(folder)}/reset-session`);
    } catch (err) {
      console.error('Failed to reset session', err);
    }
    setResetting(null);
  };

  return (
    <div>
      <h2>Groups</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>JID</th>
              <th>Folder</th>
              <th>Model</th>
              <th>Mode</th>
              <th>Session</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.jid}>
                <td
                  className="clickable"
                  onClick={() => navigate(`/groups/${encodeURIComponent(g.jid)}`)}
                >
                  {g.name}
                </td>
                <td className="mono" data-label="JID">{g.jid}</td>
                <td className="mono" data-label="Folder">{g.folder}</td>
                <td data-label="Model">
                  <select
                    className="model-select"
                    value={g.model || ''}
                    onChange={(e) => handleModelChange(g.folder, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Mode">
                  {g.is_main ? (
                    <span className="badge badge-green">Main</span>
                  ) : (
                    <span className="badge badge-grey">
                      {g.requires_trigger ? 'Trigger' : 'All'}
                    </span>
                  )}
                </td>
                <td data-label="Session">
                  <button
                    className="btn btn-warning"
                    onClick={(e) => { e.stopPropagation(); handleResetSession(g.folder); }}
                    disabled={resetting === g.folder}
                  >
                    {resetting === g.folder ? 'Resetting...' : 'Reset'}
                  </button>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">No groups registered</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
