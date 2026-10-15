import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ArrowRightIcon, CheckCircleIcon, LockIcon, SparkIcon } from './Icons.jsx';

const MAX = 2000;
const SAMPLES = [
  ['Hinglish hair clinic', 'Delhi ka No.1 hair clinic! 100% guaranteed hair regrowth sirf 30 din mein. Diwali offer: flat 50% off, abhi call karein. 5000+ happy patients.'],
  ['English dental ad', 'Smile Dental Care — Patna’s best dentist. Painless root canal guaranteed in one sitting. Free consultation + 40% off on teeth whitening this week only!'],
  ['Hindi skin clinic', 'डॉ. शर्मा स्किन क्लिनिक – मुंहासों का पक्का इलाज, जड़ से खत्म! पहली विज़िट मुफ़्त। अभी कॉल करें।'],
];
const STEPS = ['Reading your ad', 'Checking 160 NMC rules', 'Writing fixes'];
const SEV = ['Critical', 'High', 'Medium', 'Low'];
const tone = (s) => (s >= 80 ? 'ok' : s >= 50 ? 'warn' : 'bad');

const Ring = ({ score }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <span className={`tring tring--${tone(score)}`}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} className="tring__track" />
        <circle cx="40" cy="40" r={r} className="tring__value" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <b>{score}</b>
    </span>
  );
};

const TryResult = ({ result, signupHref }) => {
  const issues = [...(result.violations || [])].sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity));
  const locked = result.planGate?.lockedFixes || 0;
  return (
    <div className="tresult" aria-live="polite">
      <div className="tresult__head">
        <Ring score={Math.round(Number(result.score) || 0)} />
        <div>
          <span className={`status status--${tone(result.score)}`}>{result.status}</span>
          {result.language && <span className="lang-badge">{result.language}</span>}
          <p>{result.summary}</p>
        </div>
      </div>

      {issues.length === 0 && <p className="tresult__clean"><CheckCircleIcon /> No NMC rule issues found in this text.</p>}
      <ol className="tresult__issues">
        {issues.map((v, i) => (
          <li key={i} className={`tissue tissue--${(v.severity || 'medium').toLowerCase()}`} style={{ '--i': i }}>
            <div className="tissue__head">
              <span className={`sev sev--${(v.severity || 'medium').toLowerCase()}`}>{v.severity}</span>
              <strong>{v.regulation}</strong>
            </div>
            <p className="tissue__bad"><b>✕ This line</b> “{v.originalLine || v.problematicContent}”</p>
            {v.locked ? (
              <Link to={signupHref} className="tissue__locked"><LockIcon width={15} height={15} /> Sign up free to see the compliant rewrite</Link>
            ) : v.compliantLine ? (
              <p className="tissue__good"><b>✓ Replace with</b> “{v.compliantLine}”</p>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="tresult__cta">
        <div>
          <strong>{locked ? `${locked} more fix${locked > 1 ? 'es are' : ' is'} ready for you.` : 'Like what you see?'}</strong>
          <span>Create a free account — 3 audits, posters and images, and your audit history.</span>
        </div>
        <Link to={signupHref} className="lbtn lbtn--navy">Create free account <ArrowRightIcon width={18} height={18} /></Link>
      </div>
    </div>
  );
};

export default function TryAudit({ signupHref }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (!busy) return undefined;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 7000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const run = async (e) => {
    e.preventDefault();
    if (busy || text.trim().length < 20) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.tryAudit({ text: text.trim() }));
    } catch (err) {
      setError({ text: err.message, limit: ['TRY_USED', 'TRY_BUSY'].includes(err.code) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="try" className="ltry">
      <div className="ltry__head reveal">
        <span className="lkicker">TRY IT FREE</span>
        <h2>Check one ad right now — no sign-up</h2>
        <p>Paste your ad text, or pick a sample. You’ll see the score, every issue and the exact lines to change.</p>
      </div>

      <form className="ltry__box reveal" onSubmit={run}>
        <div className="ltry__samples">
          <span>Try a sample:</span>
          {SAMPLES.map(([label, sample]) => (
            <button key={label} type="button" className={text === sample ? 'is-on' : ''} onClick={() => { setText(sample); setError(null); }}>{label}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} rows={4}
          placeholder="Paste your ad, post caption or video script here…" aria-label="Ad text to check" />
        <div className="ltry__bar">
          <small>{text.length} / {MAX} · 1 free audit per day · same text again is instant</small>
          <button className="lbtn lbtn--navy" disabled={busy || text.trim().length < 20}>
            <SparkIcon width={18} height={18} /> {busy ? 'Checking…' : 'Check for free'}
          </button>
        </div>
        {busy && (
          <div className="ltry__progress" aria-live="polite">
            <span className="ltry__track"><i /></span>
            <ol>{STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'active' : ''}>{s}</li>)}</ol>
            <small>This takes about 30–60 seconds.</small>
          </div>
        )}
        {error && (
          <p className="alert" role="alert">
            {error.text} {error.limit && <Link to={signupHref} className="alert__link">Create free account →</Link>}
          </p>
        )}
      </form>

      <div ref={resultRef}>{result && <TryResult result={result} signupHref={signupHref} />}</div>
    </section>
  );
}
