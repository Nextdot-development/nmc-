import { useState } from 'react';
import { PrintIcon } from './Icons.jsx';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

const statusTone = (status = '') => {
  const s = status.toLowerCase();
  if (s.startsWith('compliant')) return 'ok';
  if (s.includes('review')) return 'warn';
  return 'bad';
};

const scoreTone = (score) => (score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'bad');

const ScoreRing = ({ score }) => {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring ring--${scoreTone(value)}`} role="img" aria-label={`Compliance score ${value} out of 100`}>
      <svg viewBox="0 0 120 120" width="132" height="132">
        <circle cx="60" cy="60" r={r} className="ring__track" />
        <circle cx="60" cy="60" r={r} className="ring__value" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="ring__label"><strong>{value}</strong><span>/ 100</span></div>
    </div>
  );
};

// Split "1. foo 2. bar" style strings into list items
const toPoints = (text = '') => {
  const parts = String(text).split(/\s*(?:^|\n|\s)(?=\d+\.\s)/).map((p) => p.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return parts.length ? parts : [String(text)];
};

const Violation = ({ v, index }) => {
  const sev = SEVERITY_ORDER.includes(v.severity) ? v.severity : 'Medium';
  const translation = v.englishTranslation && v.englishTranslation.trim() !== (v.problematicContent || '').trim()
    ? v.englishTranslation : '';
  return (
    <article className={`violation violation--${sev.toLowerCase()}`}>
      <header className="violation__head">
        <span className="violation__num">{String(index + 1).padStart(2, '0')}</span>
        <span className={`sev sev--${sev.toLowerCase()}`}>{sev}</span>
        <h4>{v.regulation}</h4>
      </header>
      {v.description && <p className="violation__desc">{v.description}</p>}
      {v.problematicContent && (
        <blockquote className="quote">
          <span className="quote__label">Flagged content</span>
          “{v.problematicContent}”
          {translation && <span className="quote__translation">English: {translation}</span>}
        </blockquote>
      )}
      <div className="fixes">
        {v.suggestion && (
          <div>
            <h5>What to change</h5>
            <ol>{toPoints(v.suggestion).map((p, i) => <li key={i}>{p}</li>)}</ol>
          </div>
        )}
        {v.solution && (
          <div>
            <h5>Compliant rewrite</h5>
            <ol>{toPoints(v.solution).map((p, i) => <li key={i}>{p}</li>)}</ol>
          </div>
        )}
      </div>
    </article>
  );
};

export default function AuditResult({ result, onReset, meta }) {
  const [showText, setShowText] = useState(false);
  const violations = [...(result?.violations || [])].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  const counts = SEVERITY_ORDER.map((s) => [s, violations.filter((v) => v.severity === s).length]);
  const tone = statusTone(result?.status);

  return (
    <section className="result" aria-live="polite">
      <div className="result__hero card">
        <ScoreRing score={result?.score} />
        <div className="result__headline">
          <span className={`pill pill--${tone}`}>{result?.status || 'Result'}</span>
          {meta && <p className="result__meta">{meta}</p>}
          <p className="result__summary">{result?.summary}</p>
          <div className="result__counts">
            {counts.map(([s, n]) => (
              <span key={s} className={`count sev--${s.toLowerCase()} ${n ? '' : 'count--zero'}`}>{n} {s}</span>
            ))}
          </div>
        </div>
        <div className="result__actions no-print">
          <button type="button" className="btn btn--ghost" onClick={() => window.print()}><PrintIcon /> Save as PDF</button>
          {onReset && <button type="button" className="btn btn--primary" onClick={onReset}>New audit</button>}
        </div>
      </div>

      <div className="result__grid">
        <div className="card stat">
          <h3>Penalty risk</h3>
          <span className={`pill pill--${{ High: 'bad', Medium: 'warn', Low: 'ok', None: 'ok' }[result?.financialPenalty?.riskLevel] || 'warn'}`}>
            {result?.financialPenalty?.riskLevel || '—'}
          </span>
          <p>{result?.financialPenalty?.description}</p>
        </div>
        <div className="card stat">
          <h3>Ethical marketing</h3>
          <span className={`pill pill--${scoreTone(result?.ethicalMarketing?.score ?? 0)}`}>
            {result?.ethicalMarketing?.score ?? '—'} / 100
          </span>
          <p>{result?.ethicalMarketing?.assessment}</p>
        </div>
      </div>

      <div className="section-head">
        <h3>{violations.length ? `${violations.length} issue${violations.length > 1 ? 's' : ''} found` : 'No violations found'}</h3>
        {violations.length > 0 && <p className="muted">Sorted by severity. Each issue cites the NMC / IMC clause it breaks.</p>}
      </div>
      {violations.length === 0 && (
        <div className="card empty">This content did not break any rule in the NMC rule pack.</div>
      )}
      <div className="violations">
        {violations.map((v, i) => <Violation key={i} v={v} index={i} />)}
      </div>

      {result?.transcription && (
        <div className="card transcript">
          <button type="button" className="link-btn" onClick={() => setShowText(!showText)} aria-expanded={showText}>
            {showText ? 'Hide' : 'Show'} the text we audited
          </button>
          {showText && <pre>{result.transcription}</pre>}
        </div>
      )}
    </section>
  );
}
