import { HighlightedText, SOURCE_LABEL, SourceText } from './AuditResult.jsx';
import { CheckCircleIcon, LockIcon } from './Icons.jsx';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

// Shown under the audit box: steps, the full text being audited with flagged lines
// highlighted as they are found, and each finding as it arrives.
export default function LivePanel({ live, result, format }) {
  if (!live) return null;
  const done = Boolean(result);
  const label = SOURCE_LABEL[format === 'url' ? 'url' : format] || 'AUDITED TEXT';

  // Once finished, show the saved full text with the final findings (numbers match the report)
  if (done) {
    const source = result.sourceText || (result.videoTranscript ? { type: 'video', ...result.videoTranscript } : null);
    const violations = [...(result.violations || [])].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
    return (
      <section className="live live--done" aria-live="polite">
        <p className="live__status live__status--done"><CheckCircleIcon width={18} height={18} /> Audit complete · {violations.length} issue{violations.length === 1 ? '' : 's'} found</p>
        {source && <SourceText data={source} violations={violations} />}
      </section>
    );
  }

  const findings = live.findings;
  return (
    <section className="live panel" aria-live="polite">
      <div className="live__head">
        <span className="live__spinner" aria-hidden="true" />
        <strong>{live.stage || 'Starting…'}</strong>
        {findings.length > 0 && <span className="live__count">{findings.length} issue{findings.length === 1 ? '' : 's'} so far</span>}
      </div>
      {live.done.length > 0 && (
        <ol className="live__steps">
          {live.done.map((s, i) => <li key={i}><CheckCircleIcon width={14} height={14} /> {s.replace(/…$/, '')}</li>)}
        </ol>
      )}

      <div className="live__source">
        <div className="live__sourcehead">
          <h3 className="kicker">{label}</h3>
          {live.source && <span className="muted small">{live.source.length.toLocaleString('en-IN')} characters</span>}
        </div>
        {live.source ? (
          <div className="transcript-box__text live__text">
            {HighlightedText({ text: live.source, violations: findings, anchor: 'live-issue' }).nodes}
          </div>
        ) : (
          <div className="live__waiting">
            <span /><span /><span />
            <small>{format === 'video' || format === 'audio' || /youtu/i.test(live.url || '')
              ? 'The full transcript will appear here as soon as it is ready.'
              : 'The text will appear here in a moment.'}</small>
          </div>
        )}
      </div>

      {findings.length > 0 && (
        <ol className="live__findings">
          {findings.map((f, i) => {
            const sev = (f.severity || 'Medium').toLowerCase();
            return (
              <li key={i} id={`live-issue-${i + 1}`} className={`live__finding live__finding--${sev}`}>
                <div className="live__findinghead">
                  <span className="violation__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`sev sev--${sev}`}>{f.severity}</span>
                  <span className="live__rule">{f.regulation}</span>
                </div>
                <p className="live__bad">✕ “{f.originalLine || f.problematicContent}”</p>
                {f.locked
                  ? <p className="live__locked"><LockIcon width={14} height={14} /> Compliant rewrite available on a paid plan</p>
                  : f.compliantLine && <p className="live__good">✓ “{f.compliantLine}”</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
