import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ChevronIcon } from '../components/Icons.jsx';

const TYPE_LABEL = { text: 'Text', url: 'URL', webpage: 'Web page', image: 'Image', video: 'Video', audio: 'Audio', document: 'Document' };

const tone = (status = '') => {
  const s = status.toLowerCase();
  if (s.startsWith('compliant')) return 'ok';
  if (s.includes('review')) return 'warn';
  return 'bad';
};

export const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function History() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.history().then((res) => setItems(Array.isArray(res) ? res : [])).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">History</p>
        <h1>Your past <em>audits</em>.</h1>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {!items && !error && <div className="card skeleton">Loading…</div>}
      {items && items.length === 0 && (
        <div className="card empty">No audits yet. <Link to="/">Run your first audit →</Link></div>
      )}

      {items && items.length > 0 && (
        <ul className="history">
          {items.map((item) => {
            const r = item.auditResult || item;
            const violations = r.violations?.length || 0;
            return (
              <li key={item._id}>
                <Link to={`/history/${item._id}`} state={{ item }} className="card history__item">
                  <span className={`history__score score--${tone(r.status)}`}>{Math.round(Number(r.score) || 0)}</span>
                  <div className="history__main">
                    <div className="history__meta">
                      <span className="tag">{TYPE_LABEL[item.contentType] || 'Audit'}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="history__input">{item.originalInput || r.summary || 'Audit'}</p>
                    <p className="muted">{r.status} · {violations} issue{violations === 1 ? '' : 's'}</p>
                  </div>
                  <ChevronIcon />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
