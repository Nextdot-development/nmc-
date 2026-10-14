import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { BoltIcon, ChartIcon, ShieldCheckIcon, SparkIcon } from '../components/Icons.jsx';
import { IndiaGate, ShieldLogo, TricolorWave } from '../components/Graphics.jsx';

const highlights = [
  [ShieldCheckIcon, '160 NMC & IMC rules', 'checked on every audit'],
  [BoltIcon, 'Results in seconds', 'with clause-level citations'],
  [ChartIcon, 'Compliant rewrites', 'for every flagged line'],
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
        <div className="auth__brand"><ShieldLogo /> <span>NextComply <b className="lime">AI</b></span></div>
        <TricolorWave className="auth__wave" />
        <IndiaGate className="auth__gate" />
        <div>
          <span className="badge-live"><i /> NMC EDITION</span>
          <h1>
            <span>COMPLIANCE,</span>
            <span><b className="lime">WITHOUT</b></span>
            <span><b className="grad">THE COMPLEXITY</b></span>
          </h1>
          <p>Audit doctor, clinic, hospital and pharma advertising against National Medical Commission rules — with clear explanations and ready-to-use compliant rewrites.</p>
        </div>
        <ul className="auth__stats">
          {highlights.map(([Icon, title, sub]) => (
            <li key={title} className="panel"><span className="recent__icon"><Icon width={22} height={22} /></span><span><strong>{title}</strong><small>{sub}</small></span></li>
          ))}
        </ul>
      </section>

      <section className="auth__panel">
        <form className="panel panel--glow auth__form" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">{mode === 'login' ? 'Sign in to your AI audit workspace.' : 'Start auditing in under a minute.'}</p>

          {mode === 'signup' && (
            <label className="field"><span>Full name</span>
              <input value={form.name} onChange={update('name')} required autoComplete="name" placeholder="Dr. Ananya Rao" />
            </label>
          )}
          <label className="field"><span>Email</span>
            <input type="email" value={form.email} onChange={update('email')} required autoComplete="email" placeholder="you@clinic.in" />
          </label>
          <label className="field"><span>Password</span>
            <input type="password" value={form.password} onChange={update('password')} required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" />
          </label>

          {error && <p className="alert" role="alert">{error}</p>}

          <button className="run-btn" disabled={busy}>
            <SparkIcon width={20} height={20} /> {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
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
