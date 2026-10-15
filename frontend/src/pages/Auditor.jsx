import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { FORMAT_NAMES, creditHint } from '../billing.js';
import { api } from '../api.js';
import AuditResult from '../components/AuditResult.jsx';
import { BannerArt } from '../components/Graphics.jsx';
import { COUNTRY } from '../country.js';
import {
  ArrowRightIcon, CheckCircleIcon, ChevronDownIcon, DocIcon, GlobeIcon, ImageIcon, LayersIcon, LinkIcon, LockIcon, MicIcon,
  ShieldCheckIcon, SparkIcon, TextIcon, UploadIcon, VideoIcon,
} from '../components/Icons.jsx';

const FORMATS = [
  { id: 'text', label: 'Text', Icon: TextIcon },
  { id: 'url', label: 'URL', Icon: LinkIcon },
  { id: 'image', label: 'Image', Icon: ImageIcon, accept: 'image/jpeg,image/png,image/webp,image/gif', hint: 'JPG, PNG, WEBP or GIF' },
  { id: 'video', label: 'Video', Icon: VideoIcon, accept: 'video/mp4,video/webm,video/quicktime', hint: 'MP4, WEBM or MOV' },
  { id: 'audio', label: 'Audio', Icon: MicIcon, accept: 'audio/mpeg,audio/wav,audio/ogg,audio/webm', hint: 'MP3, WAV, OGG or WEBM' },
  { id: 'document', label: 'Document', Icon: DocIcon, accept: 'application/pdf,.doc,.docx', hint: 'PDF or Word' },
];

const RULE_PACKS = [
  { id: 'HealthCare', label: 'NMC · Healthcare' },
  { id: 'Pharmaceuticals', label: 'NMC · Pharmaceuticals' },
];

const MAX_TEXT = 60000;
const MAX_MB = 100;
const STEPS = ['Reading content', 'Checking NMC rules', 'Writing fixes'];

const formatBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Auditor() {
  const [format, setFormat] = useState('text');
  const [pack, setPack] = useState('HealthCare');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [upsell, setUpsell] = useState(false);
  const [result, setResult] = useState(null);
  const { account, setBalance, refreshAccount } = useAuth();
  const fileInput = useRef(null);
  const resultRef = useRef(null);
  const location = useLocation();

  // "Audit this text again" from a report opens here with the text filled in
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (!prefill) return;
    setFormat('text');
    setFile(null);
    setResult(null);
    setError('');
    setText(String(prefill).slice(0, MAX_TEXT));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.state?.nonce]);

  const fmt = FORMATS.find((f) => f.id === format);
  const isFile = Boolean(fmt.accept);
  const activePack = RULE_PACKS.find((p) => p.id === pack);
  const allowed = (id) => !account || account.features.formats.includes(id);
  const locked = !allowed(format);

  useEffect(() => {
    if (!busy) return undefined;
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const chooseFormat = (id) => {
    setFormat(id);
    setFile(null);
    setError('');
  };

  const pickFile = (f) => {
    setError('');
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File ${MAX_MB} MB se badi hai.`);
      return;
    }
    setFile(f);
  };

  const ready = !locked && ((format === 'text' && text.trim().length > 10)
    || (format === 'url' && /^https?:\/\/\S+\.\S+/.test(url.trim()))
    || (isFile && file));

  const submit = async (e, { fresh = false } = {}) => {
    e?.preventDefault();
    if (!ready || busy) return;
    setError('');
    setUpsell(false);
    setResult(null);
    setBusy(true);
    try {
      const res = await api.audit({
        category: pack,
        text: format === 'text' ? text.trim() : undefined,
        url: format === 'url' ? url.trim() : undefined,
        file: isFile ? file : undefined,
        fresh,
      });
      setResult(res);
      if (res?.billing) setBalance(res.billing.balance);
    } catch (err) {
      setError(err.message);
      if (['INSUFFICIENT_CREDITS', 'FORMAT_NOT_IN_PLAN', 'MEDIA_TOO_LONG'].includes(err.code)) {
        setUpsell(true);
        refreshAccount();
      }
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

  return (
    <div className="auditor auditor--simple">
      <section className="banner">
        <div className="banner__copy">
          <h1><span className="simple__titleicon"><ShieldCheckIcon width={22} height={22} /></span> Compliance <b>Auditor</b></h1>
          <p>{COUNTRY.regulator} rules · {COUNTRY.name}</p>
        </div>
        <BannerArt />
      </section>

      <form className="panel simple" onSubmit={submit}>

        <div className="simple__row">
          <section>
            <h3 className="label">CONTENT FORMAT</h3>
            <div className="pills" role="radiogroup" aria-label="Content format">
              {FORMATS.map(({ id, label, Icon }) => (
                <button key={id} type="button" role="radio" aria-checked={format === id}
                  className={`pill-btn ${format === id ? 'pill-btn--active' : ''} ${allowed(id) ? '' : 'pill-btn--locked'}`} onClick={() => chooseFormat(id)}
                  title={allowed(id) ? undefined : 'Not in your plan'}>
                  <Icon width={17} height={17} /> {label}{!allowed(id) && <LockIcon width={13} height={13} className="pill-lock" />}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="label">SELECTED RULE PACK</h3>
            <label className="selectbox">
              <span className="selectbox__icon"><LayersIcon width={22} height={22} /></span>
              <span className="selectbox__text">
                <select value={pack} onChange={(e) => setPack(e.target.value)} aria-label="Rule pack">
                  {RULE_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </span>
              <ChevronDownIcon />
            </label>
          </section>
        </div>

        <div className="simple__row">
          <div className="info-card">
            <h4><GlobeIcon width={18} height={18} /> GEOGRAPHY</h4>
            <p className="info-card__value"><i className="ring-dot ring-dot--green" /> India</p>
            <small>Geography is fixed to India for NMC rules.</small>
          </div>
          <div className="info-card">
            <h4><LayersIcon width={18} height={18} /> APPLICABLE RULES</h4>
            <small>Audit will be performed using regulations applicable to:</small>
            <p className="info-card__value"><i className="ring-dot ring-dot--violet" /> {activePack.label}</p>
            <p className="info-card__value"><i className="ring-dot ring-dot--green" /> India</p>
          </div>
        </div>

        {locked && (
          <div className="upsell">
            <LockIcon width={22} height={22} />
            <div>
              <strong>{FORMAT_NAMES[format]} audits are not in the {account?.planName} plan</strong>
              <span>{format === 'url' ? 'Website and YouTube audits come with Premium.' : 'Starter and above can audit PDFs, Word files, videos and audio.'}</span>
            </div>
            <Link to="/billing" className="run-btn run-btn--sm">See plans</Link>
          </div>
        )}
        {!locked && format === 'text' && (
          <div className="inputbox">
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))} rows={3}
              placeholder="Paste marketing copy or script here..." aria-label="Content to audit" />
            <div className="inputbox__bar"><span className="counter">{text.length} / {MAX_TEXT}</span></div>
          </div>
        )}
        {!locked && format === 'url' && (
          <div className="inputbox">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://clinic-website.in/offers" aria-label="URL to audit" />
          </div>
        )}
        {!locked && isFile && (
          <div className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileInput.current?.click()} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click(); }}>
            <input ref={fileInput} type="file" accept={fmt.accept} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            {file ? (
              <div className="dropzone__file">
                <CheckCircleIcon width={24} height={24} />
                <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
                <button type="button" className="chip-btn" onClick={(ev) => { ev.stopPropagation(); setFile(null); }}>Remove</button>
              </div>
            ) : (
              <>
                <UploadIcon width={26} height={26} />
                <strong>Drop or click to upload</strong>
                <span>{fmt.hint} · {MAX_MB} MB max</span>
              </>
            )}
          </div>
        )}

        <button className="run-btn" disabled={!ready || busy}>
          <SparkIcon width={20} height={20} /> {busy ? 'Auditing…' : 'Run audit'} {!busy && <ArrowRightIcon width={20} height={20} />}
        </button>
        {account && !locked && (
          <p className="run-cost">
            Uses <b>{creditHint(format, url)}</b> · {account.credits} credit{account.credits === 1 ? '' : 's'} left · same content again is free
          </p>
        )}

        {busy && (
          <div className="progress" aria-live="polite">
            <div className="progress__bar"><span /></div>
            <ol>{STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'active' : ''}>{s}</li>)}</ol>
            {(format === 'video' || format === 'audio' || /youtu\.?be/i.test(url)) && (
              <p className="muted small">Videos take 2–4 minutes — we transcribe the full video first.</p>
            )}
          </div>
        )}
        {error && (
          <p className="alert" role="alert">
            {error} {upsell && <Link to="/billing" className="alert__link">View plans →</Link>}
          </p>
        )}
      </form>

      <div ref={resultRef}>
        {result && <AuditResult result={result} onReset={reset} onFresh={() => submit(null, { fresh: true })} />}
      </div>
    </div>
  );
}
