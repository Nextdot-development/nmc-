import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { BannerArt, EmptyArt } from '../components/Graphics.jsx';
import { AlertIcon, CheckCircleIcon, ChevronRightIcon, DocIcon, ImageIcon, LinkIcon, MicIcon, VideoIcon, XCircleIcon } from '../components/Icons.jsx';

export const TYPE_LABEL = { text: 'Text', url: 'URL', webpage: 'URL', image: 'Image', video: 'Video', audio: 'Audio', document: 'Document' };
const TYPE_ICON = { url: LinkIcon, webpage: LinkIcon, image: ImageIcon, video: VideoIcon, audio: MicIcon };

export const statusTone = (status = '') => {
  const s = String(status).toLowerCase();
  if (s.startsWith('compliant')) return 'ok';
  if (s.includes('review')) return 'warn';
  return 'bad';
};

export const StatusPill = ({ status, small = false }) => {
  const tone = statusTone(status);
  const Icon = tone === 'ok' ? CheckCircleIcon : tone === 'warn' ? AlertIcon : XCircleIcon;
  return (
    <span className={`status status--${tone} ${small ? 'status--small' : ''}`}>
      <Icon width={small ? 14 : 16} height={small ? 14 : 16} /> {status || 'Result'}
    </span>
  );
};

export const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function History() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.history().then((res) => setItems(Array.isArray(res) ? res : [])).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <header className="page-head banner">
        <span className="badge-live"><i /> AUDIT HISTORY</span>
        <h1>Your past <b className="grad">audits</b></h1>
        <p>Every audit you run is saved here with its score, status and full report.</p>
        <BannerArt />
      </header>

      {error && <p className="alert">{error}</p>}
      {!items && !error && <div className="panel skeleton">Loading…</div>}
      {items && items.length === 0 && (
        <div className="panel empty"><EmptyArt /><p>No audits yet. <Link to="/app">Run your first audit →</Link></p></div>
      )}

      {items && items.length > 0 && (
        <ul className="history">
          {items.map((item) => {
            const r = item.auditResult || item;
            const violations = r.violations?.length || 0;
            const Icon = TYPE_ICON[item.contentType] || DocIcon;
            return (
              <li key={item._id}>
                <Link to={`/history/${item._id}`} state={{ item }} className="panel history__item">
                  <span className="recent__icon"><Icon width={22} height={22} /></span>
                  <div className="history__main">
                    <strong>{item.originalInput || r.summary || 'Audit'}</strong>
                    <small>{TYPE_LABEL[item.contentType] || 'Audit'} • {formatDate(item.createdAt)} • {violations} issue{violations === 1 ? '' : 's'}</small>
                  </div>
                  <span className={`score-chip score-chip--${statusTone(r.status)}`}>{r.score === null || r.score === undefined ? '—' : Math.round(Number(r.score) || 0)}</span>
                  <StatusPill status={r.status} small />
                  <ChevronRightIcon className="history__chev" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
