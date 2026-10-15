import { useEffect, useRef, useState } from 'react';
import { ShieldLogo, SidebarArt } from './Graphics.jsx';
import { COUNTRY } from '../country.js';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import {
  BellIcon, LayersIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, CogIcon,
  HomeIcon, LogoutIcon, MenuIcon, SearchIcon, WalletIcon,
} from './Icons.jsx';

const NAV = [
  { to: '/app', label: 'Auditor', Icon: HomeIcon, end: true },
  { to: '/rules', label: 'Rule Packs', Icon: LayersIcon },
  { to: '/history', label: 'Audit History', Icon: ClockIcon },
  { to: '/billing', label: 'Plans & Credits', Icon: WalletIcon },
  { to: '/settings', label: 'Settings', Icon: CogIcon },
];

export const IndiaFlag = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="flag">
    <clipPath id="flagclip"><circle cx="11" cy="11" r="10" /></clipPath>
    <g clipPath="url(#flagclip)">
      <rect width="22" height="7.4" fill="#ff9933" />
      <rect y="7.3" width="22" height="7.4" fill="#ffffff" />
      <rect y="14.6" width="22" height="7.4" fill="#138808" />
      <circle cx="11" cy="11" r="2.2" fill="none" stroke="#000080" strokeWidth="0.8" />
    </g>
  </svg>
);

export const Avatar = ({ user, size = 'md' }) => {
  const initial = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();
  return <span className={`avatar avatar--${size}`} title={user?.email}>{initial}</span>;
};

// Real product updates; the dot shows until the user has seen the latest one
const UPDATES = [
  { id: '2026-10-14-pack', title: 'NMC rule pack updated', body: '160 rules from the NMC Ethical Advertising Guidelines 2026, IMC Code of Ethics 2002, Telemedicine Guidelines and NMC advisories.' },
];
const SEEN_KEY = 'nc_nmc_seen_update';

const Notifications = () => {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
  });
  const ref = useRef(null);
  const unread = seen !== UPDATES[0].id;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    setOpen(!open);
    if (unread) {
      setSeen(UPDATES[0].id);
      try { localStorage.setItem(SEEN_KEY, UPDATES[0].id); } catch { /* private mode */ }
    }
  };

  return (
    <div className="notify" ref={ref}>
      <button type="button" className="square-btn square-btn--ghost" aria-label="Notifications" aria-expanded={open} onClick={toggle}>
        <BellIcon width={22} height={22} />
        {unread && <i className="notify__dot" />}
      </button>
      {open && (
        <div className="notify__menu panel" role="dialog" aria-label="Notifications">
          <strong>What's new</strong>
          {UPDATES.map((u) => (
            <NavLink key={u.id} to="/rules" className="notify__item" onClick={() => setOpen(false)}>
              <span>{u.title}</span><small>{u.body}</small>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Layout() {
  const { user, account, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => setDrawer(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/rules?q=${encodeURIComponent(q)}` : '/rules');
  };

  return (
    <div className={`app ${collapsed ? 'app--collapsed' : ''} ${drawer ? 'app--drawer' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__top">
          <NavLink to="/app" className="sidebar__logo" aria-label="NextComply AI home"><ShieldLogo /><span>NextComply <b>AI</b></span></NavLink>
          <button type="button" className="square-btn sidebar__collapse" onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        <nav className="sidenav" aria-label="Main">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="sidenav__link" title={label}>
              <Icon width={22} height={22} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__spacer" />

        {account && (
          <NavLink to="/billing" className="credits-card" title="Plans & Credits">
            <span className="credits-card__plan">{account.unlimited ? account.planName : `${account.planName} plan`}</span>
            {account.unlimited ? <strong>No credits charged</strong> : <strong><span>{account.credits}</span> credits left</strong>}
            {!account.unlimited && <span className="credits-card__bar"><i style={{ width: `${Math.min(100, (account.credits / Math.max(account.credits, account.plan === 'premium' ? 50 : account.plan === 'starter' ? 22 : 3)) * 100)}%` }} /></span>}
            {account.plan !== 'enterprise' && !account.unlimited && <span className="credits-card__cta">{account.plan === 'premium' ? 'Buy top-up' : 'Upgrade'} →</span>}
          </NavLink>
        )}

        <div className="promo">
          <SidebarArt />
          <strong>Built for a Safer,<br />Healthier <em>{COUNTRY.name}</em></strong>
        </div>

        <div className="sidebar__user">
          {user ? (
            <>
              <NavLink to="/settings" className="usercard">
                <Avatar user={user} size="lg" />
                <span className="usercard__text">
                  <strong>{user.name || 'Account'}</strong>
                  <span>{user.email}</span>
                </span>
                <ChevronRightIcon className="usercard__chev" />
              </NavLink>
              <button type="button" className="signout" onClick={() => { signOut(); navigate('/login'); }}>
                <LogoutIcon width={22} height={22} /><span>Sign Out</span>
              </button>
            </>
          ) : (
            <NavLink to="/login" className="signout"><LogoutIcon width={22} height={22} /><span>Sign In</span></NavLink>
          )}
        </div>
      </aside>
      <button type="button" className="scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />

      <div className="workspace">
        <header className="topbar">
          <button type="button" className="square-btn topbar__menu" onClick={() => setDrawer(true)} aria-label="Open menu"><MenuIcon /></button>
          <NavLink to="/app" className="topbar__brand" aria-label="NextComply AI home"><ShieldLogo width="26" height="29" /><span>NextComply AI</span></NavLink>
          <form className="topsearch" onSubmit={search} role="search">
            <SearchIcon width={22} height={22} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rules..." aria-label="Search rule packs and regulations" />
            <span className="kbd" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span>
          </form>
          <div className="topbar__right">
            <label className="country" title="Geography">
              <IndiaFlag />
              <select defaultValue="India" aria-label="Geography">
                <option value="India">India</option>
              </select>
              <ChevronDownIcon width={18} height={18} />
            </label>
            {account && (
              <NavLink to="/billing" className="credit-pill" title="Credits left">
                <WalletIcon width={18} height={18} /> {account.unlimited ? <b>Unlimited</b> : <><b>{account.credits}</b> <span>credits</span></>}
              </NavLink>
            )}
            <Notifications />
            {user && <NavLink to="/settings" aria-label="Account"><Avatar user={user} size="xl" /></NavLink>}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {/* Phone: bottom tab bar */}
      <nav className="tabbar" aria-label="Main">
        {NAV.filter((n) => n.to !== '/settings').map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tabbar__link">
            <Icon width={22} height={22} /><span>{{ '/app': 'Audit', '/rules': 'Rules', '/history': 'History', '/billing': 'Plans' }[to] || label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
