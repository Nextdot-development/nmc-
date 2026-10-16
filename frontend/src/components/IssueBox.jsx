import { useState } from 'react';
import { api } from '../api.js';
import { AlertIcon, CheckCircleIcon } from './Icons.jsx';

// What went wrong, what to do next, and a one-click report to the team
export default function IssueBox({ issue }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  if (!issue) return null;

  const send = async () => {
    setState('busy');
    setError('');
    try {
      await api.reportIssue(issue.id, note.trim());
      setState('sent');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  return (
    <div className="issue panel" role="alert">
      <div className="issue__head">
        <span className="issue__icon"><AlertIcon width={20} height={20} /></span>
        <div>
          <strong>{issue.title}</strong>
          <p>{issue.message} We tried to fix this automatically.</p>
        </div>
      </div>
      {issue.tips?.length > 0 && (
        <ul className="issue__tips">{issue.tips.map((t) => <li key={t}>{t}</li>)}</ul>
      )}

      {state === 'sent' ? (
        <p className="issue__sent"><CheckCircleIcon width={16} height={16} /> Sent to our team{issue.ref ? ` · Ticket #${issue.ref}` : ''}. We'll look into it and get back to you.</p>
      ) : issue.id && (
        <div className="issue__contact">
          {open && (
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              placeholder="Anything we should know? (optional)" aria-label="Note for the team" />
          )}
          <div className="issue__actions">
            {!open && <button type="button" className="ghost-btn ghost-btn--sm" onClick={() => setOpen(true)}>Add a note</button>}
            <button type="button" className="ghost-btn ghost-btn--sm ghost-btn--primary" disabled={state === 'busy'} onClick={send}>
              {state === 'busy' ? 'Sending…' : 'Contact team'}
            </button>
            {issue.ref && <small>Ticket #{issue.ref}</small>}
          </div>
          {error && <p className="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
