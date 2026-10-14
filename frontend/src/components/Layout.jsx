import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { BookIcon, ClockIcon, LogoutIcon, ShieldIcon } from './Icons.jsx';

export const Brand = ({ light = false }) => (
  <span className={`brand ${light ? 'brand--light' : ''}`}>
    <span className="brand__mark" aria-hidden="true">N</span>
    <span className="brand__name">NextComply <em>AI</em></span>
    <span className="brand__tag">NMC</span>
  </span>
);

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/" className="topbar__brand" aria-label="NextComply AI home"><Brand /></NavLink>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end className="nav__link"><ShieldIcon /><span>Audit</span></NavLink>
            <NavLink to="/rules" className="nav__link"><BookIcon /><span>Rule Pack</span></NavLink>
            {user && <NavLink to="/history" className="nav__link"><ClockIcon /><span>History</span></NavLink>}
          </nav>
          <div className="topbar__user">
            {user ? (
              <>
                <span className="avatar" title={user.email}>{initial}</span>
                <button type="button" className="icon-btn" onClick={() => { signOut(); navigate('/login'); }} aria-label="Sign out" title="Sign out">
                  <LogoutIcon />
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn btn--small">Sign in</NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        NextComply AI · NMC Edition — guidance tool, not legal advice. Rules sourced from nmc.org.in.
      </footer>
    </div>
  );
}
