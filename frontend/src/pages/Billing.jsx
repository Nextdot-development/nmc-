import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { buy, inr } from '../billing.js';
import { BannerArt } from '../components/Graphics.jsx';
import EnterpriseForm from '../components/EnterpriseForm.jsx';
import PlanCards from '../components/PlanCards.jsx';
import { WalletIcon } from '../components/Icons.jsx';

const LEDGER_LABEL = { signup: 'Welcome credits', audit: 'Audit', refund: 'Refund', plan: 'Plan', topup: 'Top-up', grant: 'Added by NextComply', expire: 'Plan ended' };
const RANK = { free: 0, starter: 1, premium: 2, enterprise: 3 };

const COSTS = [
  ['Text, PDF / Word or image', '1 credit'],
  ['Website page', '2 credits'],
  ['Video or audio file', '2 credits per 5 min'],
  ['YouTube video (about 10 min)', '4 credits'],
  ['Same content audited again', 'Free'],
];

export default function Billing() {
  const { user, account, refreshAccount } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const enterpriseRef = useRef(null);

  const loadLedger = () => api.ledger().then(setLedger).catch(() => {});

  useEffect(() => {
    api.plans().then(setCatalog).catch((err) => setMessage({ tone: 'bad', text: err.message }));
    refreshAccount();
    loadLedger();
  }, []);

  const payments = catalog?.payments;

  const purchase = async (kind, planId) => {
    setMessage(null);
    setBusy(kind === 'topup' ? 'topup' : planId);
    try {
      const next = await buy({ kind, planId, user });
      await refreshAccount();
      loadLedger();
      setMessage({ tone: 'ok', text: kind === 'topup' ? 'Top-up added to your credits.' : `You're on the ${next?.planName || 'new'} plan now. Credits added.` });
    } catch (err) {
      if (!err.cancelled) setMessage({ tone: 'bad', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const onChoose = (p) => {
    if (p.id === 'enterprise') {
      enterpriseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    purchase('plan', p.id);
  };

  const ctaFor = (p, isCurrent) => {
    if (p.id === 'enterprise') return { label: isCurrent ? 'Your plan' : 'Contact sales', disabled: isCurrent };
    if (p.id === 'free') return { label: isCurrent ? 'Your plan' : 'Included', disabled: true };
    if (!payments) return { label: 'Coming soon', disabled: true };
    if (isCurrent) return { label: 'Renew for 30 days', disabled: false };
    if (account && RANK[account.plan] > RANK[p.id]) return { label: `Switch to ${p.name}`, disabled: false };
    return { label: `Upgrade to ${p.name}`, disabled: false };
  };

  const topup = account?.features?.topup;
  const renews = account?.periodEnd ? new Date(account.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="page billing">
      <header className="page-head banner">
        <span className="badge-live"><i /> PLANS &amp; CREDITS</span>
        <h1>Your plan and credits</h1>
        <p>Every audit uses credits. Pick the plan that fits how much you publish.</p>
        <BannerArt />
      </header>

      {message && <p className={`notice notice--${message.tone}`} role="status">{message.text}</p>}
      {catalog && !payments && (
        <p className="notice notice--warn">Online payment is being switched on. To upgrade today, send us a message below and we'll add the plan to your account.</p>
      )}

      {account && (
        <section className="panel balance">
          <div className="balance__main">
            <span className="balance__icon"><WalletIcon width={26} height={26} /></span>
            <div>
              <span className="kicker">{account.unlimited ? 'TESTING ACCOUNT' : `${account.planName.toUpperCase()} PLAN`}</span>
              {account.unlimited
                ? <strong className="balance__credits"><b>Unlimited</b></strong>
                : <strong className="balance__credits"><b>{account.credits}</b> credits left</strong>}
              <small className="muted">
                {account.extraCredits > 0 && <>{account.planCredits} plan + {account.extraCredits} top-up · </>}
                {renews ? `Plan valid till ${renews}` : account.plan === 'free' ? 'Free credits never expire' : ''}
              </small>
            </div>
          </div>
          {topup && (
            <button type="button" className="ghost-btn ghost-btn--primary" disabled={!payments || busy === 'topup'} onClick={() => purchase('topup')}>
              {busy === 'topup' ? 'Opening…' : `Buy ${topup.credits} credits · ${inr(topup.price)}`}
            </button>
          )}
        </section>
      )}

      {catalog ? (
        <PlanCards plans={catalog.plans} current={account?.plan} busy={busy} onChoose={onChoose} ctaFor={ctaFor} />
      ) : (
        <div className="panel skeleton">Loading plans…</div>
      )}

      <div className="billing__grid">
        <section className="panel billing__costs">
          <h3 className="kicker">WHAT A CREDIT BUYS</h3>
          <table className="costs">
            <tbody>{COSTS.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
          </table>
          <p className="muted small">Prices include GST. If an audit cannot finish, its credits are returned automatically.</p>
        </section>

        <section className="panel billing__ledger">
          <h3 className="kicker">CREDIT HISTORY</h3>
          {ledger.length === 0 ? <p className="muted small">No credit activity yet.</p> : (
            <ul className="ledger">
              {ledger.map((row) => (
                <li key={row._id}>
                  <span>
                    <strong>{row.note || LEDGER_LABEL[row.type] || row.type}</strong>
                    <small>{new Date(row.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                  </span>
                  <b className={row.credits >= 0 ? 'plus' : 'minus'}>{row.credits >= 0 ? '+' : ''}{row.credits}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel billing__enterprise" ref={enterpriseRef}>
        <EnterpriseForm user={user} title={payments ? 'Enterprise or custom plan' : 'Upgrade or Enterprise enquiry'} />
      </section>
    </div>
  );
}
