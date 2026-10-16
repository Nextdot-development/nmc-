import { useEffect, useState } from 'react';
import { api } from '../api.js';

const TABS = [['reported', 'Reported by users'], ['open', 'Not reported'], ['resolved', 'Resolved'], ['', 'All']];

// Team view of audits that could not be completed
export default function AdminIssues() {
  const [tab, setTab] = useState('reported');
  const [issues, setIssues] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setIssues(null);
    api.issues(tab).then(setIssues).catch((err) => { setError(err.message); setIssues([]); });
  };
  useEffect(load, [tab]);

  const resolve = async (id) => {
    await api.updateIssue(id, 'resolved');
    load();
  };

  return (
    <div className="page">
      <header className="page-head banner">
        <span className="badge-live"><i /> TEAM</span>
        <h1>Audit problems</h1>
        <p>Audits that could not read their content, with the cause the Audit Doctor found.</p>
      </header>

      <div className="chips" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id || 'all'} type="button" className={`chip ${tab === id ? 'chip--active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {error && <p className="alert">{error}</p>}
      {issues === null ? <div className="panel skeleton">Loading…</div>
        : issues.length === 0 ? <div className="panel empty"><p>Nothing here.</p></div> : (
          <ul className="issues">
            {issues.map((i) => (
              <li key={i._id} className="panel issues__item">
                <div className="issues__top">
                  <code>#{String(i._id).slice(-6).toUpperCase()}</code>
                  <span className={`issues__code issues__code--${i.code}`}>{i.code}</span>
                  <strong>{i.title}</strong>
                  <small>{new Date(i.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                </div>
                <p className="issues__meta">{i.email || 'unknown user'} · {i.contentType} · <span className="issues__input">{i.input}</span></p>
                {i.userNote && <p className="issues__note">“{i.userNote}”</p>}
                <details>
                  <summary>Technical details ({i.notes?.length || 0})</summary>
                  <ol>{(i.notes || []).map((n, k) => <li key={k}><b>{n.where}</b> · {n.code} — {n.message}</li>)}</ol>
                </details>
                {i.status !== 'resolved' && (
                  <button type="button" className="ghost-btn ghost-btn--sm" onClick={() => resolve(i._id)}>Mark resolved</button>
                )}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
