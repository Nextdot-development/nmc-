import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { COUNTRY } from '../country.js';
import { Landmark, ShieldLogo } from '../components/Graphics.jsx';
import PlanCards from '../components/PlanCards.jsx';
import EnterpriseForm from '../components/EnterpriseForm.jsx';
import {
  ArrowRightIcon, CheckCircleIcon, DocIcon, GlobeIcon, ImageIcon, LanguageIcon, LayersIcon, LinkIcon, MicIcon,
  RefreshIcon, ShieldCheckIcon, SparkIcon, TextIcon, UploadIcon, UsersIcon, VideoIcon, XCircleIcon,
} from '../components/Icons.jsx';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Adds .is-in to .reveal elements as they scroll into view
const useReveal = (deps = []) => {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal:not(.is-in)')];
    if (!('IntersectionObserver' in window) || reducedMotion()) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps);
};

const CountUp = ({ to, suffix = '' }) => {
  const ref = useRef(null);
  const [value, setValue] = useState(reducedMotion() ? to : 0);
  useEffect(() => {
    if (reducedMotion() || !('IntersectionObserver' in window)) { setValue(to); return undefined; }
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - start) / 1400);
        setValue(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{value.toLocaleString('en-IN')}{suffix}</span>;
};

/* ---------- Hero demo: an ad being audited, replays every few seconds ---------- */
const AD_LINES = [
  { text: 'Delhi ka No.1 hair clinic', sev: 'high' },
  { text: '100% guaranteed hair regrowth in 30 days!', sev: 'critical' },
  { text: 'Flat 50% off this Diwali — book now', sev: 'high' },
  { text: 'Consultation by Dr. A. Sharma, MBBS, MD (Dermatology)', sev: null },
];

const HeroDemo = () => {
  const [cycle, setCycle] = useState(0);
  const [score, setScore] = useState(100);

  useEffect(() => {
    if (reducedMotion()) { setScore(40); return undefined; }
    const t = setInterval(() => setCycle((c) => c + 1), 9000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (reducedMotion()) return undefined;
    setScore(100);
    const steps = [[1500, 85], [2400, 55], [3300, 40]];
    const timers = steps.map(([ms, v]) => setTimeout(() => setScore(v), ms));
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'bad';

  return (
    <div className="demo" key={cycle} aria-label="Example: an ad being checked against NMC rules" role="img">
      <div className="demo__ad">
        <div className="demo__bar"><i /><i /><i /><span>clinic-ad.png</span></div>
        <div className="demo__lines">
          {AD_LINES.map((l, i) => (
            <p key={l.text} className={`demo__line ${l.sev ? `demo__line--${l.sev}` : 'demo__line--ok'}`} style={{ '--d': `${0.9 + i * 0.9}s` }}>
              {l.text}
              {l.sev && <em>{l.sev === 'critical' ? 'Critical' : 'High'}</em>}
            </p>
          ))}
          <span className="demo__scan" />
        </div>
      </div>

      <div className="demo__report">
        <div className={`demo__score demo__score--${tone}`}>
          <svg viewBox="0 0 80 80" width="84" height="84">
            <circle cx="40" cy="40" r={r} className="demo__track" />
            <circle cx="40" cy="40" r={r} className="demo__value" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
          </svg>
          <strong>{score}</strong>
        </div>
        <div className="demo__verdict">
          <span className="kicker">NMC AUDIT</span>
          <b className={`status status--${tone}`}>{score >= 80 ? 'Checking…' : 'Non-Compliant'}</b>
          <small>3 issues · 160 rules checked</small>
        </div>
      </div>

      <div className="demo__fix">
        <p className="demo__fixrow demo__fixrow--bad"><XCircleIcon width={16} height={16} /> 100% guaranteed hair regrowth in 30 days!</p>
        <p className="demo__fixrow demo__fixrow--good"><CheckCircleIcon width={16} height={16} /> Hair-loss treatment planned after a consultation with our dermatologist.</p>
        <small>NMC Ethical Advertising Guidelines 2026 · no guaranteed outcomes</small>
      </div>
    </div>
  );
};

const FEATURES = [
  [SparkIcon, 'A fix for every line', 'Each flagged line comes with a compliant rewrite you can copy straight into your post.'],
  [LanguageIcon, 'Speaks your ad’s language', 'Hindi, Hinglish, Marathi or English — the whole report comes back in the language of your content.'],
  [UploadIcon, 'Every format', 'Text, posters, PDFs, videos, audio, websites and YouTube. You always see the full transcript we checked.'],
  [ShieldCheckIcon, 'Bound to the NMC rule pack', 'Every finding cites the exact rule, with a link to the official NMC source. No made-up rules.'],
  [RefreshIcon, 'Same content, same result', 'Scores follow a fixed formula, so a re-check of the same ad gives the same answer — and costs nothing.'],
  [LayersIcon, 'Built from 1,014 NMC notices', 'Ethical Advertising Guidelines 2026, IMC Regulations 2002, Telemedicine Guidelines and NMC advisories.'],
];

const STEPS = [
  [UploadIcon, 'Add your content', 'Paste a caption, upload a poster or video, or drop a website link.'],
  [ShieldCheckIcon, 'We check 160 rules', 'AI reads every line and matches it against the NMC rule pack.'],
  [CheckCircleIcon, 'Fix and publish', 'Copy the suggested lines or the full corrected version, then post with confidence.'],
];

const FORMATS = [[TextIcon, 'Text'], [ImageIcon, 'Posters'], [DocIcon, 'PDF & Word'], [VideoIcon, 'Video'], [MicIcon, 'Audio'], [LinkIcon, 'Websites'], [GlobeIcon, 'YouTube']];

const AUDIENCE = ['Doctors', 'Clinics', 'Hospitals', 'Diagnostic labs', 'Pharma brands', 'Healthcare agencies'];

const FAQ = [
  ['What is a credit?', 'Credits pay for audits. A text, PDF or image audit uses 1 credit, a website page 2, a video or audio file 2 per 5 minutes, and a YouTube video 4. Checking the exact same content again is free.'],
  ['Which languages does it understand?', 'English, Hindi, Hinglish and Marathi are tested regularly, and other Indian languages work too. The report — findings, explanations and fixes — comes back in the language of your content.'],
  ['Which rules do you check against?', `160 rules built from all 1,014 notices on the ${COUNTRY.regulator} website: the Ethical Advertising Guidelines 2026, IMC Professional Conduct Regulations 2002, Telemedicine Practice Guidelines 2020, clinical advisories and registration rules.`],
  ['Do plans renew automatically?', 'No. Starter and Premium are prepaid for 30 days. Renew whenever you like — unused Premium credits carry over one month.'],
  ['What happens if an audit fails?', 'Credits are returned automatically if an audit cannot finish.'],
  ['Does this replace legal advice?', 'No. NextComply AI is a guidance tool that helps you spot and fix common problems before you publish. For legal decisions, consult a qualified professional.'],
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(0);
  const enterpriseRef = useRef(null);

  useEffect(() => {
    api.plans().then((res) => setPlans(res.plans)).catch(() => setPlans([]));
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useReveal([plans]);

  const startHref = user ? '/app' : '/login?mode=signup';

  const onChoose = (p) => {
    if (p.id === 'enterprise') {
      enterpriseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!user) navigate('/login?mode=signup', { state: { from: p.id === 'free' ? '/app' : '/billing' } });
    else navigate(p.id === 'free' ? '/app' : '/billing');
  };

  const ctaFor = (p) => ({
    label: { free: 'Start free', starter: 'Choose Starter', premium: 'Choose Premium', enterprise: 'Contact sales' }[p.id] || 'Choose',
    disabled: false,
  });

  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden="true">
        <span className="orb orb--navy" />
        <span className="orb orb--green" />
        <span className="landing__grid" />
      </div>

      <header className={`lnav ${scrolled ? 'lnav--scrolled' : ''}`}>
        <Link to="/" className="lnav__brand"><ShieldLogo /><span>NextComply <b>AI</b></span></Link>
        <nav className="lnav__links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="lnav__actions">
          {user ? (
            <Link to="/app" className="run-btn run-btn--sm">Open dashboard <ArrowRightIcon width={18} height={18} /></Link>
          ) : (
            <>
              <Link to="/login" className="lnav__signin">Sign in</Link>
              <Link to="/login?mode=signup" className="run-btn run-btn--sm">Start free</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <span className="badge-live hero__badge"><i /> {COUNTRY.regulator} EDITION · 160 RULES</span>
            <h1>
              Publish healthcare ads
              <span className="hero__accent"> without {COUNTRY.regulator} worries.</span>
            </h1>
            <p className="hero__lead">
              NextComply AI checks your posts, posters, videos and websites against {COUNTRY.regulator} rules — and shows exactly which line to change, in the language of your ad.
            </p>
            <div className="hero__ctas">
              <Link to={startHref} className="run-btn hero__primary"><SparkIcon width={20} height={20} /> {user ? 'Open dashboard' : 'Start free — 3 audits'}</Link>
              <a href="#pricing" className="ghost-btn hero__secondary">See pricing</a>
            </div>
            <ul className="hero__trust">
              <li><CheckCircleIcon width={17} height={17} /> No card needed</li>
              <li><CheckCircleIcon width={17} height={17} /> Hindi, Hinglish, Marathi &amp; English</li>
              <li><CheckCircleIcon width={17} height={17} /> Results in about a minute</li>
            </ul>
          </div>
          <div className="hero__visual">
            <HeroDemo />
            <Landmark className="hero__landmark" />
          </div>
        </section>

        <section className="formats reveal" aria-label="Supported formats">
          <div className="formats__track">
            {[...FORMATS, ...FORMATS].map(([Icon, label], i) => (
              <span key={i} className="formats__chip"><Icon width={18} height={18} /> {label}</span>
            ))}
          </div>
        </section>

        <section className="stats reveal">
          <div><strong><CountUp to={160} /></strong><span>{COUNTRY.regulator} &amp; IMC rules</span></div>
          <div><strong><CountUp to={1014} /></strong><span>{COUNTRY.regulator} notices reviewed</span></div>
          <div><strong><CountUp to={7} /></strong><span>content formats</span></div>
          <div><strong><CountUp to={100} suffix="%" /></strong><span>findings tied to a real rule</span></div>
        </section>

        <section id="features" className="lsection">
          <div className="lsection__head reveal">
            <span className="kicker">WHY NEXTCOMPLY</span>
            <h2>Everything you need to publish with confidence</h2>
          </div>
          <div className="features">
            {FEATURES.map(([Icon, title, body], i) => (
              <article key={title} className="feature panel reveal" style={{ '--i': i }}>
                <span className="feature__icon"><Icon width={24} height={24} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="lsection">
          <div className="lsection__head reveal">
            <span className="kicker">HOW IT WORKS</span>
            <h2>Three steps, about a minute</h2>
          </div>
          <ol className="steps">
            {STEPS.map(([Icon, title, body], i) => (
              <li key={title} className="step reveal" style={{ '--i': i }}>
                <span className="step__num">{i + 1}</span>
                <span className="step__icon"><Icon width={26} height={26} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="showcase lsection">
          <div className="showcase__copy reveal">
            <span className="kicker">SEE A REAL FIX</span>
            <h2>It tells you what to write instead</h2>
            <p>Not just “this breaks a rule”. You get the exact line, why it fails, and a compliant line in the same language — Hinglish stays Hinglish.</p>
            <ul className="showcase__audience">
              {AUDIENCE.map((a) => <li key={a}><UsersIcon width={15} height={15} /> {a}</li>)}
            </ul>
          </div>
          <div className="showcase__card panel reveal">
            <div className="violation__head">
              <span className="violation__num">01</span>
              <span className="sev sev--critical">Critical</span>
              <h4>NMC Ethical Advertising Guidelines 2026 — Guaranteed outcomes</h4>
            </div>
            <div className="linefix">
              <div className="linefix__row linefix__row--bad">
                <span className="linefix__tag">✕ Ye line</span>
                <p>“Sirf 3 sitting mein pakka result, 100% guarantee!”</p>
              </div>
              <div className="linefix__row linefix__row--good">
                <span className="linefix__tag">✓ Iski jagah likhein</span>
                <p>“Har patient ka result alag hota hai — doctor se consult karke apna treatment plan banwayein.”</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="lsection">
          <div className="lsection__head reveal">
            <span className="kicker">PRICING</span>
            <h2>Simple plans, pay only for what you audit</h2>
            <p>Prices include GST. 1 credit = one text, PDF or image audit.</p>
          </div>
          {plans === null ? <div className="panel skeleton">Loading plans…</div>
            : plans.length ? <div className="reveal"><PlanCards plans={plans} onChoose={onChoose} ctaFor={ctaFor} /></div>
              : <p className="muted center">Pricing could not load right now. Please refresh the page.</p>}
        </section>

        <section id="faq" className="lsection faq">
          <div className="lsection__head reveal">
            <span className="kicker">FAQ</span>
            <h2>Questions, answered</h2>
          </div>
          <div className="faq__list">
            {FAQ.map(([q, a], i) => (
              <div key={q} className={`faq__item panel reveal ${open === i ? 'faq__item--open' : ''}`}>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  {q}<span aria-hidden="true">+</span>
                </button>
                <div className="faq__answer"><p>{a}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="lsection enterprise-band" ref={enterpriseRef} id="enterprise">
          <div className="enterprise-band__copy reveal">
            <span className="kicker">ENTERPRISE</span>
            <h2>Running a hospital chain, pharma brand or agency?</h2>
            <p>Volume credits at {'₹'}20 each, unlimited history, team access, API and invoicing. Tell us what you need.</p>
          </div>
          <div className="panel reveal enterprise-band__form"><EnterpriseForm user={user} title="Get a custom plan" /></div>
        </section>

        <section className="cta reveal">
          <h2>Check your next ad before it goes live.</h2>
          <p>3 free audits. No card needed.</p>
          <Link to={startHref} className="run-btn cta__btn"><SparkIcon width={20} height={20} /> {user ? 'Open dashboard' : 'Start free'}</Link>
        </section>
      </main>

      <footer className="lfoot">
        <div className="lfoot__brand"><ShieldLogo /><span>NextComply <b>AI</b></span></div>
        <nav aria-label="Footer">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link to="/rules">Rule pack</Link>
          <Link to="/login">Sign in</Link>
        </nav>
        <p>NextComply AI is a guidance tool and does not replace legal advice. © {new Date().getFullYear()} Nextdot.</p>
      </footer>
    </div>
  );
}
