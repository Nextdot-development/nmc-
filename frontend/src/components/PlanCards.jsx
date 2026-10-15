import { FORMAT_NAMES, inr } from '../billing.js';
import { ArrowRightIcon, CheckCircleIcon, SparkIcon } from './Icons.jsx';

const formatList = (formats) => {
  if (formats.includes('url') && formats.length >= 6) return 'All formats incl. websites & YouTube';
  return formats.map((f) => FORMAT_NAMES[f]).join(', ');
};

// Generic feature list for a plan
export const planFeatures = (p) => [
  [true, formatList(p.formats)],
  [p.maxMediaMinutes > 0, p.maxMediaMinutes ? `Video & audio up to ${p.maxMediaMinutes} min` : 'Video & audio'],
  [true, p.fixPreviewLines ? `Line-by-line fixes for top ${p.fixPreviewLines} issues` : 'Line-by-line fix for every issue'],
  [p.compliantVersion, 'Full corrected version, ready to paste'],
  [true, 'Report in the language of your ad'],
  [p.pdf, 'PDF report download'],
  [true, p.historyDays ? `Audit history: ${p.historyDays >= 365 ? '12 months' : p.historyDays >= 180 ? '6 months' : `${p.historyDays} days`}` : 'Unlimited audit history'],
  [p.rollover, 'Unused credits roll over'],
];

const historyText = (days) => (days ? (days >= 365 ? '12-month' : days >= 180 ? '6-month' : `${days}-day`) : 'Unlimited');

// What each paid card says; every line comes from the plan settings
const bullets = (p) => {
  if (p.id === 'starter') return [
    'Text, PDF, Word & poster/image audits',
    `Video & audio audits up to ${p.maxMediaMinutes} min, with full transcript`,
    'Line-by-line compliant rewrite for every issue',
    'Report in your ad’s language — every Indian language',
    'PDF reports with NMC clause citations',
    `${historyText(p.historyDays)} audit history`,
    `Top-up: ${p.topup.credits} credits for ${inr(p.topup.price)}`,
  ];
  if (p.id === 'premium') return [
    'Every format incl. website URLs & YouTube links',
    `Video & audio audits up to ${p.maxMediaMinutes} min, with full transcript`,
    'Full corrected version, ready to paste',
    'PDF reports with NMC clause citations',
    `${historyText(p.historyDays)} audit history`,
    'Unused credits roll over one month',
    `Top-up: ${p.topup.credits} credits for ${inr(p.topup.price)}`,
  ];
  return [
    `Volume credits from ${p.minCredits} per month`,
    `Longer video & audio — up to ${p.maxMediaMinutes} min`,
    'Everything in Premium',
    'Unlimited audit history',
    'Dedicated support for your team',
    'GST invoice & bank-transfer payment',
  ];
};

const RIBBON = { starter: 'MOST POPULAR', premium: 'BEST VALUE', enterprise: 'ENTERPRISE & INSTITUTIONS' };
const FOOT = { starter: '30-day prepaid · no auto-renewal', premium: '30-day prepaid · no auto-renewal', enterprise: 'Custom contracts & volume pricing' };

const perCredit = (p) => Math.round(p.price / p.credits);

export default function PlanCards({ plans, current, busy, onChoose, ctaFor }) {
  const free = plans.find((p) => p.id === 'free');
  const paid = plans.filter((p) => p.id !== 'free');
  const freeCta = free && ctaFor(free, current === 'free');

  return (
    <div className="pc">
      {free && (
        <div className="pc-free">
          <span className="pc-free__icon"><SparkIcon width={20} height={20} /></span>
          <div className="pc-free__title">
            <strong>Try it free — ₹0</strong>
            <small>{free.credits} audits included (2 text + 1 image)</small>
          </div>
          <ul className="pc-free__chips">
            <li><CheckCircleIcon width={14} height={14} /> Line-by-line fixes for top {free.fixPreviewLines} issues</li>
            <li><CheckCircleIcon width={14} height={14} /> Report in your language</li>
            <li><CheckCircleIcon width={14} height={14} /> {free.historyDays}-day history</li>
          </ul>
          <div className="pc-free__cta">
            <button type="button" disabled={freeCta.disabled} onClick={() => onChoose(free)}>
              {freeCta.label} {!freeCta.disabled && <ArrowRightIcon width={15} height={15} />}
            </button>
            <small>No credit card needed · instant access</small>
          </div>
        </div>
      )}

      <div className="pc-grid">
        {paid.map((p) => {
          const cta = ctaFor(p, current === p.id);
          const dark = p.id === 'enterprise';
          return (
            <article key={p.id} className={`pc-card ${dark ? 'pc-card--dark' : ''} ${current === p.id ? 'pc-card--current' : ''}`}>
              <span className="pc-card__ribbon">{RIBBON[p.id]}</span>
              <h3>{p.name}</h3>
              <p className="pc-card__tag">{p.tagline}</p>
              <div className="pc-card__price">
                {dark ? (
                  <>
                    <b className="pc-card__custom">Custom</b>
                    <small>{inr(p.pricePerCredit)} per credit + GST · volume pricing for your team</small>
                  </>
                ) : (
                  <>
                    <p><b>{inr(p.price)}</b><span>/month</span></p>
                    <small>{p.credits} credits every month · about {inr(perCredit(p))} per credit</small>
                  </>
                )}
              </div>
              <ul>
                {bullets(p).map((t) => <li key={t}><CheckCircleIcon width={17} height={17} /> {t}</li>)}
              </ul>
              <button type="button" className="pc-card__cta" disabled={cta.disabled || busy === p.id} onClick={() => onChoose(p)}>
                {busy === p.id ? 'Opening…' : cta.label} {!cta.disabled && busy !== p.id && <ArrowRightIcon width={15} height={15} />}
              </button>
              <small className="pc-card__foot">{FOOT[p.id]}</small>
            </article>
          );
        })}
      </div>
    </div>
  );
}
