import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import {
  ArrowUpRightIcon, BellIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, CogIcon,
  DatabaseIcon, HomeIcon, LogoMark, LogoutIcon, MenuIcon, SearchIcon,
} from './Icons.jsx';

const NAV = [
  { to: '/', label: 'Auditor', Icon: HomeIcon, end: true },
  { to: '/rules', label: 'Rule Packs', Icon: DatabaseIcon },
  { to: '/history', label: 'Audit History', Icon: ClockIcon },
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

export default function Layout() {
  const { user, signOut } = useAuth();
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
          <NavLink to="/" className="sidebar__logo" aria-label="NextComply AI home"><LogoMark /></NavLink>
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

        <div className="sidebar__glow" aria-hidden="true" />

        <NavLink to="/rules" className="promo">
          <strong>Stay compliant<br />grow with<br />confidence.</strong>
          <span>AI-powered NMC audits for healthcare advertising.</span>
          <span className="promo__arrow"><ArrowUpRightIcon width={18} height={18} /></span>
        </NavLink>

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
          <form className="topsearch" onSubmit={search} role="search">
            <SearchIcon width={22} height={22} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search audits, rule packs, regulations..." aria-label="Search rule packs and regulations" />
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
            <button type="button" className="square-btn square-btn--ghost" aria-label="Notifications" title="No new notifications"><BellIcon width={22} height={22} /></button>
            {user && <NavLink to="/settings" aria-label="Account"><Avatar user={user} size="xl" /></NavLink>}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
