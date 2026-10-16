import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { COUNTRY } from '../country.js';
import { Landmark, ShieldLogo } from '../components/Graphics.jsx';
import PlanCards from '../components/PlanCards.jsx';
import EnterpriseForm from '../components/EnterpriseForm.jsx';
import TryAudit from '../components/TryAudit.jsx';
import {
  ArrowRightIcon, BoltIcon, CheckCircleIcon, ChevronRightIcon, DocIcon, GlobeIcon, ImageIcon, LockIcon, ShieldCheckIcon, TextIcon, UploadIcon, VideoIcon,
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

// Replays the hero animation every few seconds
const useCycle = (ms) => {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const t = setInterval(() => setCycle((c) => c + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return cycle;
};

const useScore = (cycle, from, to, delay) => {
  const [score, setScore] = useState(reducedMotion() ? to : from);
  useEffect(() => {
    if (reducedMotion()) return undefined;
    setScore(from);
    let raf;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - start) / 1300);
        setScore(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [cycle]);
  return score;
};

const ScoreRing = ({ score, size }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <span className={`lring ${score > 50 ? 'lring--checking' : ''}`} style={{ '--s': size }}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} className="lring__track" />
        <circle cx="40" cy="40" r={r} className="lring__value" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <b>{score}</b>
    </span>
  );
};

/* ---------- Hero visual: doctor photo with the audit cards placed over it ---------- */
const AD_ISSUES = [['Misleading claim', 'High'], ['Prohibited superlative', 'High'], ['Before/after image', 'Critical'], ['Lack of disclaimer', 'Medium']];

const HeroVisual = () => {
  const cycle = useCycle(10000);
  const score = useScore(cycle, 100, 40, 2600);
  return (
    <div className="hv" key={cycle} role="img" aria-label="Example: a clinic ad checked against NMC rules, scored 40 and given a compliant version">
      <img src="/landing/hero-doctor.jpg" alt="" className="hv__photo" width="1500" height="1000" />

      <div className="hv__card hv__ad">
        <p className="hv__label">Ad Audit Result</p>
        <span className="hv__thumb">
          <img src="/landing/ad-thumb.jpg" alt="" />
          <b>Delhi ka No.1<br />hair clinic</b>
        </span>
        <ul>
          {AD_ISSUES.map(([label, sev], i) => (
            <li key={label} style={{ '--d': `${0.5 + i * 0.45}s` }}>
              <i>✕</i> {label} <em className={`lsev lsev--${sev.toLowerCase()}`}>{sev}</em>
            </li>
          ))}
        </ul>
      </div>

      <div className="hv__card hv__fix">
        <p className="hv__fixhead"><CheckCircleIcon /> Compliant version</p>
        <div className="hv__fixbody">
          <span>
            <strong>Hair-loss treatment by Dr. A. Sharma</strong>
            <small>Consult a dermatologist to know if it is suitable for you.</small>
          </span>
          <img src="/landing/doctor-thumb.jpg" alt="" />
        </div>
      </div>

      <div className="hv__card hv__score">
        <ScoreRing score={score} size="1" />
        <span>
          <strong>NMC Compliance Score</strong>
          <em className={score > 50 ? 'is-checking' : ''}>{score > 50 ? 'Checking…' : 'Non-Compliant'}</em>
          <small>3 issues · 160 rules checked</small>
        </span>
      </div>
    </div>
  );
};

/* ---------- Audience line icons ---------- */
const svg = (children) => (
  <svg viewBox="0 0 40 40" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const AUDIENCE = [
  ['Clinics & Hospitals', svg(<><path d="M8 34V12h24v22" /><path d="M14 34v-7h12v7M4 34h32" /><path d="M20 15v8M16 19h8" /><path d="M14 6h12v6H14z" /></>)],
  ['Dermatology & Skin Care', svg(<><path d="M6 34h28" /><path d="M10 34c0-6 2-9 4-12M30 34c0-6-2-9-4-12" /><path d="M14 22c1.5-2 3.5-3 6-3s4.5 1 6 3" /><path d="M20 6v9M15 9l1.5 5M25 9l-1.5 5M11 13l3 3M29 13l-3 3" /><path d="M16 28h8" /></>)],
  ['Fertility & IVF', svg(<><path d="M20 33S7 25 7 15.5A6.5 6.5 0 0120 12a6.5 6.5 0 0113 3.5C33 25 20 33 20 33z" /><circle cx="20" cy="20" r="4.5" /><circle cx="20" cy="20" r="1.4" /></>)],
  ['Dental Clinics', svg(<path d="M13 6c-4 0-7 3-7 7.5 0 4 1.5 6 2.5 9 1 3 1.5 11 4.5 11 2.5 0 2.5-8 7-8s4.5 8 7 8c3 0 3.5-8 4.5-11 1-3 2.5-5 2.5-9C34 9 31 6 27 6c-3 0-4.5 2-7 2s-4-2-7-2z" />)],
  ['Wellness & Aesthetics', svg(<><path d="M20 32c-4-3-6-7-6-11s2-8 6-11c4 3 6 7 6 11s-2 8-6 11z" /><path d="M20 32c-5 0-11-2-14-8 3-2 7-2 9 0M20 32c5 0 11-2 14-8-3-2-7-2-9 0" /><path d="M8 35h24" /></>)],
  ['Pharma & Healthcare Brands', svg(<><rect x="6" y="14" width="28" height="12" rx="6" transform="rotate(-40 20 20)" /><path d="M15.5 13.5l9 13" /></>)],
];

const LANGUAGES = [
  ['A', 'English'], ['अ', 'Hindi'], ['Aa', 'Hinglish'], ['म', 'Marathi'],
  ['অ', 'Bengali'], ['அ', 'Tamil'], ['అ', 'Telugu'], ['ಅ', 'Kannada'],
  ['അ', 'Malayalam'], ['અ', 'Gujarati'], ['ਅ', 'Punjabi'], ['ଅ', 'Odia'],
  ['ا', 'Urdu'], ['অ', 'Assamese'],
];

const WHY_POINTS = [
  'Checks against 160 NMC rules',
  'Shows exact line to change',
  'Explains in simple language',
  'Works in every Indian language — report in the same language',
  'Ideal for doctors, clinics and healthcare brands',
];

const DEMO_RESULTS = [
  ['Misleading claim', 'High', '“Delhi ka No.1” is a prohibited superlative under NMC guidelines.'],
  ['Before/after image', 'Critical', 'Before/after images are not allowed in medical advertisements.'],
  ['Lack of disclaimer', 'Medium', 'Add the treating doctor’s name, qualification and registration number.'],
];

const AuditMock = () => {
  const score = useScore(0, 100, 40, 600);
  return (
    <div className="amock reveal" aria-label="Example of the NextComply auditor" role="img">
      <div className="amock__left">
        <div className="amock__tabs">
          <span className="is-on"><TextIcon /> Text</span>
          <span><ImageIcon /> Image</span>
          <span><VideoIcon /> Video</span>
          <span><GlobeIcon /> Website</span>
        </div>
        <div className="amock__text">
          <span>Paste your post, poster text, video script or website content here…</span>
          <small>0 / 2000</small>
        </div>
        <span className="amock__btn">Analyze with NextComply AI <ArrowRightIcon width={16} height={16} /></span>
      </div>
      <div className="amock__right">
        <h4>Audit Results</h4>
        <div className="amock__score">
          <ScoreRing score={score} size="1.05" />
          <span><em>Non-Compliant</em><small>3 issues found</small></span>
        </div>
        <ul>
          {DEMO_RESULTS.map(([title, sev, body], i) => (
            <li key={title} style={{ '--i': i }}>
              <b>{i + 1}</b>
              <span><strong>{title} <em className={`lsev lsev--${sev.toLowerCase()}`}>{sev}</em></strong><small>{body}</small></span>
              <ChevronRightIcon width={16} height={16} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const STEPS = [
  [UploadIcon, 'Upload your content', 'Add your post, poster, video or website link.'],
  [DocIcon, 'Get instant audit', 'We check it against 160 NMC rules in about a minute.'],
  [CheckCircleIcon, 'See exact changes', 'Get clear suggestions in your language.'],
];

const FAQ = [
  ['What is a credit?', 'Credits pay for audits. A text, PDF or image audit uses 1 credit, a website page 2, video, audio and YouTube 2 per 5 minutes. Checking the exact same content again is free.'],
  ['Which languages does it understand?', 'Any language your ad is written in: English, Hindi, Hinglish, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia, Urdu and more. The whole report — findings, explanations and line fixes — comes back in that same language and script.'],
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
    label: { free: 'Start for free', starter: 'Choose Starter', premium: 'Choose Premium', enterprise: "Let's connect" }[p.id] || 'Choose',
    disabled: false,
  });

  return (
    <div className="landing">
      <header className={`lnav ${scrolled ? 'lnav--scrolled' : ''}`}>
        <Link to="/" className="lnav__brand"><ShieldLogo /><span>NextComply AI<small>{COUNTRY.regulator} compliance made simple</small></span></Link>
        <nav className="lnav__links" aria-label="Sections">
          <a href="#try">Try free</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="lnav__actions">
          {user ? (
            <Link to="/app" className="lbtn lbtn--navy">Open dashboard <ArrowRightIcon width={18} height={18} /></Link>
          ) : (
            <>
              <Link to="/login" className="lnav__signin">Sign in</Link>
              <Link to="/login?mode=signup" className="lbtn lbtn--navy">Start free <ArrowRightIcon width={18} height={18} /></Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="lhero">
          <div className="lhero__copy">
            <span className="lbadge"><i /> {COUNTRY.regulator} GUIDELINES · 160 RULES · {COUNTRY.name.toUpperCase()} FOCUSED</span>
            <h1>Publish healthcare ads with confidence. <em>Stay {COUNTRY.regulator} compliant.</em></h1>
            <p className="lhero__lead">
              NextComply AI checks your posts, posters, videos and websites against {COUNTRY.regulator} rules — and shows exactly which line to change, in simple language.
            </p>
            <div className="lhero__ctas">
              {user
                ? <Link to="/app" className="lbtn lbtn--navy lbtn--lg">Check your content now <ArrowRightIcon width={20} height={20} /></Link>
                : <a href="#try" className="lbtn lbtn--navy lbtn--lg">Check your content now <ArrowRightIcon width={20} height={20} /></a>}
              <a href="#pricing" className="lbtn lbtn--ghost lbtn--lg">See pricing</a>
            </div>
            <ul className="lhero__facts">
              <li><BoltIcon /> <span>Results in<br />about a minute</span></li>
              <li><GlobeIcon /> <span>Every Indian<br />language</span></li>
              <li><ShieldCheckIcon /> <span>No card<br />needed to try</span></li>
            </ul>
          </div>
          <div className="lhero__visual">
            <HeroVisual />
          </div>
        </section>

        <section className="audience">
          <p>BUILT FOR HEALTHCARE PROFESSIONALS, CLINICS AND HEALTHCARE BRANDS ACROSS {COUNTRY.name.toUpperCase()}</p>
          <ul>
            {AUDIENCE.map(([label, icon], i) => (
              <li key={label} className="reveal" style={{ '--i': i }}>{icon}<span>{label}</span></li>
            ))}
          </ul>
        </section>

        <TryAudit signupHref="/login?mode=signup" />

        <section id="features" className="lwhy">
          <div className="lwhy__copy reveal">
            <span className="lkicker">WHY NEXTCOMPLY AI</span>
            <h2>Stay compliant.<br />Build trust.</h2>
            <p>{COUNTRY.regulator} guidelines are strict — one wrong claim can lead to complaints, penalties or loss of trust. NextComply AI helps you catch issues before you publish and communicate responsibly.</p>
            <ul>
              {WHY_POINTS.map((t) => <li key={t}><CheckCircleIcon /> {t}</li>)}
            </ul>
          </div>
          <AuditMock />
        </section>

        <section id="how" className="lhow">
          <span className="lkicker">HOW IT WORKS</span>
          <h2>From upload to compliant ad — in 3 simple steps</h2>
          <ol>
            {STEPS.map(([Icon, title, body], i) => (
              <li key={title} className="reveal" style={{ '--i': i }}>
                <span className="lhow__icon"><b>{i + 1}</b><Icon /></span>
                <span><strong>{title}</strong><small>{body}</small></span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lguide">
          <div className="lguide__panel reveal">
            <Landmark className="lguide__art" />
            <div>
              <h2>Built on {COUNTRY.regulator} Guidelines</h2>
              <p>Every audit checks your content against 160 rules from the {COUNTRY.regulator} Ethical Advertising Guidelines 2026, the IMC Code of Ethics 2002 and the Telemedicine Practice Guidelines — each with a link to its official source.</p>
              <Link to="/rules">See the full rule pack <ArrowRightIcon width={15} height={15} /></Link>
            </div>
          </div>
          <div className="lguide__langs reveal">
            <h3>Works in every Indian language</h3>
            <p>Write your ad in any language — the report and every fix come back in the same language and script.</p>
            <ul>
              {LANGUAGES.map(([g, name], i) => (
                <li key={name} className={`lang lang--${['en', 'hi', 'hg', 'mr'][i % 4]}`}><b>{g}</b>{name}</li>
              ))}
            </ul>
            <small className="lguide__more">…and more, including mixed-language ads like Hinglish.</small>
          </div>
        </section>

        <section id="pricing" className="lsection">
          <div className="lsection__head reveal">
            <span className="lkicker">PRICING</span>
            <h2>Simple plans, pay only for what you audit</h2>
            <p>Prices include GST. 1 credit = one text, PDF or image audit.</p>
          </div>
          {plans === null ? <div className="panel skeleton">Loading plans…</div>
            : plans.length ? <div className="reveal"><PlanCards plans={plans} onChoose={onChoose} ctaFor={ctaFor} /></div>
              : <p className="muted center">Pricing could not load right now. Please refresh the page.</p>}
        </section>

        <section id="faq" className="lsection faq">
          <div className="lsection__head reveal">
            <span className="lkicker">FAQ</span>
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
            <span className="lkicker">ENTERPRISE</span>
            <h2>Running a hospital chain, pharma brand or agency?</h2>
            <p>Volume credits at ₹20 each, unlimited history, dedicated support and GST invoicing. Tell us what you need.</p>
          </div>
          <div className="panel reveal enterprise-band__form"><EnterpriseForm user={user} title="Get a custom plan" /></div>
        </section>

        <section className="lcta reveal">
          <div className="lcta__copy">
            <span className="lcta__eyebrow">RESPONSIBLE COMMUNICATION. STRONGER HEALTHCARE.</span>
            <h2>Be compliant. Focus on what you do best — patient care.</h2>
            <div className="lcta__action">
              <Link to={startHref} className="lbtn lbtn--white lbtn--lg">{user ? 'Open dashboard' : 'Get started free'} <ArrowRightIcon width={20} height={20} /></Link>
              <small>No card needed · 3 free audits</small>
            </div>
          </div>
          <ul className="lcta__points">
            <li><ShieldCheckIcon /><span>{COUNTRY.regulator} based<br />160 rules</span></li>
            <li><GlobeIcon /><span>Multiple<br />languages</span></li>
            <li><BoltIcon /><span>Results in<br />about a minute</span></li>
            <li><LockIcon /><span>Private audit<br />history</span></li>
          </ul>
          <span className="lcta__art" aria-hidden="true">
            <Landmark className="lcta__landmark" />
            <svg className="lcta__swoosh" viewBox="0 0 200 160" preserveAspectRatio="none">
              <path d="M200 0 C160 40 120 90 40 160 L80 160 C140 100 175 60 200 30 Z" fill="#ff9933" />
              <path d="M200 30 C175 60 140 100 80 160 L120 160 C165 110 185 85 200 62 Z" fill="#ffffff" />
              <path d="M200 62 C185 85 165 110 120 160 L200 160 Z" fill="#138808" />
            </svg>
          </span>
        </section>
      </main>

      <footer className="lfoot">
        <div className="lfoot__brand"><ShieldLogo /><span>NextComply AI<small>{COUNTRY.regulator} compliance made simple</small></span></div>
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
