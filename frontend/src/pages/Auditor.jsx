import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import AuditResult from '../components/AuditResult.jsx';
import { FileIcon, LinkIcon, TextIcon, UploadIcon } from '../components/Icons.jsx';

const TABS = [
  { id: 'text', label: 'Text', Icon: TextIcon },
  { id: 'url', label: 'Website / post URL', Icon: LinkIcon },
  { id: 'file', label: 'Upload file', Icon: UploadIcon },
];

const AUDIENCES = [
  { id: 'HealthCare', label: 'Doctor / Clinic / Hospital' },
  { id: 'Pharmaceuticals', label: 'Pharma / Medical product' },
];

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/webm';
const MAX_MB = 100;

const STEPS = ['Reading your content', 'Checking against 160 NMC & IMC rules', 'Writing compliant rewrites'];

const SAMPLE = 'Dr. Rakesh Sharma — Best Hair Transplant Specialist in Delhi! 100% guaranteed results, painless treatment. 50% OFF this Diwali only. See before-and-after photos of our celebrity patients. Book now on WhatsApp!';

const formatBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Auditor() {
  const { user } = useAuth();
  const [tab, setTab] = useState('text');
  const [audience, setAudience] = useState('HealthCare');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (!busy) return undefined;
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const pickFile = (f) => {
    setError('');
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File ${MAX_MB} MB se badi hai.`);
      return;
    }
    setFile(f);
  };

  const ready = (tab === 'text' && text.trim().length > 10) || (tab === 'url' && /^https?:\/\/\S+\.\S+/.test(url.trim())) || (tab === 'file' && file);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await api.audit({
        category: audience,
        text: tab === 'text' ? text.trim() : undefined,
        url: tab === 'url' ? url.trim() : undefined,
        file: tab === 'file' ? file : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setText('');
    setUrl('');
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">NMC compliance audit</p>
        <h1>{firstName ? `Hi ${firstName}, ` : ''}check an ad <em>before</em> it goes live.</h1>
        <p className="muted">Paste copy, a link or a creative. We check it against the NMC Ethical Advertising Guidelines 2026, IMC Code of Ethics 2002, Telemedicine Guidelines and NMC advisories.</p>
      </div>

      <form className="card composer" onSubmit={submit}>
        <div className="tabs" role="tablist" aria-label="Content type">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id}
              className={`tab ${tab === id ? 'tab--active' : ''}`} onClick={() => { setTab(id); setError(''); }}>
              <Icon /> {label}
            </button>
          ))}
        </div>

        <div className="composer__body">
          {tab === 'text' && (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={12000}
                placeholder="Paste the ad copy, social media caption, SMS or script here — English, Hindi or Hinglish." aria-label="Ad text" />
              <div className="composer__hint">
                <button type="button" className="link-btn" onClick={() => setText(SAMPLE)}>Try a sample ad</button>
                <span>{text.length.toLocaleString()} / 12,000</span>
              </div>
            </>
          )}

          {tab === 'url' && (
            <label className="field">
              <span>Page URL</span>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://clinic-website.in/offers" />
              <small className="muted">Website pages, landing pages and YouTube videos are supported.</small>
            </label>
          )}

          {tab === 'file' && (
            <div
              className={`drop ${dragging ? 'drop--active' : ''} ${file ? 'drop--filled' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileInput.current?.click()}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click(); }}
            >
              <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
              {file ? (
                <div className="drop__file">
                  <FileIcon />
                  <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
                  <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</button>
                </div>
              ) : (
                <>
                  <UploadIcon width={28} height={28} />
                  <strong>Drop a file or click to browse</strong>
                  <span className="muted">Image, PDF, Word, video or audio · up to {MAX_MB} MB</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="composer__foot">
          <label className="select">
            <span>Advertiser</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          <button className="btn btn--primary btn--lg" disabled={!ready || busy}>
            {busy ? 'Auditing…' : 'Run NMC audit'}
          </button>
        </div>

        {busy && (
          <div className="progress" aria-live="polite">
            <div className="progress__bar"><span /></div>
            <ol>
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'done' : i === step ? 'active' : ''}>{s}</li>
              ))}
            </ol>
            <p className="muted">Usually 10–40 seconds. Videos can take a few minutes.</p>
          </div>
        )}
        {error && <p className="alert alert--error" role="alert">{error}</p>}
      </form>

      <div ref={resultRef}>
        {result && <AuditResult result={result} onReset={reset} />}
      </div>
    </div>
  );
}
