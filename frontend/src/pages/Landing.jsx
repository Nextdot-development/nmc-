import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { COUNTRY } from '../country.js';
import { ShieldLogo } from '../components/Graphics.jsx';
import EnterpriseForm from '../components/EnterpriseForm.jsx';
import Scanner, { ScanResult, ScoreDial } from '../components/Scanner.jsx';
import { planFeatures } from '../components/PlanCards.jsx';
import {
  AlertIcon, ArrowRightIcon, BoltIcon, CheckCircleIcon, ChevronDownIcon, DocIcon, LanguageIcon, LayersIcon,
  LockIcon, RefreshIcon, ShieldCheckIcon, SparkIcon, UploadIcon, UsersIcon, VideoIcon, XCircleIcon,
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

const CountUp = ({ to, prefix = '', suffix = '' }) => {
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
  return <span ref={ref}>{prefix}{value.toLocaleString('en-IN')}{suffix}</span>;
};

/* ---------- content ---------- */
const AUDIENCE_STRIP = [
  [UsersIcon, 'Individual doctors'], [LayersIcon, 'Multi-specialty hospitals'], [ShieldCheckIcon, 'Dental & dermatology clinics'],
  [SparkIcon, 'IVF & fertility centres'], [VideoIcon, 'Healthcare agencies'], [DocIcon, 'Pharma & wellness brands'],
];

const LEVELS = [
  ['yellow', 'LEVEL 1: COMPLAINT & WARNING', 'Complaint to the State Medical Council', 'A patient, competitor or council can file a complaint about a post. The council can open an inquiry and issue a warning to the doctor.', 'IMC Regulations 2002 · Chapter 8'],
  ['orange', 'LEVEL 2: PENALTY FOR MISLEADING ADS', 'Consumer protection action', 'Misleading health advertisements can draw directions to withdraw the ad and monetary penalties from the Central Consumer Protection Authority.', 'Consumer Protection Act 2019 · Section 21'],
  ['red', 'LEVEL 3: REMOVAL FROM REGISTER', 'Name removed from the register', 'For professional misconduct, the medical council can remove a doctor’s name from the register for a period or permanently — no practice while removed.', 'IMC Regulations 2002 · Regulation 8.2'],
];

const STEPS = [
  ['Upload or Paste Content', 'Paste ad copy, drop a poster or banner, add a YouTube link, or upload a PDF script, video or voice ad.', UploadIcon, 'Supports 7 formats'],
  ['AI Scans 160 NMC Clauses', 'Every line and claim is checked against the NMC Ethical Advertising Guidelines 2026, IMC Regulations 2002 and Telemedicine Guidelines 2020.', LayersIcon, 'Clause-by-clause mapping'],
  ['Score & Compliant Rewrite', 'Get a risk score, a line-by-line explanation and a compliant rewrite that keeps your message while removing the claim.', CheckCircleIcon, 'One-click copy fixes'],
];

const DEMO_POINTS = [
  ['Clause-level citations', 'Every finding names the NMC or IMC clause it breaks, with a link to the official source.'],
  ['Keeps your message', 'Rewrites remove the risky promise but keep what you want to say.'],
  ['PDF audit reports', 'Save any report as a clean PDF for your doctor, client or hospital team.'],
  ['Registration check', 'Flags a missing doctor name, qualification or registration number.'],
];

const TRAPS = [
  ['critical', 'CRITICAL', XCircleIcon, 'Guaranteed Cures & 100% Claims', 'Phrases like “guaranteed hair regrowth in 30 days” or “100% cure for piles” promise outcomes no doctor can assure.', 'NMC 2026 §8.1(iii)'],
  ['high', 'HIGH RISK', AlertIcon, '“Best / No.1” Superlative Claims', 'Branding like “Best IVF clinic in Mumbai” or “No.1 heart surgeon” without verifiable basis is unlawful self-promotion.', 'NMC 2026 §8.1(ix)'],
  ['high', 'HIGH RISK', SparkIcon, 'Discounts, Free Camps & Packages', 'Incentives like “Flat 50% off full body checkup this Sunday only” count as commercial inducement to patients.', 'NMC 2026 §8.1(x)'],
  ['critical', 'CRITICAL', UsersIcon, 'Patient Testimonials & Before/Afters', 'Patient reviews, testimonials and before/after results used to promote a doctor or clinic are not allowed.', 'NMC 2026 §3.2 Expl. V & §8.1(xi)'],
  ['critical', 'CRITICAL', ShieldCheckIcon, 'Doctor Endorsing Products', 'A doctor recommending branded supplements, skin serums or devices in promotional content.', 'NMC 2026 §8.1(iv) & IMC 2002 §6.1.1'],
  ['gap', 'COMPLIANCE GAP', DocIcon, 'Missing Registration Details', 'Posts that do not show the treating doctor’s name, qualification and medical council registration number.', 'NMC 2026 §3.2 Expl. III–IV'],
];

const WHO = [
  ['Individual Doctors & Surgeons', 'You want to educate patients on Instagram and YouTube without risking your registration.', 'Check every reel and carousel before it goes live, in the language you post in.', 'Starter plan suited', 'starter'],
  ['Hospitals & Multi-Specialty Clinics', 'Many departments publish offers, health camps and packages without a central check.', 'One place to review promotions across doctors and specialties.', 'Premium plan suited', 'premium'],
  ['Healthcare & Med-Tech Agencies', 'Clients blame the agency when a council or regulator flags a campaign.', 'Hand clients a clause-cited report with every creative.', 'Enterprise suited', 'enterprise'],
  ['Pharma & Wellness Brands', 'The line between education, product claims and doctor endorsement is easy to cross.', 'Pre-screen scripts and influencer copy before spending ad budget.', 'Enterprise suited', 'enterprise'],
];

const FEATURES = [
  [VideoIcon, 'Every Format: Text, Reels & YouTube', 'Captions, posters, PDFs, videos, voice ads, web pages and YouTube links in one dashboard — with the full transcript shown.'],
  [LanguageIcon, 'Native Hinglish & Hindi', 'Understands phrases like “pakka ilaaj”, “jad se khatam” and “bina dard ke” — and writes the report in your ad’s language.'],
  [ShieldCheckIcon, 'Clause-Cited Explanations', 'Every warning links to NMC 2026, IMC 2002 or Telemedicine 2020 sections, with the official source.'],
  [SparkIcon, 'One-Click Compliant Rewrites', 'Don’t just get flagged — copy a compliant line, or the full corrected version, straight into your post.'],
  [DocIcon, 'PDF Audit Reports', 'Save a clean report for hospital teams, agency clients or your own records.'],
  [RefreshIcon, 'Same Content, Same Result', 'Scores follow a fixed formula, so re-checking the same ad gives the same answer — and costs nothing.'],
];

const FAQ = [
  ['Is NextComply AI an official tool of the National Medical Commission?', 'No. NextComply AI is an independent compliance aid built by Nextdot. It is not affiliated with or endorsed by the National Medical Commission. Its rule pack is built from the guidelines and notices the NMC publishes on nmc.org.in.'],
  ['Which Indian languages are supported?', 'English, Hindi, Hinglish and Marathi are tested regularly, and other Indian languages work too. The report — findings, explanations and fixes — comes back in the language of your content.'],
  ['Can it scan YouTube videos and Instagram Reels?', 'YouTube links can be audited directly on the Premium and Enterprise plans. For Instagram Reels, upload the video file — we transcribe the speech and audit it.'],
  ['What is a credit?', 'Credits pay for audits. A text, PDF or image audit uses 1 credit, a web page 2, a video or audio file 2 per 5 minutes, and a YouTube video 4. Checking the exact same content again is free.'],
  ['Is my creative copy private?', 'Your audits are saved in your own account history, visible only to you. Content is processed by our AI providers only to run the audit.'],
  ['Does an audit result constitute legal advice?', 'No. NextComply AI helps you spot and fix common problems before you publish. For legal decisions, consult a qualified professional.'],
  ['Can marketing agencies use one account for multiple doctor clients?', 'Yes — the Enterprise plan is built for agencies and hospital groups, with volume credits and team access. Send us an enquiry from the pricing section.'],
];

const PLAN_STYLE = { free: 'soft', starter: 'soft', premium: 'popular', enterprise: 'dark' };
const PLAN_BADGE = { free: 'Try it', starter: 'Solo Doctor', premium: 'Clinics & Teams', enterprise: 'Custom' };

const priceOf = (p) => {
  if (p.price === null) return <><b>₹{p.pricePerCredit}</b><span>/ credit + GST</span></>;
  if (p.price === 0) return <><b>₹0</b><span>forever</span></>;
  return <><b>₹{p.price}</b><span>/ month</span></>;
};
const creditsOf = (p) => (p.credits === null ? <><strong>From {p.minCredits}</strong> credits per month</>
  : p.period === 'once' ? <><strong>{p.credits} audits</strong> free, one time</> : <><strong>{p.credits} credits</strong> per month</>);

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef(null);
  const [open, setOpen] = useState(-1);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [enterprise, setEnterprise] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    api.plans().then((res) => setPlans(res.plans)).catch(() => setPlans([]));
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (result) reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  useEffect(() => {
    if (!enterprise) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setEnterprise(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterprise]);

  useReveal([plans, result]);

  const signupHref = '/login?mode=signup';
  const toScanner = () => document.getElementById('scanner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const choosePlan = (p) => {
    if (p.id === 'enterprise') { setEnterprise(true); return; }
    if (!user) navigate(signupHref, { state: { from: p.id === 'free' ? '/app' : '/billing' } });
    else navigate(p.id === 'free' ? '/app' : '/billing');
  };

  return (
    <div className="dl">
      <span className="dl-progress" ref={progressRef} aria-hidden="true" />
      <a href="/rules" className="dl-announce" onClick={(e) => { e.preventDefault(); navigate('/rules'); }}>
        New: NMC Ethical Advertising Guidelines 2026 — 160 rules now live <ArrowRightIcon width={14} height={14} />
      </a>

      <header className={`dl-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <Link to="/" className="dl-brand"><ShieldLogo width="30" height="33" /><span>NextComply AI</span></Link>
        <nav className="dl-nav__links" aria-label="Sections">
          <a href="#how">How it works</a>
          <Link to="/rules">Rules</Link>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="dl-nav__actions">
          {user ? (
            <Link to="/app" className="dbtn dbtn--navy">Open dashboard <ArrowRightIcon width={16} height={16} /></Link>
          ) : (
            <>
              <Link to="/login" className="dl-nav__signin">Sign in</Link>
              <button type="button" className="dbtn dbtn--navy" onClick={toScanner}>Start free audit</button>
            </>
          )}
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="dl-hero">
          <div className="dl-hero__glow" aria-hidden="true" />
          <div className="dl-hero__glow dl-hero__glow--2" aria-hidden="true" />
          <div className="dl-hero__grid" aria-hidden="true" />
          <div className="dl-hero__copy">
            <span className="dl-pill"><i /> Built on 160 NMC rules · Updated Oct 2026</span>
            <h1>Publish healthcare ads <span>without the NMC notice.</span></h1>
            <p>Paste a script, upload a creative or drop a YouTube link. Get every risky line flagged, the exact clause it breaks, and a compliant version ready to post — in about a minute.</p>
            <ul className="dl-hero__facts">
              <li><LanguageIcon /> English · Hindi · Hinglish</li>
              <li><UploadIcon /> Text, Reels, Audio, PDF</li>
              <li><ShieldCheckIcon /> Clause-cited fixes</li>
            </ul>
            <div className="dl-hero__proof">
              <span className="dl-hero__proofbadge">✕</span>
              <div>
                <p>“100% guaranteed hair regrowth” <em>→ flagged Critical</em></p>
                <small>NMC Ethical Advertising Guidelines 2026 · §8.1(iii) · with a compliant rewrite</small>
              </div>
            </div>
          </div>
          <div id="scanner" className="dl-hero__scanner">
            <span className="dl-float dl-float--a" aria-hidden="true"><CheckCircleIcon width={16} height={16} /> Clause-cited</span>
            <span className="dl-float dl-float--b" aria-hidden="true"><LanguageIcon width={16} height={16} /> Hinglish ready</span>
            <span className="dl-float dl-float--c" aria-hidden="true"><ShieldCheckIcon width={16} height={16} /> 160 NMC rules</span>
            <Scanner signupHref={signupHref} onStart={() => setChecking(true)} onResult={(r) => { setResult(r); setChecking(false); }} />
          </div>
        </section>

        {(result || checking) && (
          <section className="dl-section dl-result" ref={reportRef}>
            <div className="dl-head">
              <span className="dl-kicker">YOUR FREE AUDIT</span>
              <h2>{result ? 'Here is what the NMC rules say about your ad' : 'Checking your ad…'}</h2>
            </div>
            {result ? <ScanResult result={result} signupHref={signupHref} /> : <div className="dl-result__wait"><span /><span /><span /></div>}
          </section>
        )}

        {/* audience + stats */}
        <section className="dl-trust">
          <p>BUILT FOR DOCTORS, MULTI-SPECIALTY HOSPITALS AND HEALTHCARE AGENCIES ACROSS {COUNTRY.name.toUpperCase()}</p>
          <ul>
            {AUDIENCE_STRIP.map(([Icon, label]) => <li key={label}><Icon width={18} height={18} /> {label}</li>)}
          </ul>
          <div className="dl-stats reveal">
            <div><strong><CountUp to={160} /></strong><b>NMC rules &amp; clauses mapped</b><span>Cross-referenced with IMC 2002 &amp; Telemedicine 2020</span></div>
            <div><strong><CountUp to={1014} /></strong><b>NMC notices reviewed</b><span>Every notice on nmc.org.in checked for rules</span></div>
            <div><strong>~<CountUp to={1} /> min</strong><b>Average text audit</b><span>From raw script to ready-to-post alternative</span></div>
          </div>
        </section>

        {/* regulatory reality */}
        <section className="dl-dark">
          <div className="dl-dark__grid" aria-hidden="true" />
          <div className="dl-dark__inner">
            <span className="dl-dark__kicker"><AlertIcon width={15} height={15} /> REGULATORY REALITY CHECK</span>
            <h2>Every post carries your registration.</h2>
            <p>Outsourcing creative to an agency does not move the responsibility. Under NMC and IMC rules, the registered doctor answers for what is published in their name — on Instagram, YouTube or a clinic website.</p>
            <div className="dl-levels">
              {LEVELS.map(([color, tag, title, body, cite], i) => (
                <article key={tag} className={`dl-level reveal dl-level--${color}`} style={{ '--i': i }}>
                  <span className="dl-level__tag"><i /> {tag}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <small>{cite}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* steps */}
        <section id="how" className="dl-section dl-tint">
          <div className="dl-head reveal">
            <span className="dl-kicker">EFFORTLESS WORKFLOW</span>
            <h2>Audit and fix in 3 effortless steps</h2>
            <p>From raw video script or social banner to a compliant creative in about a minute.</p>
          </div>
          <div className="dl-steps">
            {STEPS.map(([title, body, Icon, foot], i) => (
              <article key={title} className="dl-step reveal" style={{ '--i': i }}>
                <span className="dl-step__num">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
                <small><Icon width={16} height={16} /> {foot}</small>
              </article>
            ))}
          </div>
        </section>

        {/* demo report */}
        <section className="dl-section dl-demo">
          <div className="dl-demo__copy reveal">
            <span className="dl-pill dl-pill--soft">Interactive Audit Engine Demo</span>
            <h2>A report your compliance team, agency and doctor all understand.</h2>
            <p>No vague legal jargon. NextComply highlights the exact phrase, points to the governing clause, explains why it fails, and hands you a compliant alternative ready to publish.</p>
            <ul>
              {DEMO_POINTS.map(([t, b]) => <li key={t}><CheckCircleIcon /><span><strong>{t}</strong>{b}</span></li>)}
            </ul>
            <button type="button" className="dbtn dbtn--navy" onClick={toScanner}>Audit your own creative copy <ArrowRightIcon width={16} height={16} /></button>
          </div>
          <div className="dl-demo__card reveal">
            <div className="dl-demo__file">
              <span className="dl-demo__fileicon"><VideoIcon width={20} height={20} /></span>
              <span><strong>instagram_reel_script_backpain.mp4</strong><small>Length: 42s · Creator: Dr. Sharma Spine Clinic</small></span>
              <em><BoltIcon width={14} height={14} /> Audit complete</em>
            </div>
            <div className="dl-demo__score">
              <div className="dl-demo__dial"><ScoreDial score={38} /><span><strong>High Risk Ad</strong><small>Non-compliant with NMC 2026</small></span></div>
              <div className="dl-demo__chips">
                <span className="chip-c">2 Critical Violations</span>
                <span className="chip-h">1 High Violation</span>
                <span className="chip-ok">3 Passed Checks</span>
              </div>
            </div>
            <div className="finding finding--static">
              <div className="finding__head"><span className="sevtag sevtag--critical">CRITICAL VIOLATION</span><code>NMC 2026 §8.1(iii) · No exaggerated claims</code></div>
              <div className="finding__bad"><b>✕ Original risky line in script</b><s>“Get guaranteed relief from chronic back pain in just 7 days without surgery!”</s></div>
              <p className="finding__why"><b>Why this fails:</b> It promises a fixed outcome in a fixed time. NMC guidelines do not allow guaranteed results or exaggerated claims about treatment.</p>
              <div className="finding__good">
                <b><CheckCircleIcon width={15} height={15} /> Approved compliant alternative</b>
                <p>“Non-surgical care plans designed to support spine mobility and manage chronic back pain. Consult our spine specialists for a diagnosis and a treatment plan suited to you.”</p>
              </div>
            </div>
            <div className="dl-demo__locked">
              <span className="dl-demo__blur">HIGH VIOLATION · “Visit Delhi’s No.1 spine surgeon” · superiority claim</span>
              <div>
                <span className="report__lock"><LockIcon width={16} height={16} /></span>
                <strong>Unlock all remaining violations &amp; the PDF report</strong>
                <small>Discount inducements, missing registration number, and a clean corrected version.</small>
                <button type="button" className="dbtn dbtn--navy dbtn--sm" onClick={toScanner}>See your full report — free <ArrowRightIcon width={14} height={14} /></button>
              </div>
            </div>
          </div>
        </section>

        {/* traps */}
        <section className="dl-section dl-tint">
          <div className="dl-head reveal">
            <span className="dl-kicker">STATUTORY RISK INVENTORY</span>
            <h2>The 6 most common traps in healthcare ads</h2>
            <p>Indian healthcare advertising rules are far stricter than standard consumer advertising. Here is what trips up most digital campaigns.</p>
          </div>
          <div className="dl-traps">
            {TRAPS.map(([tone, tag, Icon, title, body, cite], i) => (
              <article key={title} className={`dl-trap reveal dl-trap--${tone}`} style={{ '--i': i }}>
                <div className="dl-trap__top"><span className="dl-trap__icon"><Icon width={20} height={20} /></span><em>{tag}</em></div>
                <h3>{title}</h3>
                <p>{body}</p>
                <small>Governing: {cite}</small>
              </article>
            ))}
          </div>
        </section>

        {/* who */}
        <section className="dl-section">
          <div className="dl-head reveal">
            <span className="dl-kicker">TAILORED WORKFLOWS</span>
            <h2>Engineered for everyone publishing health content</h2>
            <p>Whether you are a solo practitioner filming your first reel or an agency managing many hospital accounts.</p>
          </div>
          <div className="dl-who">
            {WHO.map(([title, pain, outcome, suited, planId], i) => (
              <article key={title} className="dl-whocard reveal" style={{ '--i': i }}>
                <span className="dl-whocard__icon">{[<UsersIcon key="a" />, <LayersIcon key="b" />, <VideoIcon key="c" />, <ShieldCheckIcon key="d" />][i]}</span>
                <h3>{title}</h3>
                <b className="pain">THE PAIN</b><p>{pain}</p>
                <b className="gain">THE OUTCOME</b><p className="dl-whocard__out">{outcome}</p>
                <button type="button" onClick={() => (planId === 'enterprise' ? setEnterprise(true) : document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }))}>{suited} →</button>
              </article>
            ))}
          </div>
        </section>

        {/* features */}
        <section className="dl-section dl-tint">
          <div className="dl-head reveal">
            <span className="dl-kicker">INDIAN REGULATORY SPECIALIZATION</span>
            <h2>Built specifically for Indian healthcare regulations</h2>
            <p>Generic AI tools give generic advice. NextComply is built on the exact wording of NMC guidelines and notices.</p>
          </div>
          <div className="dl-features">
            {FEATURES.map(([Icon, title, body], i) => (
              <article key={title} className="dl-feature reveal" style={{ '--i': i }}>
                <span className="dl-feature__icon"><Icon width={22} height={22} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="dl-section">
          <div className="dl-head reveal">
            <span className="dl-pill dl-pill--soft"><SparkIcon width={14} height={14} /> Try it free — ₹0 · 3 audits included · No credit card required</span>
            <h2>Predictable pricing for peace of mind</h2>
            <p>Choose a plan that fits your publishing frequency and team size. Prices include GST.</p>
          </div>
          {plans === null ? <div className="dl-loading">Loading plans…</div> : plans.length === 0 ? <p className="dl-center">Pricing could not load right now. Please refresh the page.</p> : (
            <div className="dl-plans">
              {plans.map((p, i) => {
                const style = PLAN_STYLE[p.id] || 'soft';
                const bullets = planFeatures(p).filter(([on]) => on).slice(0, 5).map(([, t]) => t);
                return (
                  <article key={p.id} className={`dl-plan dl-plan--${style} reveal`} style={{ '--i': i }}>
                    {style === 'popular' && <span className="dl-plan__ribbon">MOST POPULAR · CLINIC CHOICE</span>}
                    <div className="dl-plan__top"><h3>{p.name}</h3><em>{PLAN_BADGE[p.id]}</em></div>
                    <p className="dl-plan__tag">{p.tagline}</p>
                    <p className="dl-plan__price">{priceOf(p)}</p>
                    <ul>
                      <li><CheckCircleIcon /> <span>{creditsOf(p)}</span></li>
                      {bullets.map((t) => <li key={t}><CheckCircleIcon /> <span>{t}</span></li>)}
                    </ul>
                    <button type="button" className={`dbtn dbtn--block ${style === 'dark' ? 'dbtn--white' : 'dbtn--navy'}`} onClick={() => choosePlan(p)}>
                      {{ free: 'Start free', starter: 'Start with Starter', premium: 'Start with Premium', enterprise: 'Contact Enterprise Sales' }[p.id]}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* faq */}
        <section id="faq" className="dl-section">
          <div className="dl-head reveal">
            <span className="dl-kicker">FREQUENTLY ASKED QUESTIONS</span>
            <h2>Everything you need to know about NextComply</h2>
            <p>Clear answers about regulatory coverage, formats and data privacy.</p>
          </div>
          <div className="dl-faq">
            {FAQ.map(([q, a], i) => (
              <div key={q} className={`dl-faq__item reveal ${open === i ? 'is-open' : ''}`}>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<ChevronDownIcon width={18} height={18} /></button>
                <div className="dl-faq__a"><p>{a}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* closing */}
        <section className="dl-cta reveal">
          <h2>A 1-minute check beats a show-cause notice.</h2>
          <p>Audit every reel, ad and post before you publish.</p>
          <button type="button" className="dbtn dbtn--white dbtn--lg" onClick={() => (user ? navigate('/app') : toScanner())}>
            Run your first audit free <ArrowRightIcon width={18} height={18} />
          </button>
          <ul><li><CheckCircleIcon width={15} height={15} /> 3 free audits included</li><li>No credit card needed</li><li>Clause-cited report</li></ul>
        </section>
      </main>

      <footer className="dl-foot">
        <div className="dl-foot__top">
          <div className="dl-foot__brand">
            <Link to="/" className="dl-brand"><ShieldLogo width="30" height="33" /><span>NextComply AI</span></Link>
            <p>AI-powered compliance auditing for Indian healthcare advertisements, reels and clinical marketing under NMC 2026 guidelines.</p>
          </div>
          <div><h4>PRODUCT</h4><Link to="/app">Audit Tool</Link><Link to="/rules">NMC Rules Engine</Link><a href="#pricing">Pricing</a><a href="#how">How it works</a></div>
          <div><h4>COMPANY</h4><button type="button" onClick={() => setEnterprise(true)}>Enterprise &amp; Agencies</button><button type="button" onClick={() => setEnterprise(true)}>Contact Us</button></div>
          <div><h4>ACCOUNT</h4><Link to="/login">Sign in</Link><Link to={signupHref}>Create free account</Link></div>
        </div>
        <div className="dl-foot__bottom">
          <span>Independent compliance aid. Not affiliated with the National Medical Commission. Not legal advice.</span>
          <span>© {new Date().getFullYear()} Nextdot. All rights reserved.</span>
        </div>
      </footer>

      {enterprise && (
        <div className="dl-modal" role="dialog" aria-modal="true" aria-label="Enterprise enquiry" onClick={(e) => { if (e.target === e.currentTarget) setEnterprise(false); }}>
          <div className="dl-modal__box">
            <button type="button" className="dl-modal__close" aria-label="Close" onClick={() => setEnterprise(false)}>×</button>
            <EnterpriseForm user={user} title="Talk to us about Enterprise" />
          </div>
        </div>
      )}
    </div>
  );
}
