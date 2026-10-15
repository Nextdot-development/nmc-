import { useState } from 'react';
import { api } from '../api.js';
import { CheckCircleIcon, SparkIcon } from './Icons.jsx';

export default function EnterpriseForm({ user, title = 'Talk to us about Enterprise' }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', organisation: '', monthlyAudits: '500–1,000', message: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState('busy');
    setError('');
    try {
      await api.enterpriseLead(form);
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div className="enterprise-done">
        <CheckCircleIcon width={30} height={30} />
        <strong>Thank you — we'll get back to you within one working day.</strong>
      </div>
    );
  }

  return (
    <form className="enterprise-form" onSubmit={submit}>
      <h3>{title}</h3>
      <div className="enterprise-form__grid">
        <label className="field"><span>Name</span><input value={form.name} onChange={update('name')} required autoComplete="name" /></label>
        <label className="field"><span>Work email</span><input type="email" value={form.email} onChange={update('email')} required autoComplete="email" /></label>
        <label className="field"><span>Phone</span><input value={form.phone} onChange={update('phone')} autoComplete="tel" placeholder="+91" /></label>
        <label className="field"><span>Organisation</span><input value={form.organisation} onChange={update('organisation')} placeholder="Hospital, pharma or agency" /></label>
        <label className="field"><span>Audits per month</span>
          <select value={form.monthlyAudits} onChange={update('monthlyAudits')}>
            {['500–1,000', '1,000–5,000', '5,000+', 'Not sure yet'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="field enterprise-form__wide"><span>What do you need?</span>
          <textarea rows={3} value={form.message} onChange={update('message')} placeholder="Team size, formats, API, invoicing…" />
        </label>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <button className="run-btn" disabled={state === 'busy'}><SparkIcon width={18} height={18} /> {state === 'busy' ? 'Sending…' : 'Send enquiry'}</button>
    </form>
  );
}
