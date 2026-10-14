import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { BannerArt, EmptyArt } from '../components/Graphics.jsx';
import { useAuth } from '../App.jsx';
import { Avatar } from '../components/Layout.jsx';
import { LogoutIcon } from '../components/Icons.jsx';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState(null);

  useEffect(() => {
    api.rulePack().then((res) => setRules(res?.data?.count ?? null)).catch(() => setRules(null));
  }, []);

  return (
    <div className="page">
      <header className="page-head banner">
        <span className="badge-live"><i /> SETTINGS</span>
        <h1>Account &amp; <b className="grad">workspace</b></h1>
        <BannerArt />
      </header>

      <div className="settings-grid">
        <section className="panel">
          <h3 className="kicker">PROFILE</h3>
          <div className="profile">
            <Avatar user={user} size="xl" />
            <div>
              <strong>{user?.name || 'Account'}</strong>
              <span className="muted">{user?.email}</span>
            </div>
          </div>
          <button type="button" className="ghost-btn ghost-btn--danger" onClick={() => { signOut(); navigate('/login'); }}>
            <LogoutIcon width={18} height={18} /> Sign out
          </button>
        </section>

        <section className="panel">
          <h3 className="kicker">WORKSPACE</h3>
          <dl className="facts">
            <dt>Geography</dt><dd>India</dd>
            <dt>Regulator</dt><dd>National Medical Commission</dd>
            <dt>Rules in pack</dt><dd>{rules ?? '—'}</dd>
            <dt>Sources</dt><dd>NMC Ethical Advertising 2026, IMC 2002, Telemedicine 2020, NMC advisories, Registration</dd>
          </dl>
          <p className="muted small">NextComply AI is a guidance tool and does not replace legal advice.</p>
        </section>
      </div>
    </div>
  );
}
