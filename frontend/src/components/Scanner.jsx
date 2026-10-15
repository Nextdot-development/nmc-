import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import {
  ArrowRightIcon, CheckCircleIcon, ChevronDownIcon, DocIcon, ImageIcon, LinkIcon, LockIcon, MicIcon, TextIcon, UserIcon, VideoIcon,
} from './Icons.jsx';

const MAX = 2000;
export const SAMPLES = [
  ['Spine clinic (English)', 'Get guaranteed relief from chronic back pain in just 7 days without surgery! Visit Delhi’s No.1 spine surgeon Dr. Sharma at Apex Spine Care Clinic for 50% off your first consultation this Sunday.'],
  ['Hair clinic (Hinglish)', 'Delhi ka No.1 hair clinic! 100% guaranteed hair regrowth sirf 30 din mein. Diwali offer: flat 50% off, abhi call karein. 5000+ happy patients.'],
  ['Skin clinic (Hindi)', 'डॉ. शर्मा स्किन क्लिनिक – मुंहासों का पक्का इलाज, जड़ से खत्म! पहली विज़िट मुफ़्त। अभी कॉल करें।'],
];
const TABS = [['text', 'Text', TextIcon], ['url', 'URL', LinkIcon], ['image', 'Image', ImageIcon], ['reel', 'Reel', VideoIcon], ['audio', 'Audio', MicIcon], ['pdf', 'PDF', DocIcon]];
const TAB_NOTE = {
  url: 'Website and YouTube links',
  image: 'Posters, banners and creatives',
  reel: 'Reels and videos',
  audio: 'Podcasts and voice ads',
  pdf: 'PDF brochures and Word scripts',
};
export const PUBLISHERS = ['Doctor (Registered Practitioner)', 'Hospital / Clinic', 'Healthcare marketing agency', 'Pharma / Wellness brand'];
export const CHANNELS = ['Instagram Reel / Feed Ad', 'YouTube video', 'Facebook / Google ad', 'Website / Landing page', 'WhatsApp / SMS', 'Print / Hoarding'];
const STEPS = ['Reading your ad', 'Checking 160 NMC rules', 'Writing fixes'];

const detectLanguage = (t) => {
  if (!t.trim()) return '';
  if (/[ऀ-ॿ]/.test(t)) return 'Hindi';
  if (/\b(hai|hain|mein|karein|sirf|aur|ka|ki|ke|abhi|kar|nahi)\b/i.test(t)) return 'Hinglish';
  return 'English';
};

const Select = ({ icon: Icon, label, value, options, onChange }) => (
  <label className="scan__select">
    <span className="scan__selectlabel"><Icon width={15} height={15} /> {label}</span>
    <span className="scan__selectbox">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDownIcon width={16} height={16} />
    </span>
  </label>
);

const ShareIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
    <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
  </svg>
);

// Hero card: one free text audit without an account
export default function Scanner({ signupHref, onStart, onResult }) {
  const [tab, setTab] = useState('text');
  const [sample, setSample] = useState(0);
  const [text, setText] = useState(SAMPLES[0][1]);
  const [publisher, setPublisher] = useState(PUBLISHERS[0]);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!busy) return undefined;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 7000);
    return () => clearInterval(t);
  }, [busy]);

  const nextSample = () => {
    const n = (sample + 1) % SAMPLES.length;
    setSample(n);
    setText(SAMPLES[n][1]);
    setError(null);
  };

  const run = async (e) => {
    e.preventDefault();
    if (busy || text.trim().length < 20) return;
    setBusy(true);
    setError(null);
    onStart?.();
    try {
      onResult(await api.tryAudit({ text: text.trim(), publisher, channel }));
    } catch (err) {
      setError({ text: err.message, limit: ['TRY_USED', 'TRY_BUSY'].includes(err.code) });
    } finally {
      setBusy(false);
    }
  };

  const lang = detectLanguage(text);

  return (
    <form className="scan" onSubmit={run}>
      <div className="scan__head">
        <span className="scan__live"><i /> Interactive Compliance Scanner</span>
        <span className="scan__engine">NMC 2026 Engine</span>
      </div>

      <div className="scan__tabs" role="tablist" aria-label="Content type">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
            <Icon width={15} height={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'text' ? (
        <div className="scan__input">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} rows={4}
            placeholder="Paste your ad, caption or video script…" aria-label="Ad text to check" />
          <div className="scan__meta">
            <span>{text.length} characters{lang && ` · Detected: ${lang}`}</span>
            <button type="button" className="scan__sample" onClick={nextSample}>Try {SAMPLES[(sample + 1) % SAMPLES.length][0]} sample ↗</button>
          </div>
        </div>
      ) : (
        <div className="scan__locked">
          <LockIcon width={22} height={22} />
          <strong>{TAB_NOTE[tab]} need a free account</strong>
          <span>The free try checks text. Sign up to audit images, PDFs, videos and links — 3 audits free.</span>
          <Link to={signupHref} className="dbtn dbtn--navy dbtn--sm">Create free account <ArrowRightIcon width={16} height={16} /></Link>
        </div>
      )}

      <div className="scan__row">
        <Select icon={UserIcon} label="Who is publishing?" value={publisher} options={PUBLISHERS} onChange={setPublisher} />
        <Select icon={ShareIcon} label="Where will it appear?" value={channel} options={CHANNELS} onChange={setChannel} />
      </div>

      <button className="dbtn dbtn--navy dbtn--block" disabled={busy || tab !== 'text' || text.trim().length < 20}>
        {busy ? 'Checking…' : 'Run free compliance audit'} {!busy && <ArrowRightIcon width={18} height={18} />}
      </button>

      {busy && (
        <div className="scan__progress" aria-live="polite">
          <span className="scan__track"><i /></span>
          <ol>{STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'active' : ''}>{s}</li>)}</ol>
        </div>
      )}
      {error && (
        <p className="scan__error" role="alert">
          {error.text} {error.limit && <Link to={signupHref}>Create free account →</Link>}
        </p>
      )}

      <ul className="scan__notes">
        <li><CheckCircleIcon width={15} height={15} /> No credit card needed</li>
        <li>1 free check today, 3 more after sign-up</li>
        <li>Clause-cited result in about a minute</li>
      </ul>
    </form>
  );
}

/* ---------- Result of the free check ---------- */
const SEV = ['Critical', 'High', 'Medium', 'Low'];
const tone = (s) => (s >= 80 ? 'ok' : s >= 50 ? 'warn' : 'bad');
const riskLabel = (s) => (s >= 80 ? 'Low Risk Ad' : s >= 50 ? 'Medium Risk Ad' : 'High Risk Ad');

export const ScoreDial = ({ score }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <span className={`dial dial--${tone(score)}`}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="dial__track" />
        <circle cx="36" cy="36" r={r} className="dial__value" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <b>{score}</b>
    </span>
  );
};

export const ScanResult = ({ result, signupHref }) => {
  const issues = [...(result.violations || [])].sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity));
  const score = Math.round(Number(result.score) || 0);
  const count = (s) => issues.filter((v) => v.severity === s).length;
  const locked = issues.filter((v) => v.locked).length;
  return (
    <div className="report">
      <div className="report__top">
        <div className="report__score">
          <ScoreDial score={score} />
          <span>
            <strong className={`tone-${tone(score)}`}>{riskLabel(score)}</strong>
            <small>{result.status} with NMC 2026</small>
          </span>
        </div>
        <div className="report__chips">
          {count('Critical') > 0 && <span className="chip-c">{count('Critical')} Critical</span>}
          {count('High') > 0 && <span className="chip-h">{count('High')} High</span>}
          {count('Medium') + count('Low') > 0 && <span className="chip-m">{count('Medium') + count('Low')} Medium / Low</span>}
          {result.language && <span className="chip-l">Report in {result.language}</span>}
        </div>
      </div>
      {result.summary && <p className="report__summary">{result.summary}</p>}
      {issues.length === 0 && <p className="report__clean"><CheckCircleIcon /> No NMC rule issues found in this text.</p>}

      <ol className="report__list">
        {issues.map((v, i) => (
          <li key={i} className="finding" style={{ '--i': i }}>
            <div className="finding__head">
              <span className={`sevtag sevtag--${(v.severity || 'medium').toLowerCase()}`}>{(v.severity || 'Medium').toUpperCase()}</span>
              <code>{v.regulation}</code>
            </div>
            <div className="finding__bad">
              <b>✕ Original risky line</b>
              <s>“{v.originalLine || v.problematicContent}”</s>
            </div>
            {v.description && <p className="finding__why"><b>Why this fails:</b> {v.description}</p>}
            {v.locked ? (
              <Link to={signupHref} className="finding__locked"><LockIcon width={15} height={15} /> Sign up free to see the approved compliant alternative</Link>
            ) : v.compliantLine ? (
              <div className="finding__good">
                <b><CheckCircleIcon width={15} height={15} /> Approved compliant alternative</b>
                <p>“{v.compliantLine}”</p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="report__cta">
        <span className="report__lock"><LockIcon width={16} height={16} /></span>
        <strong>{locked ? `Unlock ${locked} more fix${locked > 1 ? 'es' : ''} and the full corrected version` : 'Audit images, PDFs, videos and links too'}</strong>
        <span>Create a free account — 3 audits, every format, and your audit history.</span>
        <Link to={signupHref} className="dbtn dbtn--navy">See your full report — free <ArrowRightIcon width={16} height={16} /></Link>
      </div>
    </div>
  );
};
