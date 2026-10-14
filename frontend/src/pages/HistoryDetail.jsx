import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import AuditResult from '../components/AuditResult.jsx';
import { formatDate } from './History.jsx';

export default function HistoryDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const [item, setItem] = useState(state?.item || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) return;
    api.auditById(id).then((auditResult) => setItem({ auditResult })).catch((err) => setError(err.message));
  }, [id, item]);

  const meta = item?.createdAt
    ? `Audited ${formatDate(item.createdAt)}${item.originalInput ? ` · ${item.originalInput.slice(0, 80)}` : ''}`
    : '';

  return (
    <div className="page">
      <Link to="/history" className="back no-print">← All audits</Link>
      {error && <p className="alert alert--error">{error}</p>}
      {!item && !error && <div className="card skeleton">Loading…</div>}
      {item && <AuditResult result={item.auditResult || item} meta={meta} />}
    </div>
  );
}
