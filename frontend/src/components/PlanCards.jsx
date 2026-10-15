import { FORMAT_NAMES, inr } from '../billing.js';
import { CheckCircleIcon, StarIcon, XCircleIcon } from './Icons.jsx';

// Marketing examples of what a plan's credits buy
const EXAMPLES = {
  free: '2 text + 1 image audit',
  starter: 'e.g. 8 text + 10 image + 2 videos',
  premium: 'e.g. 18 text + 20 image + 4 videos + 2 websites',
  enterprise: 'Volume pricing for teams',
};

const formatList = (formats) => {
  const names = formats.map((f) => FORMAT_NAMES[f]);
  return names.length > 4 ? 'All formats incl. websites & YouTube' : names.join(', ');
};

export const planFeatures = (p) => [
  [true, formatList(p.formats)],
  [p.maxMediaMinutes > 0, p.maxMediaMinutes ? `Video & audio up to ${p.maxMediaMinutes} min` : 'Video & audio'],
  [true, p.fixPreviewLines ? `Line-by-line fixes for top ${p.fixPreviewLines} issues` : 'Line-by-line fix for every issue'],
  [p.compliantVersion, 'Full corrected version, ready to paste'],
  [true, 'Report in the language of your ad'],
  [p.pdf, 'PDF report download'],
  [true, p.historyDays ? `Audit history: ${p.historyDays >= 365 ? '12 months' : p.historyDays >= 180 ? '6 months' : `${p.historyDays} days`}` : 'Unlimited audit history'],
  [true, p.seats ? `${p.seats} user${p.seats > 1 ? 's' : ''}` : 'Users as you need'],
  [p.rollover, 'Unused credits roll over'],
  [Boolean(p.topup) || p.id === 'enterprise', p.topup ? `Top-up: ${p.topup.credits} credits for ${inr(p.topup.price)}` : p.id === 'enterprise' ? 'API access & dedicated support' : 'Top-ups'],
];

const priceBlock = (p) => {
  if (p.price === null) return <><b>{inr(p.pricePerCredit)}</b><span>/ credit + GST</span></>;
  if (p.price === 0) return <><b>₹0</b><span>forever</span></>;
  return <><b>{inr(p.price)}</b><span>/ month</span></>;
};

const creditLine = (p) => {
  if (p.credits === null) return `From ${p.minCredits} credits / month`;
  return p.period === 'once' ? `${p.credits} credits, one time` : `${p.credits} credits every month`;
};

export default function PlanCards({ plans, current, busy, onChoose, ctaFor }) {
  return (
    <div className="plans">
      {plans.map((p, i) => {
        const isCurrent = current === p.id;
        const cta = ctaFor(p, isCurrent);
        return (
          <article key={p.id} className={`plan ${p.popular ? 'plan--popular' : ''} ${isCurrent ? 'plan--current' : ''}`} style={{ '--i': i }}>
            {p.popular && <span className="plan__ribbon"><StarIcon width={13} height={13} /> Most popular</span>}
            <header>
              <h3>{p.name}</h3>
              <p className="plan__tag">{p.tagline}</p>
              <p className="plan__price">{priceBlock(p)}</p>
              <p className="plan__credits">{creditLine(p)}</p>
              <p className="plan__example">{EXAMPLES[p.id]}</p>
            </header>
            <button type="button" className={`plan__cta ${p.popular ? 'run-btn' : 'ghost-btn'}`} disabled={cta.disabled || busy === p.id}
              onClick={() => onChoose(p)}>
              {busy === p.id ? 'Opening…' : cta.label}
            </button>
            <ul className="plan__features">
              {planFeatures(p).map(([on, text]) => (
                <li key={text} className={on ? '' : 'off'}>
                  {on ? <CheckCircleIcon width={17} height={17} /> : <XCircleIcon width={17} height={17} />} {text}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
