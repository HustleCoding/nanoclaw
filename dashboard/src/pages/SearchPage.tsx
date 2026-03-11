import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api-client';

interface SearchResult {
  id: string;
  chat_jid: string;
  sender_name: string;
  content: string;
  timestamp: string;
  chat_name: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const doSearch = () => {
    const q = query.trim();
    if (!q) return;
    apiFetch<SearchResult[]>(`/messages/search?q=${encodeURIComponent(q)}`)
      .then((data) => { setResults(data); setSearched(true); })
      .catch(console.error);
  };

  return (
    <div>
      <h2>Search Messages</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        placeholder="Search messages... (press Enter)"
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text)',
          fontSize: '0.875rem',
        }}
        autoFocus
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Sender</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.id}
                className="clickable"
                onClick={() => navigate(`/groups/${encodeURIComponent(r.chat_jid)}`)}
              >
                <td>{r.chat_name}</td>
                <td>{r.sender_name}</td>
                <td className="truncate">{r.content}</td>
                <td className="mono" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(r.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
            {searched && results.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">No messages found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
