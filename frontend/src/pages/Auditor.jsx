import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import AuditResult from '../components/AuditResult.jsx';
import { ShieldOrbit } from '../components/Graphics.jsx';
import {
  BoltIcon, BulbIcon, CalendarIcon, ChartIcon, CheckCircleIcon, ChevronDownIcon, ClipboardIcon, DatabaseIcon, DocIcon,
  GlobeIcon, HomeIcon, ImageIcon, LayersIcon, LinkIcon, MicIcon, ShieldCheckIcon, SparkIcon, TextIcon, UploadIcon,
  VideoIcon, XCircleIcon, ArrowRightIcon, RefreshIcon,
} from '../components/Icons.jsx';
import { formatDate, statusTone, StatusPill, TYPE_LABEL } from './History.jsx';

const FORMATS = [
  { id: 'text', label: 'Text', Icon: TextIcon },
  { id: 'url', label: 'URL', Icon: LinkIcon },
  { id: 'image', label: 'Image', Icon: ImageIcon, accept: 'image/jpeg,image/png,image/webp,image/gif', hint: 'JPG, PNG, WEBP or GIF' },
  { id: 'video', label: 'Video', Icon: VideoIcon, accept: 'video/mp4,video/webm,video/quicktime', hint: 'MP4, WEBM or MOV' },
  { id: 'audio', label: 'Audio', Icon: MicIcon, accept: 'audio/mpeg,audio/wav,audio/ogg,audio/webm', hint: 'MP3, WAV, OGG or WEBM' },
  { id: 'document', label: 'Document', Icon: DocIcon, accept: 'application/pdf,.doc,.docx', hint: 'PDF or Word' },
];

const RULE_PACKS = [
  { id: 'HealthCare', label: 'NMC · Healthcare', description: 'Audits doctor, clinic and hospital marketing including treatment claims, testimonials, offers and registration details.' },
  { id: 'Pharmaceuticals', label: 'NMC · Pharmaceuticals', description: 'Audits drug and product promotion including doctor endorsements, pharma gifts and telemedicine rules.' },
];

const FEATURES = [
  { Icon: BoltIcon, tone: 'lime', label: <>AI powered<br />analysis</> },
  { Icon: DatabaseIcon, tone: 'violet', label: <>NMC specific<br />rules</> },
  { Icon: ShieldCheckIcon, tone: 'lime', label: <>Detailed<br />explanations</> },
  { Icon: ChartIcon, tone: 'violet', label: <>Actionable<br />recommendations</> },
];

const SCOPE = [
  { tone: 'green', label: 'IMC Professional Conduct Regulations, 2002' },
  { tone: 'white', label: 'NMC Ethical Advertising Guidelines, 2026' },
  { tone: 'amber', label: 'Telemedicine Practice Guidelines, 2020' },
  { tone: 'violet', label: 'NMC clinical advisories & registration rules' },
];

const MAX_TEXT = 10000;
const MAX_MB = 100;
const STEPS = ['Reading your content', 'Checking NMC & IMC rules', 'Writing compliant rewrites'];
const SAMPLE = 'Dr. Rakesh Sharma — Best Hair Transplant Specialist in Delhi! 100% guaranteed results, painless treatment. 50% OFF this Diwali only. See before-and-after photos of our celebrity patients. Book now on WhatsApp!';

const formatBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const HeroArt = () => (
  <div className="hero-art" aria-hidden="true">
    <ShieldOrbit />
    <span className="art-chip art-chip--a"><DocIcon width={18} height={18} /> NMC Regulations</span>
    <span className="art-chip art-chip--b"><ShieldCheckIcon width={18} height={18} /> Healthcare Safety</span>
    <span className="art-chip art-chip--c"><BulbIcon width={18} height={18} /> Clear Explanations</span>
    <span className="art-chip art-chip--d"><ChartIcon width={18} height={18} /> Actionable Insights</span>
  </div>
);

const Step = ({ n, title, sub, children }) => (
  <section className="step">
    <header className="step__head">
      <span className="step__num">{n}</span>
      <div><h2>{title}</h2><p>{sub}</p></div>
    </header>
    {children}
  </section>
);

const CardTitle = ({ Icon, tone = 'violet', children }) => (
  <h3 className="card-title"><span className={`card-title__icon card-title__icon--${tone}`}><Icon width={18} height={18} /></span>{children}</h3>
);

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
  const [result, setResult] = useState(null);
  const [ruleCount, setRuleCount] = useState(null);
  const [recent, setRecent] = useState(null);
  const fileInput = useRef(null);
  const resultRef = useRef(null);
  const packSelect = useRef(null);

  const fmt = FORMATS.find((f) => f.id === format);
  const isFile = Boolean(fmt.accept);
  const activePack = RULE_PACKS.find((p) => p.id === pack);

  const loadRecent = () => api.history().then((items) => setRecent(Array.isArray(items) ? items.slice(0, 3) : [])).catch(() => setRecent([]));

  useEffect(() => {
    api.rulePack().then((res) => setRuleCount(res?.data?.count ?? null)).catch(() => setRuleCount(null));
    loadRecent();
  }, []);

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

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (format === 'url') setUrl(clip.trim());
      else setText((clip || '').slice(0, MAX_TEXT));
    } catch {
      setError('Clipboard access nahi mila. Ctrl+V se paste karein.');
    }
  };

  const clear = () => {
    setText('');
    setUrl('');
    setFile(null);
    setError('');
  };

  const ready = (format === 'text' && text.trim().length > 10)
    || (format === 'url' && /^https?:\/\/\S+\.\S+/.test(url.trim()))
    || (isFile && file);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await api.audit({
        category: pack,
        text: format === 'text' ? text.trim() : undefined,
        url: format === 'url' ? url.trim() : undefined,
        file: isFile ? file : undefined,
      });
      setResult(res);
      loadRecent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    clear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="auditor">
      <div className="auditor__grid">
        <div className="auditor__main">
          <section className="hero">
            <span className="badge-live"><i /> AI COMPLIANCE AUDITOR</span>
            <h1>
              <span>COMPLIANCE,</span>
              <span><b className="lime">WITHOUT</b> THE <b className="grad">COMPLEXITY</b></span>
            </h1>
            <p>Upload or paste your healthcare marketing content and let AI analyse it against NMC regulations with clear explanations and actionable recommendations.</p>
            <ul className="features">
              {FEATURES.map(({ Icon, tone, label }, i) => (
                <li key={i}><span className={`features__icon features__icon--${tone}`}><Icon width={20} height={20} /></span><span>{label}</span></li>
              ))}
            </ul>
          </section>

          <form className="panel panel--glow composer" onSubmit={submit}>
            <Step n="1" title="Select Content Format" sub="Choose the type of content you want to audit">
              <div className="formats" role="radiogroup" aria-label="Content format">
                {FORMATS.map(({ id, label, Icon }) => (
                  <button key={id} type="button" role="radio" aria-checked={format === id}
                    className={`format ${format === id ? 'format--active' : ''}`} onClick={() => chooseFormat(id)}>
                    {format === id && <span className="format__check"><CheckCircleIcon width={18} height={18} /></span>}
                    <Icon width={24} height={24} /><span>{label}</span>
                  </button>
                ))}
              </div>
            </Step>

            <Step n="2" title="Provide Your Content"
              sub={format === 'text' ? 'Paste your marketing copy or script below' : format === 'url' ? 'Enter the page or video link to audit' : `Upload your ${fmt.label.toLowerCase()} file`}>
              {format === 'text' && (
                <div className="inputbox">
                  <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))} rows={2}
                    placeholder="Paste your marketing content here..." aria-label="Content to audit" />
                  <div className="inputbox__bar">
                    <button type="button" className="chip-btn" onClick={paste}><ClipboardIcon width={17} height={17} /> Paste</button>
                    <button type="button" className="chip-btn" onClick={() => setText(SAMPLE)}><SparkIcon width={17} height={17} /> Sample</button>
                    <button type="button" className="chip-btn" onClick={clear}><XCircleIcon width={17} height={17} /> Clear</button>
                    <span className="counter">{text.length} / {MAX_TEXT}</span>
                  </div>
                </div>
              )}
              {format === 'url' && (
                <div className="inputbox">
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://clinic-website.in/offers" aria-label="URL to audit" />
                  <div className="inputbox__bar">
                    <button type="button" className="chip-btn" onClick={paste}><ClipboardIcon width={17} height={17} /> Paste</button>
                    <button type="button" className="chip-btn" onClick={clear}><XCircleIcon width={17} height={17} /> Clear</button>
                    <span className="counter">Websites, landing pages & YouTube</span>
                  </div>
                </div>
              )}
              {isFile && (
                <div className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                  onClick={() => fileInput.current?.click()} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click(); }}>
                  <input ref={fileInput} type="file" accept={fmt.accept} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                  {file ? (
                    <div className="dropzone__file">
                      <fmt.Icon width={26} height={26} />
                      <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
                      <button type="button" className="chip-btn" onClick={(ev) => { ev.stopPropagation(); setFile(null); }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <UploadIcon width={26} height={26} />
                      <strong>Drop your {fmt.label.toLowerCase()} here or click to browse</strong>
                      <span>{fmt.hint} · up to {MAX_MB} MB</span>
                    </>
                  )}
                </div>
              )}
            </Step>

            <Step n="3" title="Review Settings" sub="Confirm the rule pack and geography for this audit">
              <div className="settings-row">
                <label className="selectbox">
                  <span className="selectbox__icon"><GlobeIcon width={24} height={24} /></span>
                  <span className="selectbox__text"><small>Geography</small>
                    <select defaultValue="India" aria-label="Geography"><option>India</option></select>
                  </span>
                  <ChevronDownIcon />
                </label>
                <label className="selectbox">
                  <span className="selectbox__icon"><LayersIcon width={24} height={24} /></span>
                  <span className="selectbox__text"><small>Rule Pack</small>
                    <select ref={packSelect} value={pack} onChange={(e) => setPack(e.target.value)} aria-label="Rule pack">
                      {RULE_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </span>
                  <ChevronDownIcon />
                </label>
              </div>
            </Step>

            <button className="run-btn" disabled={!ready || busy}>
              <SparkIcon width={22} height={22} /> {busy ? 'Auditing…' : 'Run compliance audit'} {!busy && <ArrowRightIcon width={22} height={22} />}
            </button>

            {busy && (
              <div className="progress" aria-live="polite">
                <div className="progress__bar"><span /></div>
                <ol>
                  {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'active' : ''}>{s}</li>)}
                </ol>
                <p>Usually 10–40 seconds. Videos can take a few minutes.</p>
              </div>
            )}
            {error && <p className="alert" role="alert">{error}</p>}
          </form>
        </div>

        <aside className="sidecol">
          <HeroArt />

          <div className="panel side-card">
            <div className="panel__head">
              <CardTitle Icon={LayersIcon}>Active Rule Pack</CardTitle>
              <button type="button" className="ghost-btn ghost-btn--sm" onClick={() => setPack(pack === 'HealthCare' ? 'Pharmaceuticals' : 'HealthCare')}>
                <RefreshIcon width={15} height={15} /> Change
              </button>
            </div>
            <Link to="/rules" className="card-pack__main">
              <span className="card-pack__icon"><LayersIcon width={34} height={34} /></span>
              <div>
                <div className="card-pack__title"><strong>{activePack.label}</strong><span className="badge-active"><i /> Active</span></div>
                <p>{activePack.description}</p>
              </div>
            </Link>
            <dl className="facts">
              <dt><HomeIcon width={17} height={17} /> Regulator</dt><dd>National Medical Commission</dd>
              <dt><GlobeIcon width={17} height={17} /> Geography</dt><dd>India</dd>
              <dt><GlobeIcon width={17} height={17} /> Total Rules</dt><dd>{ruleCount ? `${ruleCount} regulations` : '—'}</dd>
              <dt><CalendarIcon width={17} height={17} /> Last Updated</dt><dd>Oct 2026</dd>
            </dl>
          </div>

          <div className="panel side-card">
            <div className="panel__head">
              <CardTitle Icon={HomeIcon} tone="lime">Regulatory Scope</CardTitle>
              <Link to="/rules" className="ghost-btn ghost-btn--sm">View all</Link>
            </div>
            <ul className="scope">
              {SCOPE.map((s) => <li key={s.label}><i className={`ring-dot ring-dot--${s.tone}`} />{s.label}</li>)}
            </ul>
          </div>

          <div className="panel side-card">
            <div className="panel__head">
              <CardTitle Icon={ChartIcon} tone="lime">Recent Audits</CardTitle>
              <Link to="/history" className="ghost-btn ghost-btn--sm">View all</Link>
            </div>
            {recent === null && <p className="muted small">Loading…</p>}
            {recent?.length === 0 && <p className="muted small">No audits yet — run your first one.</p>}
            <ul className="recent">
              {recent?.map((item) => {
                const score = Math.round(Number(item.score) || 0);
                const Icon = item.contentType === 'url' || item.contentType === 'webpage' ? LinkIcon : item.contentType === 'image' ? ImageIcon : DocIcon;
                return (
                  <li key={item._id}>
                    <Link to={`/history/${item._id}`} state={{ item }} className="recent__item">
                      <span className="recent__icon"><Icon width={20} height={20} /></span>
                      <span className="recent__text">
                        <strong>{item.originalInput || 'Audit'}</strong>
                        <small>{TYPE_LABEL[item.contentType] || 'Audit'} • {formatDate(item.createdAt)}</small>
                      </span>
                      <span className={`score-chip score-chip--${statusTone(item.status)}`}>{score}</span>
                      <StatusPill status={item.status} small />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      <div ref={resultRef}>
        {result && <AuditResult result={result} onReset={reset} />}
      </div>
    </div>
  );
}
