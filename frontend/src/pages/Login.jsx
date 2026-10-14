import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Brand } from '../components/Layout.jsx';

const highlights = [
  ['160', 'NMC & IMC rules checked on every audit'],
  ['5', 'official sources — Ethical Advertising 2026, IMC 2002, Telemedicine and more'],
  ['4', 'formats — text, website URL, image/PDF and video/audio'],
];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.login(form.email.trim(), form.password)
        : await api.signup(form.name.trim(), form.email.trim(), form.password);
      signIn(res.token, res.user);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth__story">
        <Brand light />
        <div className="auth__pitch">
          <p className="eyebrow eyebrow--light">For doctors, hospitals & healthcare marketers</p>
          <h1>Publish health ads that <em>pass</em> the National Medical Commission.</h1>
          <p className="auth__lede">
            Paste a post, drop a link or upload a creative. NextComply checks it against the NMC Ethical
            Advertising Guidelines and the IMC Code of Ethics, flags every risky line and rewrites it for you.
          </p>
        </div>
        <ul className="auth__stats">
          {highlights.map(([value, label]) => (
            <li key={value}><strong>{value}</strong><span>{label}</span></li>
          ))}
        </ul>
      </section>

      <section className="auth__panel">
        <form className="auth__form" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">{mode === 'login' ? 'Sign in to run NMC compliance audits.' : 'Free to start. Takes 30 seconds.'}</p>

          {mode === 'signup' && (
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={update('name')} required autoComplete="name" placeholder="Dr. Ananya Rao" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={update('email')} required autoComplete="email" placeholder="you@clinic.in" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={update('password')} required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" />
          </label>

          {error && <p className="alert alert--error" role="alert">{error}</p>}

          <button className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="auth__switch">
            {mode === 'login' ? 'New to NextComply?' : 'Already have an account?'}{' '}
            <button type="button" className="link-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
