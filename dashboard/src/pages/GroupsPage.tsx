import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api-client';

interface Group {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern: string;
  added_at: string;
  requires_trigger: number | null;
  is_main: number | null;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<Group[]>('/groups').then(setGroups).catch(console.error);
  }, []);

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
              <th>Trigger</th>
              <th>Mode</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr
                key={g.jid}
                className="clickable"
                onClick={() => navigate(`/groups/${encodeURIComponent(g.jid)}`)}
              >
                <td>{g.name}</td>
                <td className="mono">{g.jid}</td>
                <td className="mono">{g.folder}</td>
                <td className="mono">{g.trigger_pattern}</td>
                <td>
                  {g.is_main ? (
                    <span className="badge badge-green">Main</span>
                  ) : (
                    <span className="badge badge-grey">
                      {g.requires_trigger ? 'Trigger' : 'All'}
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {new Date(g.added_at).toLocaleDateString()}
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
