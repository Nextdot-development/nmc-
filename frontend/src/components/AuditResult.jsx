import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrintIcon, SparkIcon } from './Icons.jsx';
import { StatusPill, statusTone } from '../pages/History.jsx';
import { labelsFor } from '../reportLabels.js';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const scoreTone = (score) => (score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'bad');

const ScoreRing = ({ score }) => {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring ring--${scoreTone(value)}`} role="img" aria-label={`Compliance score ${value} out of 100`}>
      <svg viewBox="0 0 120 120" width="140" height="140">
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

const CopyButton = ({ text, label = 'Copy', doneLabel = 'Copied ✓' }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  return <button type="button" className="ghost-btn ghost-btn--sm no-print" onClick={copy}>{done ? doneLabel : label}</button>;
};

const Violation = ({ v, index, L }) => {
  const sev = SEVERITY_ORDER.includes(v.severity) ? v.severity : 'Medium';
  const original = v.originalLine || v.problematicContent || '';
  const translation = v.englishTranslation && v.englishTranslation.trim() !== original.trim() ? v.englishTranslation : '';
  const removeOnly = /^\[?remove this line\]?$/i.test((v.compliantLine || '').trim());
  return (
    <article id={`issue-${index + 1}`} className={`violation violation--${sev.toLowerCase()}`}>
      <header className="violation__head">
        <span className="violation__num">{String(index + 1).padStart(2, '0')}</span>
        <span className={`sev sev--${sev.toLowerCase()}`}>{sev}</span>
        <h4>{v.regulation}</h4>
      </header>
      {v.description && <p className="violation__desc">{v.description}</p>}

      {original && (
        <div className="linefix">
          <div className="linefix__row linefix__row--bad">
            <span className="linefix__tag">{L.thisLine}</span>
            <p>“{original}”</p>
            {translation && <small>{L.english}: {translation}</small>}
          </div>
          {v.compliantLine && (
            <div className="linefix__row linefix__row--good">
              <span className="linefix__tag">{removeOnly ? L.fix : L.replaceWith}</span>
              <p>{removeOnly ? L.removeLine : `“${v.compliantLine}”`}</p>
              {!removeOnly && <CopyButton text={v.compliantLine} label={L.copy} />}
            </div>
          )}
        </div>
      )}

      <div className="fixes">
        {v.suggestion && (
          <div>
            <h5>{L.whyFails}</h5>
            <ol>{toPoints(v.suggestion).map((p, i) => <li key={i}>{p}</li>)}</ol>
          </div>
        )}
        {v.solution && (
          <div>
            <h5><SparkIcon width={14} height={14} /> {L.howToFix}</h5>
            <ol>{toPoints(v.solution).map((p, i) => <li key={i}>{p}</li>)}</ol>
          </div>
        )}
      </div>
    </article>
  );
};

const SOURCE_LABEL = {
  video: 'VIDEO TRANSCRIPT',
  audio: 'AUDIO TRANSCRIPT',
  image: 'TEXT FOUND IN IMAGE',
  document: 'DOCUMENT TEXT',
  webpage: 'PAGE TEXT',
  url: 'PAGE TEXT',
  text: 'AUDITED TEXT',
};

const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Locate each flagged phrase in the source text. AI quotes may skip parts with "..."
// and join lines with spaces, so match whitespace loosely.
const findRanges = (text, violations) => {
  const ranges = [];
  violations.forEach((v, i) => {
    String(v.problematicContent || '')
      .split(/\.{3}|…/)
      .map((part) => part.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim())
      .filter((part) => part.length >= 6)
      .forEach((part) => {
        const re = new RegExp(escapeRegex(part).replace(/\s+/g, '\\s+'), 'i');
        const m = re.exec(text);
        if (m) ranges.push({ start: m.index, end: m.index + m[0].length, num: i + 1, sev: (v.severity || 'Medium').toLowerCase() });
      });
  });
  // A quote covering most of the text says nothing specific; drop it if narrower ones exist
  const specific = ranges.filter((r) => r.end - r.start <= text.length * 0.6);
  return specific.length ? specific : ranges;
};

// Split text at range boundaries; each piece lists the issues covering it
const HighlightedText = ({ text, violations }) => {
  const ranges = findRanges(text, violations);
  const cuts = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
  const out = [];
  for (let k = 0; k < cuts.length - 1; k += 1) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    const piece = text.slice(a, b);
    const covering = ranges.filter((r) => r.start <= a && r.end >= b);
    if (!covering.length) { out.push(piece); continue; }
    const sev = covering.map((r) => r.sev).sort((x, y) => (SEV_RANK[x] ?? 2) - (SEV_RANK[y] ?? 2))[0];
    const nums = [...new Set(covering.map((r) => r.num))].sort((x, y) => x - y);
    const ending = [...new Set(covering.filter((r) => r.end === b).map((r) => r.num))].sort((x, y) => x - y);
    out.push(
      <a key={k} href={`#issue-${nums[0]}`} className={`hl hl--${sev}`} title={`Issue ${nums.join(', ')}`}>
        {piece}{ending.length > 0 && <sup>{ending.join(',')}</sup>}
      </a>
    );
  }
  return { nodes: out, count: ranges.length };
};

const SourceText = ({ data, violations = [] }) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const label = SOURCE_LABEL[data.type] || 'AUDITED TEXT';
  if (!data.available) {
    return (
      <div className="panel transcript-box transcript-box--missing">
        <h3 className="kicker">{label}</h3>
        <p>{data.type === 'video'
          ? 'No transcript could be obtained for this video, so only its title and description were audited. Upload the video file (Video option) to audit what is actually said.'
          : 'No readable text could be extracted from this content.'}</p>
      </div>
    );
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([data.text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const highlighted = HighlightedText({ text: data.text, violations });
  return (
    <div className="panel transcript-box">
      <div className="transcript-box__head">
        <h3 className="kicker">{label}</h3>
        <span className="muted small">{Number(data.chars).toLocaleString('en-IN')} characters</span>
        <div className="transcript-box__actions no-print">
          <button type="button" className="ghost-btn ghost-btn--sm" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          <button type="button" className="ghost-btn ghost-btn--sm" onClick={download}>Download .txt</button>
          <button type="button" className="ghost-btn ghost-btn--sm ghost-btn--primary"
            onClick={() => navigate('/', { state: { prefill: data.text, nonce: Date.now() } })}>Audit this text again</button>
        </div>
      </div>
      {highlighted.count > 0 && (
        <p className="muted small transcript-box__legend">Highlighted lines were flagged in this audit — click one to jump to its issue.</p>
      )}
      <div className="transcript-box__text">{highlighted.nodes}</div>
    </div>
  );
};

export default function AuditResult({ result, onReset, onFresh, meta }) {
  const [showText, setShowText] = useState(false);
  const violations = [...(result?.violations || [])].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  const counts = SEVERITY_ORDER.map((s) => [s, violations.filter((v) => v.severity === s).length]);
  const risk = result?.financialPenalty?.riskLevel;
  const L = labelsFor(result?.language);
  // Older audits only carry the YouTube transcript
  const source = result?.sourceText || (result?.videoTranscript ? { type: 'video', ...result.videoTranscript } : null);

  return (
    <section className="result" aria-live="polite">
      <div className={`panel panel--glow result__hero result__hero--${statusTone(result?.status)}`}>
        <ScoreRing score={result?.score} />
        <div className="result__headline">
          <span className="kicker">{L.auditResult}</span>
          <StatusPill status={result?.status} />
          {meta && <p className="result__meta">{meta}</p>}
          {result?.language && <span className="lang-badge">{L.language}: {result.language}</span>}
          <p className="result__summary">{result?.summary}</p>
          {result?.reused && (
            <p className="reused">
              This exact content was audited on {new Date(result.reused.auditedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — showing the same result so it stays consistent.
              {onFresh && <button type="button" className="link-btn" onClick={onFresh}>Re-audit fresh</button>}
            </p>
          )}
          {result?.coverage && (
            <p className="coverage">
              Checked <b>{result.coverage.percent}%</b> of this page's text ({Number(result.coverage.auditedChars).toLocaleString('en-IN')} characters, menus removed).
              Only this one page was audited — other pages of the website are not included.
            </p>
          )}
          <div className="result__counts">
            {counts.map(([s, n]) => (
              <span key={s} className={`sev sev--${s.toLowerCase()} ${n ? '' : 'sev--zero'}`}>{n} {s}</span>
            ))}
          </div>
        </div>
        <div className="result__actions no-print">
          <button type="button" className="ghost-btn" onClick={() => window.print()}><PrintIcon width={18} height={18} /> Save as PDF</button>
          {onReset && <button type="button" className="run-btn run-btn--sm" onClick={onReset}>New audit</button>}
        </div>
      </div>

      <div className="result__grid">
        <div className="panel stat">
          <h3 className="kicker">{L.penalty}</h3>
          <span className={`status status--${{ High: 'bad', Medium: 'warn', Low: 'ok', None: 'ok' }[risk] || 'warn'}`}>{risk || '—'}</span>
          <p>{result?.financialPenalty?.description}</p>
        </div>
        <div className="panel stat">
          <h3 className="kicker">{L.ethical}</h3>
          <span className={`status status--${scoreTone(result?.ethicalMarketing?.score ?? 0)}`}>{result?.ethicalMarketing?.score ?? '—'} / 100</span>
          <p>{result?.ethicalMarketing?.assessment}</p>
        </div>
      </div>

      <div className="section-head">
        <h3>{violations.length ? L.issuesFound(violations.length) : L.noViolations}</h3>
        {violations.length > 0 && <p className="muted small">{L.sorted}</p>}
      </div>
      {violations.length === 0 && <div className="panel empty">This content did not break any rule in the NMC rule pack.</div>}
      <div className="violations">
        {violations.map((v, i) => <Violation key={i} v={v} index={i} L={L} />)}
      </div>

      {result?.compliantVersion && violations.length > 0 && (
        <div className="panel compliant-version">
          <div className="transcript-box__head">
            <h3 className="kicker">{L.compliantVersion}</h3>
            <div className="transcript-box__actions"><CopyButton text={result.compliantVersion} label={L.copyFull} /></div>
          </div>
          <div className="compliant-version__text">{result.compliantVersion}</div>
        </div>
      )}

      {source && <SourceText data={source} violations={violations} />}

      {!source && result?.transcription && (
        <div className="panel transcript">
          <button type="button" className="link-btn" onClick={() => setShowText(!showText)} aria-expanded={showText}>
            {showText ? 'Hide' : 'Show'} the text we audited
          </button>
          {showText && <pre>{result.transcription}</pre>}
        </div>
      )}
    </section>
  );
}
